# Feature: `referenciales`

Visualización y exploración de datos de transacciones inmobiliarias chilenas.

## Scope

- Mapa Leaflet con clustering y spiderfy (`ReferencialesMap`)
- Panel de estadísticas agregadas por comuna/año (`ReferencialesStats`)
- Explorer unificado con filtros base y avanzados (`ReferencialesExplorer`)
- Geocoder por dirección restringido a Chile (`MapGeocoder`)
- Cliente para los endpoints de datos (`lib/api.ts`)
- Utilidades de masking y heurística de calidad (`lib/mask.ts`, `lib/flags.ts`)

Los datos vienen de Neon vía la capa de queries en `src/shared/lib/queries/referenciales.ts`. Ver [ADR-005](../../../docs/adr/ADR-005-dual-backend-supabase-neon.md) para el modelo dual-backend y [ADR-007](../../../docs/adr/ADR-007-referenciales-ux-redesign.md) para las decisiones de UX.

## Estructura

```
features/referenciales/
├── components/
│   ├── ReferencialesMap.tsx      # Leaflet + supercluster + spiderfy (client-only)
│   ├── ReferencialesExplorer.tsx # Filtros + mapa + stats
│   ├── ReferencialesStats.tsx    # Recharts bar charts
│   ├── ReportModal.tsx           # Reporte de dato dudoso
│   ├── MapGeocoder.tsx           # Búsqueda por dirección (Nominatim)
│   ├── map-markers.css           # Estilos divIcon + spiderfy
│   └── map-geocoder.css          # Estilos del control de búsqueda
├── lib/
│   ├── api.ts                    # fetchReferenciales(Auth), fetchComunas(Auth), formatCLP
│   ├── mask.ts                   # maskName, maskObservaciones, maskByRole
│   ├── flags.ts                  # detectSuspicious, labelForFlag
│   └── csv.ts                    # toCSV, downloadCSV
└── index.ts                      # API pública del feature (barrel)
```

## API pública

Importar siempre desde `@/features/referenciales`:

```ts
import {
  ReferencialesMap,
  ReferencialesExplorer,
  ReferencialesStats,
  ReportModal,
  fetchReferenciales,
  fetchComunas,
  maskName,
  maskObservaciones,
  detectSuspicious,
  type Referencial,
} from '@/features/referenciales';
```

`ReferencialesMap` debe cargarse con `next/dynamic` + `ssr: false` porque Leaflet es browser-only.

## Dependencias

- Externas: `react-leaflet`, `leaflet`, `supercluster`, `leaflet-geosearch`, `recharts`
- Internas: `shared/lib/queries/referenciales.ts` (solo vía API routes / server actions — los componentes cliente consumen la API HTTP)

## Consumido por

- `/referenciales` — mapa unificado. Anónimos ven filtros básicos; auth suma filtros avanzados, export CSV y acciones Contribuir/Reportar
- `/referenciales/tabla` — tabla tipo planilla (auth + perfil profesional requerido)
- `/referenciales/mis-aportes` — histórico de envíos propios del usuario
