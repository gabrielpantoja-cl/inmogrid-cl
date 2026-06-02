'use client'

import { createClient } from '@/shared/lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

interface Profile {
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
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // createClient() debe vivir DENTRO del effect — si se llama en el cuerpo
    // del hook, corre durante el prerender de Next.js y tira si las env
    // vars NEXT_PUBLIC_SUPABASE_* no están inlined en el bundle (p.ej. en
    // Preview deployments donde a veces falta configurar el env).
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch (e) {
      console.error('[useAuth] No se pudo inicializar el cliente Supabase:', e)
      if (mounted) setIsLoading(false)
      return
    }

    // Helper: resuelve user + profile a partir de una sesión (o null) y apaga
    // el loader. Se usa tanto en el bootstrap inicial como en cambios de auth.
    const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!mounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
          if (mounted) setProfile(data ?? null)
        } catch {
          if (mounted) setProfile(null)
        }
      } else {
        setProfile(null)
      }

      if (mounted) setIsLoading(false)
    }

    // 1. Bootstrap inmediato con getSession(). No confiamos solo en
    //    onAuthStateChange porque su evento INITIAL_SESSION no dispara
    //    confiablemente en algunos escenarios (tabs múltiples, hydration
    //    con storage stale). Sin esto, el skeleton se queda colgado.
    supabase.auth.getSession().then(({ data }) => applySession(data.session))

    // 2. Red de seguridad: si nada resuelve en 3s asumimos sin sesión y
    //    apagamos el loader. Mejor un botón de login que un skeleton
    //    infinito si hay un bug del SDK o problemas de red.
    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoading(false)
    }, 3000)

    // 3. Suscripción a cambios futuros (login/logout/refresh en otra tab).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session)
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    // Dos decisiones de diseño críticas en este handler:
    //
    // 1. `scope: 'local'` limpia las cookies de sesión del browser sin hacer
    //    un request HTTP a /auth/v1/logout. El scope 'global' (default del
    //    SDK) puede colgarse indefinidamente si la API de Supabase está
    //    lenta o si la sesión ya es inválida — ya nos pasó.
    //
    // 2. Aún con `scope: 'local'`, el SDK de Supabase hace internamente
    //    flushing de localStorage + cookies + refresh token cleanup, y en
    //    algunos edge cases (sesiones stale, storage corrupto, SDK versions
    //    viejas) eso puede tardar varios segundos o colgarse. Por eso
    //    hacemos un `Promise.race` contra un timeout de 500 ms: si el SDK
    //    no resuelve en ese plazo, forzamos la navegación igual. Las
    //    cookies que hayan quedado stale las limpia el middleware al
    //    siguiente request (ver `middleware.ts` — branch "orphan cookie
    //    cleanup"), así que no hay riesgo de dejar al cliente con sesión
    //    fantasma.
    //
    // 3. Redirigimos a `/` (landing pública) en vez de `/auth/login` porque
    //    el patrón del producto es Reddit-style: el feed es visible sin
    //    autenticación y el botón "Iniciar sesión con Google" vive en el
    //    PublicHeader. Mandar al usuario a /auth/login después de cerrar
    //    sesión es un salto innecesario.
    //
    // 4. `window.location.href` fuerza un full page reload — a diferencia
    //    de router.push (soft nav), garantiza que el middleware corre con
    //    el estado de cookies limpio y que ningún componente del dashboard
    //    queda montado con sesión stale.
    const SIGNOUT_TIMEOUT_MS = 500

    try {
      // createClient() acá puede tirar si las env vars faltan — pero
      // signOut solo se dispara desde event handlers del client, ya
      // montado, donde las vars deberían estar inlined. Si no lo están,
      // redirigimos igual y que el middleware limpie las cookies.
      const supabase = createClient()
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise<void>((resolve) => setTimeout(resolve, SIGNOUT_TIMEOUT_MS)),
      ])
    } catch (error) {
      console.error('[useAuth.signOut] Error signing out:', error)
    }

    window.location.href = '/'
  }

  // Derived permission helpers based on the profile role
  const role = profile?.role ?? 'user'
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isSuperAdmin = role === 'superadmin'
  const isAuthenticated = user !== null

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    role,
    isAdmin,
    isSuperAdmin,
    signOut,
  }
}
