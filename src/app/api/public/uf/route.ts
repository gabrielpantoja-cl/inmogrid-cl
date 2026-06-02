import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1h

type UfPoint = { fecha: string; valor: number };
type UfPayload = {
  valor: number;
  fecha: string;
  source: 'mindicador.cl' | 'valoruf.cl';
  serie: UfPoint[]; // últimos N días para sparkline (vacío si la fuente fallback no entrega serie)
  cambio?: { absoluto: number; porcentaje: number; previa: UfPoint }; // vs día anterior
};

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json,text/html', ...(init?.headers || {}) },
    });
  } finally {
    clearTimeout(id);
  }
}

async function fetchFromMindicador(): Promise<UfPayload> {
  // El endpoint principal devuelve la serie del mes en curso (~22 puntos hábiles).
  const response = await fetchWithTimeout('https://mindicador.cl/api/uf', 5000);
  if (!response.ok) throw new Error(`mindicador.cl status ${response.status}`);
  const data = (await response.json()) as { serie?: UfPoint[] };
  if (!data?.serie?.length) throw new Error('mindicador.cl: serie vacía');

  // mindicador devuelve la serie en orden DESC (más reciente primero).
  const sortedDesc = [...data.serie].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
  const ultimo = sortedDesc[0];
  const previo = sortedDesc[1];

  // Para el sparkline necesitamos orden ASC (izq→der = pasado→presente).
  const serieAsc = [...sortedDesc].slice(0, 30).reverse();

  const payload: UfPayload = {
    valor: ultimo.valor,
    fecha: ultimo.fecha,
    source: 'mindicador.cl',
    serie: serieAsc,
  };

  if (previo) {
    const absoluto = ultimo.valor - previo.valor;
    payload.cambio = {
      absoluto,
      porcentaje: (absoluto / previo.valor) * 100,
      previa: previo,
    };
  }

  return payload;
}

async function fetchFromValorUf(): Promise<UfPayload> {
  const response = await fetchWithTimeout('https://valoruf.cl/', 5000);
  if (!response.ok) throw new Error(`valoruf.cl status ${response.status}`);
  const html = await response.text();
  const match = html.match(/<span class="vpr">\$\s*([\d.,]+)<\/span>/);
  if (!match) throw new Error('valoruf.cl: no se encontró el valor');

  // Formato chileno: "39.841,72" → 39841.72
  const valorStr = match[1].replace(/\./g, '').replace(',', '.');
  const valor = parseFloat(valorStr);
  if (!Number.isFinite(valor) || valor < 1000) {
    throw new Error(`valoruf.cl: valor inválido ${match[1]}`);
  }

  return {
    valor,
    fecha: new Date().toISOString(),
    source: 'valoruf.cl',
    serie: [], // fallback no expone serie histórica
  };
}

const getUfCached = unstable_cache(
  async (): Promise<UfPayload> => {
    const errores: string[] = [];
    for (const fn of [fetchFromMindicador, fetchFromValorUf]) {
      try {
        return await fn();
      } catch (err) {
        errores.push(err instanceof Error ? err.message : 'error desconocido');
      }
    }
    throw new Error(`Todas las fuentes fallaron: ${errores.join(' | ')}`);
  },
  ['uf-payload-v1'],
  { revalidate: 3600, tags: ['uf'] }
);

export async function GET() {
  try {
    const data = await getUfCached();
    return NextResponse.json(data, {
      headers: {
        // Permite cache CDN edge ~1h, stale-while-revalidate 24h
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'No se pudo obtener el valor de la UF', details: message },
      { status: 503 }
    );
  }
}
