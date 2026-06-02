import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — DO NOT remove this
  const { data: { user } } = await supabase.auth.getUser()

  // Detectar cookies huérfanas: hay un JWT firmado válido en el browser
  // pero Supabase reporta que el user no existe (típicamente porque fue
  // borrado manualmente desde `auth.users` o desde el dashboard de
  // Supabase). Sin este branch, el cliente seguiría viendo el email
  // cacheado del JWT vía `useAuth()` mientras el server sabe que está
  // deslogueado → UI desincronizada indefinidamente.
  //
  // **No chequeamos `error`** porque en algunos casos el SDK retorna
  // `{user: null, error: null}` — el JWT decodifica OK localmente pero la
  // validación contra Supabase falla silenciosamente. La heurística
  // robusta es: "hay cookies de Supabase Auth + `getUser()` retornó
  // null → limpiar".
  //
  // `signOut({ scope: 'local' })` no hace HTTP a /auth/v1/logout: solo
  // emite Set-Cookie de expiración para los tokens de Supabase. El
  // adaptador de cookies de arriba propaga el Set-Cookie a
  // `supabaseResponse`, así que al siguiente request el cliente ya no
  // envía las cookies stale.
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  if (!user && hasSupabaseAuthCookie) {
    await supabase.auth.signOut({ scope: 'local' })
  }

  return { supabaseResponse, user }
}
