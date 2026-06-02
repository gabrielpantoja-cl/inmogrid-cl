import { createClient } from '@/shared/lib/supabase/server'

/**
 * Returns the current authenticated Supabase user (server-side).
 * Use this in Server Components and API routes.
 */
export const auth = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
