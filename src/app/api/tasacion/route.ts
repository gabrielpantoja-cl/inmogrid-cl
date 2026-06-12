import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/shared/lib/supabase/auth';
import prisma from '@/shared/lib/prisma';
import { queryComparables } from '@/shared/lib/queries/referenciales';
import { calcularTasacion } from '@/features/tasacion/lib/calculator';

async function geocodeChile(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cl&limit=1&accept-language=es`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'inmogrid.cl/1.0 (tasacion)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

const AppraisalInputSchema = z.object({
  comuna: z.string().min(2).max(100),
  destino: z.enum(['H', 'W', 'C', 'O', 'Z', 'L', 'I', 'A', 'B', 'F']),
  direccion: z.string().max(200).optional(),
  superficieTerreno: z.number().positive().max(1_000_000).optional(),
  superficieConstruida: z.number().positive().max(100_000).optional(),
  anoConstruccion: z.number().min(1900).max(new Date().getFullYear()).optional(),
  estadoConservacion: z.enum([
    'STATE_1', 'STATE_1_5', 'STATE_2', 'STATE_2_5', 'STATE_3',
    'STATE_3_5', 'STATE_4', 'STATE_4_5', 'STATE_5',
  ]).optional(),
  calidad: z.enum(['ECONOMIC', 'MEDIUM', 'GOOD', 'VERY_GOOD', 'EXCELLENT']).optional(),
  disposicion: z.enum(['FRONT', 'CORNER', 'LATERAL', 'INTERNAL']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = 10;

    const [items, total] = await Promise.all([
      prisma.appraisal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.appraisal.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ data: items, total, page, limit });
  } catch (err) {
    console.error('[api/tasacion GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = AppraisalInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const superficieRef = input.superficieTerreno ?? input.superficieConstruida;
    if (!superficieRef) {
      return NextResponse.json(
        { error: 'Debe indicar al menos una superficie (terreno o construida)' },
        { status: 400 }
      );
    }

    const anioDesde = new Date().getFullYear() - 2;

    // Geocodificar: dirección específica si se proporcionó, sino comuna como fallback.
    let geocodeLat: number | undefined;
    let geocodeLng: number | undefined;
    let geocodeOk = false;

    const geoQuery = input.direccion
      ? `${input.direccion}, ${input.comuna}, Chile`
      : `${input.comuna}, Chile`;

    const coords = await geocodeChile(geoQuery);
    if (coords) {
      geocodeLat = coords.lat;
      geocodeLng = coords.lng;
      geocodeOk = true;
    }

    const comparables = await queryComparables({
      comuna: input.comuna,
      destino: input.destino,
      superficieRef,
      anioDesde,
      ...(geocodeOk && { lat: geocodeLat, lng: geocodeLng, radioKm: 3 }),
    });

    const resultado = calcularTasacion(input, comparables);

    if (!resultado) {
      return NextResponse.json(
        {
          error: 'Sin comparables suficientes',
          comparablesEncontrados: comparables.length,
        },
        { status: 422 }
      );
    }

    const appraisal = await prisma.appraisal.create({
      data: {
        userId: user.id,
        comuna: input.comuna,
        destino: input.destino,
        direccion: input.direccion,
        superficieTerreno: input.superficieTerreno,
        superficieConstruida: input.superficieConstruida,
        anoConstruccion: input.anoConstruccion,
        estadoConservacion: input.estadoConservacion,
        calidad: input.calidad,
        disposicion: input.disposicion,
        valorEstimadoUf: resultado.valorEstimadoUf,
        valorMinUf: resultado.valorMinUf,
        valorMaxUf: resultado.valorMaxUf,
        medianaMercadoUfM2: resultado.medianaMercadoUfM2,
        comparablesUsados: resultado.comparablesUsados,
        nivelConfianza: resultado.nivelConfianza,
        status: 'completed',
      },
    });

    return NextResponse.json({
      id: appraisal.id,
      resultado,
    }, { status: 201 });
  } catch (err) {
    console.error('[api/tasacion POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
