import { createClient } from '@/shared/lib/supabase/server'
import { prisma } from '@/shared/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * Genera un username único a partir del nombre completo o email del usuario.
 * Intenta hasta maxAttempts veces añadiendo sufijos aleatorios si hay colisión.
 */
async function generateUniqueUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fullName: string | null,
  email: string,
  maxAttempts = 5
): Promise<string> {
  const base = (fullName ?? email.split('@')[0])
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9]/g, '')       // solo alfanumérico
    .slice(0, 18) || 'usuario';

  for (let i = 0; i < maxAttempts; i++) {
    const suffix = Math.random().toString(36).slice(2, 6); // 4 chars aleatorios
    const candidate = i === 0 ? base : `${base}${suffix}`;
    if (candidate.length < 3) continue;

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (!data) return candidate; // libre
  }

  // Fallback garantizado con timestamp
  return `user${Date.now().toString(36).slice(-6)}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Upsert the INMOGRID profile row on first login
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // Flag para el flujo de onboarding: si el profile NO existía cuando
      // este callback corrió, es la primera vez del user en la plataforma y
      // lo mandamos a /perfil?welcome=1 (en vez del `next` que el cliente
      // pudo haber pedido). Sacrifica 1 click de "volver a donde estaba"
      // para ganar un onboarding claro — el usuario ve el formulario con
      // el banner de bienvenida y completa datos antes de volver al foro.
      const isFirstLogin = !existingProfile

      if (!existingProfile) {
        const username = await generateUniqueUsername(
          supabase,
          data.user.user_metadata?.full_name ?? null,
          data.user.email ?? 'usuario'
        )

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            full_name: data.user.user_metadata?.full_name ?? null,
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
          })

        if (insertError) {
          console.error('[AUTH-CALLBACK] Failed to create profile:', insertError.message)
          // Non-fatal: el user queda autenticado, igual sigue al redirect.
          // El banner de `/perfil` lo encontrará con username vacío y
          // mostrará el form igual; al refrescar aparece.
        }
      }

      // Notify login via n8n webhook. We must `await` this (with a short timeout)
      // instead of fire-and-forget, because Vercel serverless functions terminate
      // immediately after the response is sent — any pending I/O is cancelled.
      // The workflow typically completes in ~600ms, so the added login latency is
      // negligible; the 3s timeout ensures login never hangs if n8n is unreachable.
      const webhookUrl = process.env.N8N_LOGIN_WEBHOOK_URL
      if (webhookUrl) {
        const ac = new AbortController()
        const timeoutId = setTimeout(() => ac.abort(), 3000)
        try {
          const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userName: data.user.user_metadata?.full_name ?? data.user.email,
              userEmail: data.user.email,
              userImage: data.user.user_metadata?.avatar_url ?? '',
              userId: data.user.id,
              provider: data.user.app_metadata?.provider ?? 'unknown',
              timestamp: new Date().toISOString(),
            }),
            signal: ac.signal,
          })
          console.log('[AUTH-CALLBACK] n8n login webhook status:', res.status, 'user:', data.user.email)
        } catch (err) {
          console.error('[AUTH-CALLBACK] n8n login webhook failed:', err)
        } finally {
          clearTimeout(timeoutId)
        }
      } else {
        console.warn('[AUTH-CALLBACK] N8N_LOGIN_WEBHOOK_URL not set — skipping notification')
      }

      // Persistir el evento de login en audit_logs para que el usuario lo
      // pueda ver en /cuenta/seguridad. Capturamos IP (best-effort vía
      // headers de Vercel/Cloudflare) y user-agent para detección de
      // sesiones anómalas. Best-effort: si falla no rompemos el login.
      const xff = request.headers.get('x-forwarded-for')
      const ip = xff?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null
      const userAgent = request.headers.get('user-agent') ?? null

      try {
        await prisma.auditLog.create({
          data: {
            userId: data.user.id,
            action: 'auth.login',
            metadata: {
              provider: data.user.app_metadata?.provider ?? 'unknown',
              ip,
              userAgent,
              isFirstLogin,
            },
          },
        })
      } catch (auditError) {
        console.error('[AUTH-CALLBACK] audit log create failed:', auditError)
      }

      // Primer login → onboarding en /perfil con banner de bienvenida.
      // Logins subsecuentes respetan el `next` que venga del OAuth state
      // (típicamente la ruta donde el user estaba cuando clickeó el botón).
      const destination = isFirstLogin ? '/perfil?welcome=1' : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Code missing or exchange failed — send the user back with a descriptive error param
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
