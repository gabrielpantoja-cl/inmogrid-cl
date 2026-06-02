import { NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      config: {
        api: {
          version: '1.0.0',
          baseUrl: 'https://inmogrid.cl/api/v1',
          endpoints: {
            mapData: '/map-data',
            mapDataComunas: '/map-data/comunas',
            mapConfig: '/map-config',
            health: '/health',
            docs: '/docs',
          },
          versionPolicy:
            'Versioned API. Breaking changes only in new major versions. Deprecated endpoints return 301 redirects.',
        },
        map: {
          defaultCenter: [-33.4489, -70.6693],
          defaultZoom: 10,
          minZoom: 5,
          maxZoom: 19,
          tileLayer: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        markers: {
          type: 'CircleMarker',
          defaultRadius: 20,
          popupFields: [
            { key: 'predio', label: 'Predio', type: 'text' },
            { key: 'comuna', label: 'Comuna', type: 'text' },
            { key: 'rol', label: 'ROL', type: 'text' },
            { key: 'monto', label: 'Monto (CLP)', type: 'currency' },
            { key: 'montoUf', label: 'Monto (UF)', type: 'number' },
            { key: 'superficieTerreno', label: 'Sup. terreno (m²)', type: 'number' },
            { key: 'superficieConstruida', label: 'Sup. construida (m²)', type: 'number' },
            { key: 'destino', label: 'Destino', type: 'text' },
            { key: 'fechaescritura', label: 'Fecha Escritura', type: 'date' },
            { key: 'fojas', label: 'Fojas', type: 'text' },
            { key: 'numero', label: 'Número', type: 'number' },
            { key: 'anio', label: 'Año', type: 'number' },
            { key: 'cbr', label: 'CBR', type: 'text' },
          ],
        },
        filters: {
          available: [
            { key: 'comuna', label: 'Comuna', type: 'string' },
            { key: 'anio', label: 'Año', type: 'number' },
            { key: 'limit', label: 'Límite', type: 'number' },
          ],
        },
        dataSchema: {
          id: { type: 'string', description: 'Unique identifier' },
          lat: { type: 'number', description: 'Latitude (-56 to -17.5 for Chile)' },
          lng: { type: 'number', description: 'Longitude (-76 to -66 for Chile)' },
          fojas: { type: 'string', description: 'Fojas number in CBR registry' },
          numero: { type: 'number', description: 'Entry number in CBR registry' },
          anio: { type: 'number', description: 'Transaction year' },
          cbr: { type: 'string', description: 'Conservador de Bienes Raíces name' },
          predio: { type: 'string', description: 'Property description' },
          comuna: { type: 'string', description: 'Municipality name' },
          rol: { type: 'string', description: 'SII ROL (property tax ID)' },
          fechaescritura: { type: 'string', description: 'Deed date (DD/MM/YYYY)' },
          superficieTerreno: {
            type: 'number',
            description:
              'Lot surface in m². NULL for horizontal-property units (apartments, offices, parking, storage) where land is alicuota of the common lot.',
          },
          superficieConstruida: {
            type: 'number',
            description: 'Built surface in m². NULL for raw lots / unbuilt land.',
          },
          destino: {
            type: 'string',
            description:
              'SII destination code (1 letter): H=Habitacional, W=Terreno, C=Comercial, A=Agrícola, Z=Estacionamiento, L=Bodega, O=Oficina, I=Industrial, F=Forestal, B=Agroindustrial, D=Deporte y Recreación, E=Educación y Cultura, G=Hotel y Motel, M=Minería, P=Administración Pública, Q=Culto, S=Salud, T=Transporte y Telecom, V=Otros.',
          },
          montoUf: {
            type: 'number',
            description:
              'Transaction amount in UF (when source provides it). NULL otherwise — derivable from monto + UF historical rate at fechaescritura.',
          },
          monto: { type: 'string', description: 'Transaction amount (CLP formatted)' },
          observaciones: { type: 'string', description: 'Additional notes' },
        },
        cors: {
          enabled: true,
          allowedOrigins: '*',
          allowedMethods: ['GET', 'OPTIONS'],
        },
      },
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders() }
  );
}
