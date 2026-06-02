import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'

// Rutas completamente públicas — no requieren sesión
const PUBLIC_PATHS = [
  '/auth/',
  '/api/auth/',
  '/api/public/',
  '/api/v1/',
  // '/api/sofia/' removido — la ruta está físicamente bajo
  // `api/_sofia-disabled/` (underscore prefix = no expuesta por Next routing).
  // Cuando se reactive, restaurar esta entrada junto con el rename.
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/privacy',
  '/terms',
]

// La protección por ruta vive en cada page.tsx usando los helpers
// `requireAuth()` / `requireAdmin()` / `requireProfessionalProfile()` de
// `src/shared/lib/supabase/auth.ts`. El middleware corre en edge runtime
// y no tiene acceso a Prisma, por eso los checks de rol no pueden vivir acá.
// Ver ADR-008 (role-based access) y architecture.md §Protección de rutas.
const PROTECTED_PATHS: string[] = []

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pasar Supabase SSR (refresca sesión en cada request)
  const { supabaseResponse, user } = await updateSession(request)

  // Rutas públicas: pasar directo
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return supabaseResponse
  }

  // Rutas protegidas: redirigir a login si no hay sesión
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path)) && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
