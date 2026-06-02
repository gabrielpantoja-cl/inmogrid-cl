/**
 * Server-side Supabase Auth helpers for Server Components and Route Handlers.
 *
 * Usage:
 *   import { requireAuth, getUser, getProfile } from '@/shared/lib/supabase/auth'
 *
 * - getUser()            → returns the authenticated User or null (no redirect)
 * - getProfile(userId)   → fetches the profiles row for a given user id
 * - requireAuth()        → returns the User or redirects to /auth/login
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/server'
import { type User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InmogridProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: string
  bio: string | null
  website: string | null
  linkedin: string | null
  profession: string | null
  company: string | null
  phone: string | null
  region: string | null
  commune: string | null
  is_public_profile: boolean
  created_at: string
  updated_at: string
}

/**
 * Mínimo que considera "perfil profesional completo" para las vistas
 * premium. Hoy basta con tener `profession` seteado (el enum ProfessionType
 * cubre los roles relevantes: TASADOR_PERITO, PERITO_JUDICIAL,
 * CORREDOR_PROPIEDADES, etc). Cuando se construya la UI de ProfessionalProfile
 * esto podrá endurecerse exigiendo specialty[] y yearsExperience.
 */
export function isProfessionalProfileComplete(
  profile: Pick<InmogridProfile, 'profession'> | null | undefined
): boolean {
  return !!profile?.profession
}

/**
 * Normaliza el chequeo de rol admin. `admin` y `superadmin` se consideran
 * ambos admin; `user` y cualquier otro valor no. Single source of truth —
 * usar SIEMPRE este helper en vez de comparar strings sueltas.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the currently authenticated Supabase user, or null if there is no
 * active session. Safe to call from Server Components and Route Handlers.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Fetches a single profiles row by user id.
 * Returns null if the profile does not exist.
 */
export async function getProfile(userId: string): Promise<InmogridProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

/**
 * Enforces authentication for a Server Component or Route Handler.
 * Redirects the user to /auth/login if there is no active session,
 * otherwise returns the authenticated User object.
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

/**
 * Requiere sesión activa + rol admin (o superadmin). Usar solo en Server
 * Components y Route Handlers (ejecuta en Node runtime, no en edge).
 *
 * Flujo:
 *   - Sin sesión           → redirect a /auth/login (heredado de requireAuth)
 *   - Sin rol admin        → redirect a /?error=admin_required
 *                            (la UI renderiza un banner al ver ese flag)
 *   - Sesión + admin       → retorna { user, profile }
 *
 * Usado por `/admin/blog/*` (gestión del blog) y por los handlers de
 * `/api/posts/*`.
 */
export async function requireAdmin(): Promise<{
  user: User
  profile: InmogridProfile
}> {
  const user = await requireAuth()
  const profile = await getProfile(user.id)
  if (!profile || !isAdminRole(profile.role)) {
    redirect('/?error=admin_required')
  }
  return { user, profile }
}

/**
 * Requiere sesión activa + un perfil profesional completo. Usar solo en
 * Server Components (ejecuta en Node runtime, no en edge).
 *
 * Flujo:
 *   - Sin sesión           → redirect a /auth/login
 *   - Sin perfil profesional completo → redirect a /perfil con
 *     ?complete=professional para que la UI muestre un banner.
 *   - Sesión + profesional → retorna { user, profile }.
 */
export async function requireProfessionalProfile(): Promise<{
  user: User
  profile: InmogridProfile
}> {
  const user = await requireAuth()
  const profile = await getProfile(user.id)
  if (!profile || !isProfessionalProfileComplete(profile)) {
    redirect('/perfil?complete=professional')
  }
  return { user, profile }
}
