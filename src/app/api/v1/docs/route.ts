import { NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  return NextResponse.json(
    {
      api: {
        name: 'inmogrid.cl Public API',
        version: '1.0.0',
        description:
          'API pública de datos inmobiliarios de Chile. Provee acceso a transacciones de compraventa registradas en Conservadores de Bienes Raíces (CBR).',
        baseUrl: 'https://inmogrid.cl/api/v1',
      },
      endpoints: [
        {
          path: '/map-data',
          method: 'GET',
          description: 'Datos de transacciones inmobiliarias con coordenadas geográficas',
          parameters: [
            { name: 'comuna', type: 'string', required: false, description: 'Filtrar por comuna (case-insensitive)' },
            { name: 'anio', type: 'number', required: false, description: 'Filtrar por año de la transacción' },
            { name: 'limit', type: 'number', required: false, description: 'Límite de resultados (max 50000, default 20000)' },
          ],
          response: {
            success: 'boolean',
            data: 'MapPoint[]',
            metadata: '{ total, filters, timestamp, center, defaultZoom, attribution, apiVersion }',
          },
          example: 'GET /api/v1/map-data?comuna=valdivia&anio=2025&limit=100',
        },
        {
          path: '/map-data/comunas',
          method: 'GET',
          description: 'Lista de comunas disponibles con conteo de registros',
          parameters: [],
          response: {
            success: 'boolean',
            data: '{ comuna: string, count: number }[]',
            metadata: '{ total, distinct, timestamp, apiVersion }',
          },
          cache: 's-maxage=3600, stale-while-revalidate=86400',
        },
        {
          path: '/map-config',
          method: 'GET',
          description: 'Configuración del mapa, endpoints y esquema de datos',
          parameters: [],
          response: {
            success: 'boolean',
            config: '{ api, map, markers, filters, dataSchema, cors }',
          },
        },
        {
          path: '/health',
          method: 'GET',
          description: 'Estado de salud del sistema (Supabase + Neon)',
          parameters: [
            { name: 'stats', type: 'boolean', required: false, description: 'Incluir estadísticas de datos (total registros)' },
          ],
          response: {
            success: 'boolean',
            health: '{ status, timestamp, version, services, stats? }',
          },
          statuses: {
            healthy: 'Ambas bases de datos responden en < 5s',
            degraded: 'Ambas responden pero tiempo > 5s',
            unhealthy: 'Al menos una base de datos no responde (HTTP 503)',
          },
        },
        {
          path: '/docs',
          method: 'GET',
          description: 'Esta documentación',
        },
      ],
      authentication: {
        required: false,
        description: 'Todos los endpoints son públicos. No requieren autenticación.',
        apiKey: {
          header: 'X-API-Key',
          description: 'Opcional. Aumenta el rate limit de 60 a 600 req/min.',
        },
      },
      rateLimit: {
        anonymous: '60 requests/min (por IP)',
        apiKey: '600 requests/min (con header X-API-Key)',
        headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        onExceeded: '429 Too Many Requests con header Retry-After',
      },
      cors: {
        enabled: true,
        allowedOrigins: '*',
        allowedMethods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-API-Key'],
      },
      quickStart: {
        curl: 'curl https://inmogrid.cl/api/v1/map-data?comuna=valdivia&limit=5',
        fetch: `fetch('https://inmogrid.cl/api/v1/map-data?comuna=valdivia&limit=5')
  .then(r => r.json())
  .then(d => console.log(d.data))`,
      },
      support: {
        email: 'hola@inmogrid.cl',
        website: 'https://inmogrid.cl',
      },
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders() }
  );
}
