import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';
import { applyRateLimit } from '@/shared/lib/ratelimit';
import { queryComparables } from '@/shared/lib/queries/referenciales';
import { calcularTasacion } from '@/features/tasacion/lib/calculator';

export async function OPTIONS() {
  return handleOptions();
}

const PreviewSchema = z.object({
  comuna: z.string().min(2).max(100),
  destino: z.enum(['H', 'W', 'C', 'O', 'Z', 'L', 'I', 'A', 'B', 'F']),
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

export async function POST(request: NextRequest) {
  try {
    const rl = await applyRateLimit(request);
    if (rl?.response?.status === 429) return rl.response;
    const rlHeaders = rl?.headers ?? {};

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Body inválido' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const parsed = PreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos', details: parsed.error.issues },
        { status: 400, headers: corsHeaders() }
      );
    }

    const input = parsed.data;

    const superficieRef = input.superficieTerreno ?? input.superficieConstruida;
    if (!superficieRef) {
      return NextResponse.json(
        { success: false, error: 'Debe indicar al menos una superficie (terreno o construida)' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const anioActual = new Date().getFullYear();
    const anioDesde = anioActual - 2;

    const comparables = await queryComparables({
      comuna: input.comuna,
      destino: input.destino,
      superficieRef,
      anioDesde,
    });

    const resultado = calcularTasacion(input, comparables);

    if (!resultado) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sin comparables suficientes',
          details: {
            comparablesEncontrados: comparables.length,
            sugerencia: 'La zona o destino seleccionado no tiene datos de referencia suficientes en los últimos 24 meses. Intenta con una commune cercana o un destino más general.',
          },
        },
        { status: 422, headers: { ...corsHeaders(), ...rlHeaders } }
      );
    }

    // En el preview anónimo no enviamos los comparables individuales (solo el resumen)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { comparables: _comps, ...resumenSinComps } = resultado;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...resumenSinComps,
          comparablesUsados: resultado.comparablesUsados,
        },
        meta: {
          nota: 'Estimación referencial basada en transacciones reales del Conservador de Bienes Raíces. No reemplaza un peritaje profesional.',
        },
      },
      { status: 200, headers: { ...corsHeaders(), ...rlHeaders } }
    );
  } catch (err) {
    console.error('[api/v1/tasacion/preview]', err);
    return NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
