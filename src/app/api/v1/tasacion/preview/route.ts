import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';
import { applyRateLimit } from '@/shared/lib/ratelimit';
import { queryComparables } from '@/shared/lib/queries/referenciales';
import { calcularTasacion } from '@/features/tasacion/lib/calculator';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Geocodifica una dirección en Chile usando Nominatim (OpenStreetMap).
 * Retorna { lat, lng } o null si no hay resultados.
 */
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

const PreviewSchema = z.object({
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

    // Geocodificar: dirección específica si se proporcionó, sino comuna como fallback.
    let geocodeLat: number | undefined;
    let geocodeLng: number | undefined;
    let geocodeOk = false;
    let geocodeLabel: string | undefined;

    const geoQuery = input.direccion
      ? `${input.direccion}, ${input.comuna}, Chile`
      : `${input.comuna}, Chile`;

    const coords = await geocodeChile(geoQuery);
    if (coords) {
      geocodeLat = coords.lat;
      geocodeLng = coords.lng;
      geocodeOk = true;
      geocodeLabel = input.direccion
        ? input.direccion
        : `Centro referencial de ${input.comuna}`;
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
          success: false,
          error: 'Sin comparables suficientes',
          details: {
            comparablesEncontrados: comparables.length,
            sugerencia: 'La zona o destino seleccionado no tiene datos de referencia suficientes en los últimos 24 meses. Intenta con una comuna cercana o un destino más general.',
          },
        },
        { status: 422, headers: { ...corsHeaders(), ...rlHeaders } }
      );
    }

    // Versión sanitizada de comparables para el preview anónimo:
    // incluimos fojas, numero, anio, fecha, superficies, monto — sin PII (predio, rol).
    const comparablesSanitizados = resultado.comparables.map((c) => ({
      fechaescritura: c.fechaescritura,
      superficieTerreno: c.superficieTerreno,
      superficieConstruida: c.superficieConstruida,
      montoUf: c.montoUf,
      ufM2: c.ufM2,
      fojas: c.fojas,
      numero: c.numero,
      anio: c.anio,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { comparables: _comps, ...resumenSinComps } = resultado;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...resumenSinComps,
          comparablesUsados: resultado.comparablesUsados,
          comparables: comparablesSanitizados,
          ...(geocodeOk && { lat: geocodeLat, lng: geocodeLng, geocodeLabel }),
        },
        meta: {
          nota: 'Estimación referencial basada en transacciones reales del Conservador de Bienes Raíces. No reemplaza un peritaje profesional.',
          ...(geocodeOk && { geocode: { lat: geocodeLat, lng: geocodeLng, radioKm: 3, label: geocodeLabel } }),
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
