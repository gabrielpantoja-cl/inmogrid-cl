import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

/**
 * POST /api/auth/sign-out-global
 *
 * Invalida todos los refresh tokens del usuario en Supabase Auth (server-side
 * revocation) — `scope: 'global'` es la única manera de cerrar sesión también
 * en otros dispositivos donde el JWT pueda haber sido copiado o donde el
 * usuario esté logueado simultáneamente (otro browser, móvil, etc).
 *
 * Diferencia con `signOut({ scope: 'local' })` del cliente (useAuth.signOut):
 *
 *  - local  → solo limpia cookies del browser actual. NO revoca el refresh
 *             token en el server. Si la cookie estaba copiada, sigue funcional.
 *  - global → llama a /auth/v1/logout del Supabase Auth API y revoca el
 *             refresh token. Todas las sesiones (incluida la actual) quedan
 *             invalidadas en el siguiente intento de refresh.
 *
 * Después de un sign-out global, el frontend debe redirigir a `/` y dejar
 * que el middleware limpie las cookies stale (branch "orphan cookie cleanup"
 * en `src/shared/lib/supabase/middleware.ts`).
 */
export async function POST() {
  const supabase = await createClient();

  // Auth check — si no hay sesión, no hay nada que invalidar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // `scope: 'global'` revoca todos los refresh tokens del usuario en
  // Supabase. El SDK también limpia las cookies del browser actual via
  // el cookies adapter de createClient() (server.ts).
  const { error } = await supabase.auth.signOut({ scope: 'global' });

  if (error) {
    console.error('[sign-out-global] Supabase error:', error.message);
    return NextResponse.json(
      { error: 'Error al cerrar sesiones', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
