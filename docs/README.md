# Documentación de `inmogrid.cl`

> Proyecto open source para construir un ecosistema inmobiliario abierto y colaborativo en Chile.

Esta carpeta contiene la documentación pública del proyecto. Si vas a contribuir, empezá por [architecture.md](architecture.md).

---

## Índice

### Fundacional — por qué existe este proyecto

| Documento | Contenido |
|---|---|
| [manifesto.md](manifesto.md) | El texto fundacional — qué creemos, qué hacemos y qué no hacemos |
| [vision.md](vision.md) | Visión, principios y origen del proyecto |

### Técnica — cómo está construido

| Documento | Contenido |
|---|---|
| [architecture.md](architecture.md) | Stack, estructura del repo, modelo de datos (Supabase + Neon), auth y API |
| [design-system.md](design-system.md) | Tokens semánticos, alpha modifiers, cómo agregar un color nuevo |
| [arquitectura/patrones.md](arquitectura/patrones.md) | Patrones de código — forms, data fetching, auth, errores, SSR-safe hooks |
| [arquitectura/ROADMAP-refactor.md](arquitectura/ROADMAP-refactor.md) | Roadmap de refactor hacia la estructura actual |

### Decisiones arquitectónicas (ADRs)

| ADR | Tema | Status |
|---|---|---|
| [ADR-001](adr/ADR-001-feature-first-architecture.md) | Arquitectura feature-first | Accepted |
| [ADR-003](adr/ADR-003-design-tokens-two-layer-system.md) | Design tokens en dos capas (CSS vars ↔ Tailwind) | Accepted |
| [ADR-004](adr/ADR-004-public-route-group-and-shared-account-menu.md) | Route group `(public)` + `AccountMenu` compartido | Superseded por ADR-009 |
| [ADR-005](adr/ADR-005-dual-backend-supabase-neon.md) | Dual-backend — Supabase (read/write) + Neon (read-only PostGIS) | Accepted |
| [ADR-006](adr/ADR-006-sofia-rag-gemini-integration.md) | Sofia RAG chatbot con Gemini + pgvector | **Paused** (deshabilitado 2026-04-24) |
| [ADR-007](adr/ADR-007-referenciales-ux-redesign.md) | Referenciales — routing split, clustering, PII masking, gating, SSR-safe | Accepted |
| [ADR-008](adr/ADR-008-role-based-access.md) | Role-based access control — admin/user split para foro vs. blog | Accepted |
| [ADR-009](adr/ADR-009-unified-app-shell.md) | AppShell unificado — misma navegación pública y autenticada | Accepted |
| [ADR-010](adr/ADR-010-forum-engagement.md) | Forum engagement — likes, bookmarks, share, comentario inline, replies anidadas, menciones, notifs, reportes | Accepted |

Los ADR numerados que falten (002) nunca se escribieron o fueron retirados; la numeración se mantiene monotónica.

---

## Cómo contribuir

Ver [`CONTRIBUTING.md`](../CONTRIBUTING.md) en la raíz del repositorio.

Reglas rápidas:

- Abrí un issue antes de trabajar en cambios grandes
- TypeScript strict — sin `any` implícitos
- Respetá la estructura feature-first descrita en ADR-001
- Corré `npm run lint` y `npm run test` antes de abrir un PR

---

## Glosario

- **CBR** — Conservador de Bienes Raíces. Registro notarial de propiedades en Chile.
- **ROL** — Identificador único de propiedad asignado por el SII. Formato: `NNNNN-AAAA`.
- **Referencial** — Transacción comparable usada para valorar una propiedad.
- **Tasación** — Avalúo de una propiedad. **Peritaje** — Tasación pericial judicial.
- **SII** — Servicio de Impuestos Internos (autoridad tributaria chilena).

---

*Documento vivo. Los PRs que mejoren la documentación son bienvenidos.*
