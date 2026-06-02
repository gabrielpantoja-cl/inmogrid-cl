# ADR-007: Referenciales UX Redesign — routing, clustering, PII masking y gating

**Date**: 2026-04-21
**Status**: Accepted
**Deciders**: equipo de inmogrid.cl

## Context

La experiencia de referenciales había crecido como un solo mega-componente (`ReferencialesExplorer`) que renderizaba mapa + tabla + filtros en la misma página, con la misma UX para usuarios públicos y autenticados. Esto presentaba varios problemas simultáneos:

1. **IA confusa**: la página pública mostraba una tabla "Últimos registros" que daba la impresión (falsa) de que esos eran todos los datos, mientras el mapa cargaba 20 000 puntos a la derecha.
2. **Mapa genérico**: `CircleMarker` de react-leaflet, sin afordance de clustering ni estilo de marca.
3. **Sin búsqueda geográfica**: usuarios no podían saltar directo a una dirección, tenían que navegar con zoom y pan.
4. **Peritos y tasadores sin vista de planilla**: el público objetivo principal (peritos, tasadores, corredores) usa Excel a diario. No había una vista tabular con paginación, filtros combinables ni truncado de campos largos.
5. **PII expuesta**: `comprador` y `vendedor` se seleccionaban libremente desde Neon y podían llegar al cliente sin enmascarar.
6. **Sin heurística de calidad**: los datos con montos en cero, fechas futuras o ROL malformado no tenían señal visual para el usuario.

## Decision

Reestructurar referenciales en **cinco rutas dedicadas**, con UX diferenciada entre público y autenticado, y promover las funciones avanzadas (tabla, filtros URL-sync, PII unmasking) como "premium" detrás de un gate por perfil profesional.

### 1. Routing: hub + 4 rutas dedicadas

```
/referenciales                              ─ público — mapa + stats (sin tabla)
/dashboard/referenciales                    ─ hub con 3 cards (requireAuth)
/dashboard/referenciales/mapa               ─ mapa modo autenticado + filtros avanzados
/dashboard/referenciales/tabla              ─ tabla tipo planilla (requireProfessionalProfile)
/dashboard/referenciales/contribuciones     ─ histórico de envíos propios
```

**Por qué rutas dedicadas y no tabs**: cada vista tiene metadata propia (SEO), URL compartible, prefetch independiente y puede evolucionar sin interferir con las demás. Un `layout.tsx` compartido monta la nav secundaria (`ReferencialesNav`) con highlight por pathname.

**Por qué un hub y no redirect al mapa**: la tabla y el mapa sirven audiencias y casos de uso distintos — un perito que compara 200 registros por comuna trabaja mejor en tabla; un analista de barrio prefiere el mapa. El hub deja elegir explícitamente.

### 2. Clustering: supercluster + L.divIcon (no leaflet.markercluster)

**Alternativa descartada**: `leaflet.markercluster` (40 kB) — trae spiderfy built-in pero duplica funcionalidad con `supercluster` que ya estaba en el proyecto y requeriría refactorear el flujo actual.

**Elegido**: `supercluster` + markers como `L.divIcon` con HTML/CSS propio (`map-markers.css`).

- **Pin individual**: `dot amarillo (yellow-400) + halo semi-transparente (yellow-500/18%) + anillo exterior (yellow-600)`. Hover escala 1.18×.
- **Cluster**: círculo ámbar (amber-500) con número centrado + dos anillos concéntricos animados (pulse 2s). Tamaño dinámico 32–72 px según `log(count)`. Labels `1k`/`10k` para evitar texto largo.
- **Spiderfy custom**: al click en cluster ≤10 puntos que ya no puede dividirse por zoom, los leaves se despliegan en círculo alrededor del ancla con líneas punteadas desde el centro. Radio crece con el número de leaves. Se colapsa al mover / zoomear / clic en el mapa.
- `prefers-reduced-motion` respetado (desactiva animaciones).

**Ventajas**: sin imágenes externas, estilos versionables, branding alineado, bundle más liviano, control total del render.

### 3. Geocoder: Nominatim via `leaflet-geosearch` (no Mapbox)

**Alternativa evaluada**: Mapbox SearchBox API — requiere token (`NEXT_PUBLIC_MAPBOX_TOKEN` restringido por dominio) y rotación periódica. Mejor precisión en zonas rurales, permite autocomplete agresivo.

**Elegido**: `leaflet-geosearch` + `OpenStreetMapProvider` — gratis, sin key, 30 kB.

- Restricción geográfica: `countrycodes: 'cl'`.
- Sin autocomplete-as-you-type: usuario confirma con Enter o click en la lupa (evita saturar el endpoint público de Nominatim, cuya política es 1 req/seg por IP).
- Mismo marker amarillo de branding (reutiliza `inmg-pin` de `map-markers.css`).

**Cuándo migrar a Mapbox** (diferido, no implementado):
- Tráfico de búsquedas que supere 1 req/seg por IP (realista solo con autocomplete agresivo).
- Precisión insuficiente en zonas rurales chilenas.
- Necesidad de autocomplete-as-you-type con baja latencia.

La migración implica cambiar solo el provider dentro de `leaflet-geosearch` (soporta `MapboxProvider`), agregar la env var y configurar dominio allowlist en el dashboard de Mapbox.

### 4. Tabla: TanStack Table + Shadcn primitives + URL-sync

Instaladas: `@tanstack/react-table`, `@radix-ui/react-popover`.

Nuevos primitivos shadcn-style en `src/shared/components/ui/primitives/`: `table.tsx` y `popover.tsx` (consistentes con `button.tsx`, `input.tsx` pre-existentes).

**Patrón de filtros URL-sync** — la URL es la **single source of truth**:

```ts
// TablaContent.tsx (resumido)
const searchParams = useSearchParams();
const current = useMemo(() => readFiltersFromURL(searchParams), [searchParams]);

// Fetch en useEffect cuando la URL cambia
useEffect(() => {
  fetchReferencialesTable(current).then(setResult);
}, [current]);

// Al cambiar un filtro: update URL con router.replace({ scroll: false })
const updateUrl = (next) => {
  const qs = filtersToSearch({ ...current, ...next });
  router.replace(`/dashboard/referenciales/tabla?${qs}`, { scroll: false });
};
```

Debounce de 400 ms en el campo de búsqueda libre para no disparar una query por tecla.

**Paginación fija** de 30 ítems/pg, con `offset` calculado server-side (el cliente nunca manipula saltos).

**Truncado inteligente** (`TruncatedCell`): cualquier string >45 chars muestra `…` + botón `⤢` que abre un Radix Popover con el valor completo. Cierre automático por click-outside y `Escape`. Aria-label descriptivo por campo.

### 5. PII masking: server-side en server actions

**Campos enmascarados**: `comprador`, `vendedor` (PII directa) + `observaciones` (PII en texto libre).

**Formato** (Opción A, discutida y aprobada):
- `Juan Pérez` → `J**n P***z` (primera y última letras reveladas, asteriscos dinámicos según longitud)

**Dónde se aplica**: en el server action `fetchReferencialesTable` **antes de que los datos viajen al cliente**. Los roles `admin` y `superadmin` reciben los valores originales; el rol `user` recibe valores ya masked en el JSON.

**Defensa en profundidad** — el SELECT de `comprador`/`vendedor` está gated detrás de `includePII: true` en `queryMapDataExtended`. Si un endpoint no-autenticado llama esta función sin el flag, las columnas ni siquiera se seleccionan de Neon — cero riesgo de leak por endpoint equivocado.

**Observaciones — regex heurística**:

```ts
// src/features/referenciales/lib/mask.ts
const NAME_REGEX =
  /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}(?:\s+(?:de|del|la|las|los|el|y)\s+...|\s+[A-ZÁÉÍÓÚÑ]...){1,3}\b/g;
```

Whitelist de prefijos (`Avenida`, `Calle`, `Fundo`, `Parcela`, `Ruta`...) evita enmascarar nombres de calles o predios. Accept falsos positivos mínimos antes que dejar pasar nombres reales.

**Justificación legal**: alineado con Ley 19.628 de protección de datos personales. Un banner explicativo avisa al usuario con rol `user` que los nombres están enmascarados por compliance.

### 6. Heurística de datos sospechosos: derivada, no persistida

Cuatro criterios aplicados en `detectSuspicious(row)`:

| Flag | Condición |
|---|---|
| `monto_zero` | monto null o 0 |
| `superficie_large` | superficie > 10.000 m² (1 ha) |
| `fecha_invalid` | año < 1900 o > año actual + 1 |
| `rol_invalid` | no matchea `/^\d{5}-\d{4}$/` |

**Nivel** derivado del número de flags: `low` (1), `medium` (2), `high` (3+).

**Por qué derivado y no persistido**:
1. Los criterios evolucionan — persistirlos forzaría migración + backfill cada iteración.
2. La tabla `referenciales` en Neon es **read-only** desde la app — no podemos escribir ahí.
3. Cost ínfimo: <1 ms por fila, 30 filas por página.

**UI**: `SuspicionBadge` con pill coloreado según nivel + popover con lista de problemas detectados y botón "Reportar como dato dudoso" que abre el `ReportModal` existente (flujo que ya tenía el mapa).

Si en el futuro se quiere persistir *reportes de usuarios sobre filas sospechosas*, ya existe la tabla `contributions` con `type='report'`.

### 7. Gating premium: `requireProfessionalProfile()` en server component (no middleware)

La tabla `/dashboard/referenciales/tabla` requiere un perfil profesional completo.

**Decisión crítica**: el gate vive en el **server component** de la ruta, **NO en middleware**.

**Por qué no middleware**: `src/middleware.ts` corre en **edge runtime** y no tiene acceso a Prisma — no puede consultar `Profile.profession` ni `ProfessionalProfile`. Intentar chequear "perfil completo" ahí requeriría ponerlo en cookies (stale) o hacer un RPC (complejidad innecesaria).

**Patrón**:

```ts
// src/shared/lib/supabase/auth.ts
export async function requireProfessionalProfile(): Promise<{
  user: User;
  profile: InmogridProfile;
}> {
  const user = await requireAuth();
  const profile = await getProfile(user.id);
  if (!profile || !isProfessionalProfileComplete(profile)) {
    redirect('/dashboard/perfil?complete=professional');
  }
  return { user, profile };
}
```

**Criterio de "completo"**: hoy basta con `Profile.profession !== null` (el enum `ProfessionType` cubre los roles relevantes). A futuro, cuando exista UI para editar `ProfessionalProfile.specialty[]` y `yearsExperience`, el gate puede endurecerse.

El usuario redirigido a `/dashboard/perfil?complete=professional` ve un banner explicando por qué se le pide completar el campo.

### 8. SSR-safe auth hook — `createClient()` solo dentro de `useEffect`

**Problema detectado en Vercel Preview**: el build crasheaba en el prerender de `/blog` con `@supabase/ssr: Your project's URL and API key are required`. Root cause: `useAuth` llamaba `createClient()` en el top-level del hook, ejecutándose durante SSR.

Si `NEXT_PUBLIC_SUPABASE_*` no están inlined en el bundle (caso típico del env "Preview" de Vercel, que es distinto al env "Production" y puede no tener las vars replicadas), `createBrowserClient` tira sincrónicamente → el prerender falla → el build cancela.

**Patrón correcto**:

```tsx
// ❌ MAL — corre durante SSR prerender
export function useAuth() {
  const supabase = createClient();  // ← fallo si faltan env vars
  useEffect(() => { ... }, []);
}

// ✅ BIEN — solo corre client-side
export function useAuth() {
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (e) {
      console.error('[useAuth] Init failed:', e);
      setIsLoading(false);
      return;
    }
    // ... resto
  }, []);
}
```

**Regla general**: cualquier código que dependa de env vars runtime-opcional debe vivir dentro de un `useEffect` o en un event handler, nunca en el cuerpo del componente/hook. Documentado también en `docs/arquitectura/patrones.md`.

## Architecture

```
src/app/dashboard/referenciales/
├── layout.tsx                        ─ requireAuth() + ReferencialesNav
├── page.tsx                          ─ Hub (3 cards)
├── ReferencialesNav.tsx              ─ Tab-like nav con highlight por pathname
├── ContributeModal.tsx
├── mapa/
│   ├── page.tsx
│   └── MapaContent.tsx               ─ ReferencialesExplorer mode="authenticated"
├── tabla/
│   ├── page.tsx                      ─ requireProfessionalProfile()
│   ├── TablaContent.tsx              ─ TanStack + URL-sync + truncado + paginación
│   ├── actions.ts                    ─ fetchReferencialesTable (PII masking + heurística)
│   ├── columns.tsx                   ─ ColumnDef con SuspicionBadge + TruncatedCell
│   ├── SuspicionBadge.tsx            ─ Pill + Popover con reporte
│   └── TruncatedCell.tsx             ─ Campos >45 chars con popover Radix
└── contribuciones/
    ├── page.tsx
    └── ContribucionesContent.tsx

src/features/referenciales/
├── components/
│   ├── ReferencialesMap.tsx          ─ MapContainer + Clustering + Spiderfy + Geocoder
│   ├── MapGeocoder.tsx               ─ leaflet-geosearch + Nominatim
│   ├── map-markers.css               ─ Pin + cluster + spider leg
│   └── map-geocoder.css              ─ Control geosearch alineado con branding
├── lib/
│   ├── mask.ts                       ─ maskName, maskObservaciones, maskByRole
│   └── flags.ts                      ─ detectSuspicious, labelForFlag
```

## Consequences

### Positive
- Cada vista de referenciales tiene URL propia y metadata SEO.
- Mapa con identidad visual de marca (amarillo + halos + clusters animados).
- Tabla compartible vía URL (filtros sobreviven al copy/paste).
- PII protegida por defecto — leak requiere múltiples fallos en capas (rol misconfigurado + server action misconfigurado + SELECT sin gate).
- Datos sospechosos resaltados sin necesidad de migración.
- Gate profesional convierte la tabla en un incentivo para completar el perfil (alineado con el modelo de comunidad del producto).
- Preview deployments de Vercel ahora son robustos ante env vars incompletos.

### Negative
- Dos layouts + cinco rutas donde antes había una — más superficie para mantener.
- El masking por regex en `observaciones` puede tener falsos positivos (nombres de fundos, calles).
- `requireProfessionalProfile` genera una query adicional a Supabase por request (mitigable con cache si se vuelve hotpath).
- Los clusters animados con keyframes CSS pueden molestar en dispositivos low-end; mitigado por `prefers-reduced-motion`.

### Risks
- **Regresión del SSR-safe pattern**: si alguien agrega otro `createClient()` en el cuerpo de un hook/componente client, el build volverá a fallar en Preview sin env vars. Documentado en `patrones.md` + guard posible via regla ESLint futura.
- **Schema drift de Neon** (mismo riesgo que ADR-005): si `referenciales` cambia `comprador`/`vendedor` a otro nombre, el SELECT con `includePII: true` tira.
- **Nominatim quota**: si alguien implementa autocomplete-as-you-type sin pensar en el rate limit, podría hacernos baner el endpoint público. Mitigado por docs + el control actual no lo activa.

## Related Documents

- `ADR-001` — Feature-first architecture (respetada en todos los nuevos módulos)
- `ADR-004` — Route group `(public)` + layout compartido (este ADR agrega el layout de `dashboard/referenciales/`)
- `ADR-005` — Dual-backend Supabase + Neon (este ADR extiende `queryMapDataExtended` con `offset` y `includePII`)
- `docs/arquitectura/patrones.md` — patrón SSR-safe hooks (sección agregada junto a este ADR)
- `src/app/dashboard/referenciales/` — código fuente del redesign
- `scripts/sql/2026-04-21-forum-tables.sql` — migración lateral del foro (fuera de scope, pero aplicada el mismo día)
