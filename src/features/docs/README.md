# Feature: `docs`

Visor de documentación pública de inmogrid.cl. Renderiza los markdown de `docs/` con sidebar navegable.

## Estructura

```
features/docs/
└── components/
    ├── DocsSidebar.tsx
    ├── DocsViewer.tsx
    └── DocsContent.tsx
```

## Consumido por

- `src/app/(public)/admin/docs/page.tsx`

## Pendiente

- Agregar `index.ts` (barrel) con la API pública
- README formal con scope y dependencias (por ahora este placeholder)
