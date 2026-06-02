# ADR-008: Role-Based Access Control — admin/user split

**Date**: 2026-04-21
**Status**: Accepted
**Deciders**: equipo de inmogrid.cl

## Context

inmogrid.cl tiene dos superficies de publicación con audiencias y políticas distintas:

- **Foro** — abierto a todos los usuarios autenticados. El valor del producto depende de conversación activa, debates y preguntas.
- **Blog** — contenido editorial curado, de alta calidad, firmado por el equipo del proyecto. Sirve como referencia y posicionamiento SEO.

Dejarlos en la misma capa de permisos tiene dos problemas opuestos:

1. Si **todo** es abierto, el blog pierde su valor editorial — se inunda de threads que deberían haber sido del foro.
2. Si **todo** es cerrado, el foro muere por falta de contenido comunitario.

La solución requiere distinguir roles. El `Profile.role` ya existía como `user | admin | superadmin` pero no había un helper centralizado ni un patrón de gating consistente.

## Decision

### 1. Helper único: `isAdminRole(role)` + `requireAdmin()`

Single source of truth para todo chequeo admin, en `src/shared/lib/supabase/auth.ts`:

```ts
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

export async function requireAdmin(): Promise<{ user: User; profile: InmogridProfile }> {
  const user = await requireAuth()
  const profile = await getProfile(user.id)
  if (!profile || !isAdminRole(profile.role)) {
    redirect('/dashboard?error=admin_required')
  }
  return { user, profile }
}
```

Reemplaza las 3 ocurrencias dispersas donde antes se hacía `role === 'admin' || role === 'superadmin'` inline. Si en el futuro aparece un nivel nuevo (p. ej. `moderator`), se ajusta en un solo lugar.

### 2. Gating en server component, NO en middleware

El middleware corre en edge runtime y no accede a Prisma — no puede resolver `Profile.role`. El gate vive en el server component de cada ruta:

```tsx
// /dashboard/blog/page.tsx
export default async function BlogAdminPage() {
  const { user, profile } = await requireAdmin()
  // ...
}
```

Trade-off asumido: una query extra a Supabase por cada request a ruta gated. A cambio ganamos un check real contra `Profile.role` (no contra cookies) — si el mantenedor le quita el rol admin a un usuario desde el SQL Editor, la pérdida de acceso es inmediata en el siguiente page load, sin necesidad de invalidar sesiones.

### 3. Defense in depth — server + UI

Cada superficie admin-only tiene dos barreras:

- **Server**: `requireAdmin()` en page.tsx + check inline en route handlers (`isAdminRole(profile?.role)` → 403).
- **UI**: nav links, botones y CTAs filtrados por `isAdmin` desde `useAuth()`.

El UI gating es solo para UX — evita que el usuario vea un link que lo va a llevar a un redirect. La seguridad real está en el server.

### 4. Matriz de permisos actual

| Rol | Foro (hilos/comentarios) | Blog (crear/editar/borrar) | Tabla referenciales |
|---|:---:|:---:|:---:|
| no autenticado | ❌ | ❌ | ❌ |
| `user` | ✅ | ❌ | Requiere `profession` seteada |
| `admin` / `superadmin` | ✅ | ✅ | ✅ |

### 5. Escalación manual, no UI de admin

Los roles se suben desde el SQL Editor de Supabase:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'ejemplo@dominio.cl');
```

**Por qué no UI**: construir un admin panel para gestionar roles introduce superficie de ataque (¿quién puede elevar a admin? ¿se audita?) y complejidad. Con un set inicial reducido de admins y crecimiento previsible, el workflow manual es más simple y más seguro.

Cuando se justifique (N > 5 admins, o si se delega la operación), se puede construir una UI en `/dashboard/admin/users` con `requireRole('superadmin')` — reservando el rol `superadmin` exclusivamente para "puede administrar otros admins".

### 6. Rename: `/dashboard/notas` → `/dashboard/blog`

El nombre "notas" arrastraba de un modelo mental anterior donde los usuarios escribían notas personales. Con la decisión de que solo admins publican, "blog" describe mejor la intención — publicaciones editoriales, no notas.

Esto alinea:

- `/blog` (público, lectores) ↔ `/dashboard/blog` (admin, editor)
- `/foro` (público, lectores) ↔ `/foro/nuevo` (auth, autor)

## Consequences

### Positive

- Cero fricción para usuarios `user`: publican en el foro con 1 click.
- Blog mantiene identidad editorial (todas las publicaciones son del equipo).
- `isAdminRole` evita que aparezcan comparaciones de strings sueltas que se desalineen cuando cambie la lista de roles.
- Upgrade de rol se refleja inmediato (no depende de re-login).
- La redirección con `?error=admin_required` + banner en `/dashboard` da feedback explícito en vez de un 403 crudo.

### Negative

- Una query a `profiles` por cada request a ruta gated (mitigable con cache de sesión si se vuelve hotpath).
- No hay UI para escalar admins — si un admin no está disponible, los otros no pueden escalar a un tercero sin acceso al SQL Editor.
- `requireAdmin` solo funciona en server runtime; para componentes client que quieran condicional por rol, hay que pasar el flag via props o consumir `useAuth().isAdmin`.

### Risks

- **Role drift**: si se agrega un rol nuevo (p. ej. `moderator`) sin actualizar `isAdminRole`, las comparaciones se rompen en silencio. Mitigado porque todo pasa por el helper.
- **Escalación involuntaria**: un UPDATE masivo mal redactado en SQL Editor podría convertir a muchos en admin. Mitigado por la política interna (solo el mantenedor corre SQL de roles).

## Related Documents

- `ADR-007` — Referenciales UX (introdujo `requireProfessionalProfile`, el mismo patrón aplicado a rol profesional en vez de admin).
- `CLAUDE.md` — tabla de matriz de roles + comando SQL de escalación.
- `docs/architecture.md` — sección Auth con ejemplos de uso.
- `src/shared/lib/supabase/auth.ts` — implementación de los helpers.
- `src/app/dashboard/blog/**` — consumidor principal de `requireAdmin`.
