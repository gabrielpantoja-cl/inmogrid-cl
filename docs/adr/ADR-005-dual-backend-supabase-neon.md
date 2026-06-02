# ADR-005: Dual-Backend Architecture (Supabase + Neon PostGIS)

**Date**: 2026-04-12
**Status**: Accepted
**Deciders**: equipo de inmogrid.cl

## Context

`inmogrid.cl` combina dos conjuntos de datos con características muy distintas:

1. **Datos de aplicación** — perfiles de usuario, posts, conexiones, eventos, foro, contribuciones. Son read/write intensivos, con relaciones normalizadas, sujetos a auth y RLS.
2. **Datos de transacciones inmobiliarias verificadas** ("referenciales") — decenas de miles de registros con geometría PostGIS, montos BigInt, queries espaciales (bbox, clustering por zoom) y patrón de acceso read-only con alta concurrencia.

Intentar servir ambos desde una sola instancia fuerza un trade-off incómodo: o se paga un tier alto por PostGIS en el proveedor de la app, o se sacrifican queries espaciales nativas.

## Decision

Separar en **dos backends** según el patrón de uso:

| Backend | Engine | Propósito | Acceso |
|---------|--------|-----------|--------|
| **Supabase** | PostgreSQL (Prisma ORM) | Profiles, posts, conexiones, eventos, foro, chat, contribuciones | Read/Write |
| **Neon** | PostgreSQL + PostGIS (postgres.js, raw SQL) | Referenciales (~21 k transacciones verificadas) + directorio de conservadores | **Read-only** desde la app |

### Key design choices

**1. postgres.js sobre Prisma para Neon**

El soporte de PostGIS en Prisma es limitado (columnas `geometry` quedan como `Unsupported`). Raw SQL vía postgres.js da acceso completo a `ST_X()`, `ST_Y()`, queries espaciales, `ST_MakeEnvelope`, etc. — todo sin overhead del ORM sobre data read-only.

**2. Precisión BigInt vía casting en SQL**

Los montos de transacciones (`monto`) se almacenan como `BIGINT` en Neon. Valores grandes (p. ej. $15.000.000.000 CLP en transacciones de suelo) pueden exceder `Number.MAX_SAFE_INTEGER` de JavaScript. Se castea `monto::text` directamente en SQL y se transporta como String en toda la API. El formateo a CLP (`$150.000.000`) pasa por la capa de queries; nunca se convierte a `Number` en los JSON de respuesta.

**3. Coordenadas PostGIS extraídas en SQL**

En vez de parsear EWKB binario en JavaScript, los queries usan `COALESCE(ST_Y(geom), lat)` / `COALESCE(ST_X(geom), lng)` para extraer coordenadas directamente. Esto entrega valores `lat`/`lng` listos para Leaflet con cero procesamiento cliente-side.

**4. Staging de contribuciones en Supabase**

Los usuarios pueden aportar nuevos datos o reportar errores, pero sus envíos nunca tocan Neon directamente. Las contribuciones van a la tabla `contributions` (Supabase) con `status: pending`. Un admin revisa y aprueba. Los registros aprobados se integran a Neon por un pipeline separado.

El campo `source_id` liga correcciones/reportes al ID del registro original en Neon, dejando la moderación manejable.

**5. API `/api/v1/*` — datos georreferenciados**

Los endpoints bajo `/api/v1/` sirven los datos de Neon con rate limiting (Upstash Redis, 60 req/min anónimo) y CORS abierto. Response shape documentado en `GET /api/v1/docs`.

## Consequences

### Positive
- PostgreSQL/PostGIS nativo para queries espaciales sin penalización de costo en la app.
- Queries espaciales directas habilitan features futuras (radius search, heatmaps, clustering server-side).
- Sistema de contribuciones crea un flywheel de mejora de datos por comunidad.
- Rate limiting protege cada backend de forma independiente.
- Zod validation en la capa de queries captura cambios inesperados de schema como errores de parsing, no corrupción silenciosa de datos.

### Negative
- Dos connection pools que mantener (Supabase + Neon).
- `NEON_DATABASE_URL` debe mantenerse sincronizada entre entornos.
- La capa de queries crudas en postgres.js requiere cuidado extra con escaping (ver `qPattern` en `queryMapDataExtended`).

### Risks
- **Cold starts de Neon**: la primera query después de idle puede tardar 2–5 s. Mitigado por monitoreo de health que mantiene la DB caliente.
- **Schema drift**: si el schema de Neon cambia, los queries pueden romperse. Zod en la capa de validación surface esto inmediatamente como parse error en vez de corrupción silenciosa.

## Architecture Diagram

```
                    ┌──────────────────────────────────┐
                    │         inmogrid.cl               │
                    │       (Next.js 15)                │
                    └──────────┬───────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               │                               │
    ┌──────────▼──────────┐        ┌───────────▼──────────┐
    │  Supabase (Prisma)  │        │  Neon (postgres.js)   │
    │                     │        │     READ-ONLY         │
    │  • profiles         │        │  • referenciales      │
    │  • posts            │        │    (~21 k registros)  │
    │  • threads, comments│        │  • conservadores      │
    │  • events           │        │  • PostGIS geometry   │
    │  • contributions    │        │                       │
    │    (staging area)   │        │                       │
    └─────────────────────┘        └───────────────────────┘
               │                               ▲
               │  contribuciones aprobadas     │
               └────────── pipeline ───────────┘

    /api/v1/*          ──→  Neon (read-only, rate-limited)
    /api/* (auth)      ──→  Supabase (read/write)
```

## Related Documents

- `ADR-001` — Feature-first architecture (las reglas de boundary aplican al código de cada feature)
- `ADR-007` — Referenciales UX redesign (extiende este backend con masking y heurística)
- `src/shared/lib/queries/referenciales.ts` — capa única de SQL raw para Neon
