# Feature: `networking`

Red profesional de inmogrid.cl: solicitudes de conexión, aceptación, listado de conexiones y solicitudes pendientes.

## Scope

- Server actions para CRUD de conexiones (React 19 Server Actions)
- Componente `ConnectionButton` con `useOptimistic` + `useActionState` para UI optimista
- **NO** incluye (todavía): lista de conexiones, badge de solicitudes pendientes en navbar, notificaciones

## Estructura

```
features/networking/
├── actions/
│   └── networking.ts          # sendConnectionRequest, removeConnection, getUserConnections, ...
├── components/
│   └── ConnectionButton.tsx   # botón con UI optimista
└── index.ts                   # API pública
```

## API pública

```ts
import {
  ConnectionButton,
  sendConnectionRequest,
  handleConnectionAction,
  removeConnection,
  getUserConnections,
  getPendingRequests,
} from '@/features/networking';
```

## Dependencias permitidas

- Internas: `@/lib/prisma`, `@/lib/auth` (en Sprint 3 migrarán a `@/shared/lib/`)
- Externas: `react`, `next`, `lucide-react`, `zod`

## Modelo de datos

Usa el modelo Prisma `Connection` con relación `requester`/`receiver` hacia `Profile`. **NO** usar los nombres auto-generados largos (`Connection_requesterIdToProfile`).

Estados: `pending | accepted | rejected` (enum `ConnectionStatus`).

## Consumido por

- (Sin consumidores todavía — `ConnectionButton` aún no está montado en ninguna página. Se integrará en Sprint 2.5 cuando se descomponga el feature `profiles`.)

## Pendiente

- Tests unitarios de las actions (mock de Prisma)
- Componente `ConnectionsList` para mostrar red en el dashboard
- Integrar `ConnectionButton` en `ProfileHero` (una vez migrado `profiles`)
