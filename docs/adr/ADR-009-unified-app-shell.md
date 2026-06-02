# ADR-009: Unified AppShell — misma navegación pública y autenticada

**Date**: 2026-04-21
**Status**: Accepted
**Deciders**: equipo de inmogrid.cl
**Supersedes**: parte de ADR-004 (que definía shells separados por route group)

## Context

ADR-004 dejó la app con **dos shells distintos**:

- **Público** (`(public)/layout.tsx`): TopBar + sidebar izquierdo estilo Reddit.
- **Dashboard** (`dashboard/layout.tsx`): navbar horizontal con links (`Inicio · Mi Perfil · Referenciales · Blog · Explorar · Comunidad`).

Ambos compartían `AccountMenu` para la consistencia del menú de cuenta, pero la experiencia **de navegación** cambiaba al iniciar sesión:

- El usuario aterrizaba en `/` con sidebar izquierdo familiar.
- Autenticarse lo enviaba a `/dashboard` — sidebar desaparecía, aparecía una navbar horizontal distinta.
- Al volver a navegar a `/foro` o `/blog`, el sidebar reaparecía.

Esta inconsistencia rompía la premisa Reddit-style del producto: la navegación principal se mantiene donde está y cambia solo el contenido.

## Decision

Extraer el shell a un componente compartido `AppShell` y usarlo **desde ambos layouts**.

### 1. Componente shared: `src/shared/components/layout/AppShell.tsx`

```tsx
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden md:block w-60 shrink-0 sticky top-14 ...">
          <LeftSidebar />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
```

### 2. Ambos layouts delegan al shell

```tsx
// (public)/layout.tsx
export default function PublicLayout({ children }) {
  return <AppShell>{children}</AppShell>
}

// dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <AppShell>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </AppShell>
  )
}
```

Única diferencia: el dashboard envuelve el contenido en un contenedor con padding adicional (para formularios largos), pero el chrome es idéntico.

### 3. `LeftSidebar` se adapta al estado de autenticación

El sidebar consume `useAuth` internamente y muestra tres bloques:

- **Primario** (todos): Foro · Mapa · Sofía IA
- **Secundario** (todos): Blog · Eventos · Conservadores · Comunidad
- **Mi cuenta** (autenticados): Mi Dashboard · Mi Perfil · Gestionar Blog (solo admin)

El patrón evita pasar `isAuth` / `isAdmin` como props — cada link tiene flags `authOnly` y `adminOnly` y el sidebar filtra:

```tsx
const canSee = (item: NavItem) => {
  if (item.adminOnly && !isAdmin) return false
  if (item.authOnly && !isAuthenticated) return false
  return true
}
```

### 4. Eliminación de código muerto

La navbar horizontal del dashboard (`src/shared/components/layout/dashboard/navbar/`) y el sidebar alterno (`nav-links.tsx`) quedaron sin uso. Se eliminaron (commit del refactor, −306 líneas).

## Consequences

### Positive

- La navegación principal ya no cambia al iniciar sesión — solo se agregan ítems.
- Una sola fuente de verdad para los enlaces del sidebar. Agregar una ruta nueva requiere tocar un archivo, no dos.
- El patrón `authOnly` / `adminOnly` escala sin tocar el componente `LeftSidebar`.
- `AccountMenu` ya era compartido — ahora el resto de la nav también lo es.
- 306 líneas menos para mantener.

### Negative

- Hay menos espacio para una navbar horizontal dedicada al dashboard si en el futuro se requieren sub-secciones densas (p. ej. tabs por área). Queda solucionable agregando un sub-header dentro del `children` del dashboard — el `AppShell` no lo impide.
- El `LeftSidebar` ahora depende de `useAuth`, lo que lo obliga a ser client-side. Antes el layout público podía renderizarse 100% server. A cambio, los ítems autenticados aparecen inmediatamente tras login sin recarga.

### Risks

- Si alguien agrega un link `adminOnly` y olvida el flag, quedará visible para todos (y el server component lo bloqueará con redirect, pero la UX es peor). Mitigado por review y porque la ausencia de flag solo aparece en rutas gated que explícitamente implementaron `requireAdmin`.

## Alternatives Considered

### A. Mantener dos shells distintos

Statu quo pre-refactor. Rechazado por la inconsistencia de UX y la duplicación de código de navegación.

### B. Dashboard con sidebar collapsible + public sin sidebar

Agregaba una tercera variante (sidebar collapsible) sin resolver la inconsistencia entre público y autenticado.

### C. Sidebar en todas las rutas, siempre

Elegida. Es la solución Reddit/Discord-style que el producto ya venía imitando en público.

## Related Documents

- `ADR-004` — estableció el grupo `(public)` y `AccountMenu` compartido. Este ADR extiende la filosofía (shell shared) a todo el dashboard.
- `ADR-008` — define cómo se gatean los links `adminOnly` del sidebar.
- `src/shared/components/layout/AppShell.tsx` — implementación.
- `src/shared/components/layout/public/LeftSidebar.tsx` — con los 3 bloques y filtros por rol.
