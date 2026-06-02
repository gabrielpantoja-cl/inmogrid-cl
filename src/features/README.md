# `src/features/`

Dominios de negocio de inmogrid.cl. Cada feature es **autocontenido**: tiene sus componentes, hooks, lib, types y API routes en una sola carpeta.

## Estructura esperada de un feature

```
features/<nombre>/
├── api/          # route handlers (Next.js) + lib específica de rutas
├── components/   # componentes React del feature (<200 líneas cada uno)
├── hooks/        # hooks específicos del feature
├── lib/          # queries Prisma, validations Zod, utils de negocio
├── types/        # tipos del feature
├── actions/      # server actions (opcional)
└── README.md     # scope + API pública + dependencies permitidas
```

## Reglas

1. Un feature **puede** importar de `@/shared/*` y de librerías externas.
2. Un feature **NUNCA** importa de otro feature. Si necesita algo de otro, ese algo sube a `shared/`.
3. Cada feature tiene un `README.md` que documenta su scope y qué expone públicamente.
4. Componentes >200 líneas se descomponen antes de commitear.

Ver `docs/adr/ADR-001-feature-first-architecture.md` para el detalle.

## Features planeados

| Feature | Estado | Sprint de migración |
|---|---|---|
| `referenciales` | 🟡 parcial (vive en `components/referenciales/`) | Sprint 2 |
| `posts` | 🔴 en `app/api/posts/` + `components/` | Sprint 2 |
| `networking` | 🔴 en `components/networking/` + `app/actions/` | Sprint 2 |
| `profiles` | 🔴 `ProfileEditForm` 471L en `components/forms/` | Sprint 2 |
| `chat` (Sofia) | 🔴 en `app/api/chat/` | Sprint 2 |
| `events` | ⚪ futuro | Fase 2 |
| `plants` | ⚪ futuro | Fase 2 |
| `tasaciones` | ⚪ futuro | Fase 3 |
