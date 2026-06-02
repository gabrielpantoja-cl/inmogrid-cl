import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';
import { ContributionInputSchema } from '@/shared/lib/schemas/contribution';
import { sanitizeInput } from '@/shared/lib/sanitize';
import { awardPoints } from '@/features/gamification/lib/points';
import { PointReason } from '@prisma/client';

const MAX_ITEMS_PER_REQUEST = 50;

type ItemError = {
  index: number;
  errors: { path: string; message: string }[];
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
    }

    // Validación general (forma del request)
    const shape = z.object({ items: z.array(z.unknown()) }).safeParse(body);
    if (!shape.success) {
      return NextResponse.json({ error: 'Formato inválido: se requiere { items: [...] }' }, { status: 400 });
    }

    if (shape.data.items.length === 0) {
      return NextResponse.json({ error: 'Lista vacía' }, { status: 400 });
    }

    if (shape.data.items.length > MAX_ITEMS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo ${MAX_ITEMS_PER_REQUEST} filas por solicitud` },
        { status: 400 }
      );
    }

    // Validación per-item: validamos cada una y agregamos errores con índice.
    // No usamos el schema de array completo para poder reportar errores por fila.
    const validated: ReturnType<typeof ContributionInputSchema.parse>[] = [];
    const itemErrors: ItemError[] = [];

    shape.data.items.forEach((item, index) => {
      const parsed = ContributionInputSchema.safeParse(item);
      if (parsed.success) {
        validated.push(parsed.data);
      } else {
        itemErrors.push({
          index,
          errors: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
    });

    if (itemErrors.length > 0) {
      return NextResponse.json(
        {
          error: `${itemErrors.length} fila(s) con errores de validación`,
          itemErrors,
        },
        { status: 400 }
      );
    }

    // Sanitización + transformación a estructura Prisma
    const dataForCreate = validated.map((d) => ({
      userId: user.id,
      sourceId: d.sourceId,
      contributionType: d.contributionType,
      lat: d.lat,
      lng: d.lng,
      fojas: d.fojas ? sanitizeInput(d.fojas) : null,
      numero: d.numero ?? null,
      anio: d.anio ?? null,
      cbr: d.cbr ? sanitizeInput(d.cbr) : null,
      predio: d.predio ? sanitizeInput(d.predio) : null,
      comuna: d.comuna ? sanitizeInput(d.comuna) : null,
      rol: d.rol ?? null,
      fechaescritura: d.fechaescritura ? new Date(d.fechaescritura) : null,
      superficieTerreno: d.superficieTerreno ?? null,
      superficieConstruida: d.superficieConstruida ?? null,
      destino: d.destino ?? null,
      montoUf: d.montoUf ?? null,
      monto: d.monto ? BigInt(d.monto) : null,
      observaciones: d.observaciones ? sanitizeInput(d.observaciones) : null,
    }));

    // Transacción: o todas o ninguna. createMany no devuelve los IDs creados,
    // así que iteramos para poder devolver IDs (útil para mis-aportes).
    const created = await prisma.$transaction(
      dataForCreate.map((data) =>
        prisma.contribution.create({
          data,
          select: { id: true, status: true, createdAt: true },
        })
      )
    );

    // Gamification: 5 puntos por reporte/correction. Para "new" no hay puntos
    // hasta aprobación admin (lógica existente en /contribute single).
    validated.forEach((d, i) => {
      if (d.contributionType === 'report' || d.contributionType === 'correction') {
        awardPoints(user.id, 5, PointReason.BUG_REPORT, created[i].id).catch((err) =>
          console.error('[Gamification] bulk contribute points error:', err)
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        count: created.length,
        items: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] referenciales/contribute/bulk error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: 'Error interno del servidor', details: message }, { status: 500 });
  }
}
