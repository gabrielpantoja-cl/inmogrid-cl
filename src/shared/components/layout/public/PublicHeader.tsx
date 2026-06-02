'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  AccountMenu,
  useAccountActions,
} from '@/shared/components/layout/common/account-menu';
import { NotificationBell } from '@/shared/components/forum/NotificationBell';
import { useAuth } from '@/shared/hooks/useAuth';
import { createClient } from '@/shared/lib/supabase/client';

interface PublicNavLink {
  href: string;
  label: string;
  comingSoon?: boolean;
}

// Mismo orden que LeftSidebar: Foro / Blog / Eventos / Mapa / Directorio.
const PUBLIC_NAV: PublicNavLink[] = [
  { href: '/', label: 'Foro' },
  { href: '/blog', label: 'Blog' },
  { href: '/eventos', label: 'Eventos', comingSoon: true },
  { href: '/referenciales', label: 'Mapa' },
  { href: '/directorio', label: 'Directorio' },
  // Sofia — desactivada (ver comentario en LeftSidebar).
  // { href: '/sofia', label: 'Sofía' },
];

/**
 * Header sticky para todas las rutas públicas. Provee nav de pilares
 * del ecosistema, login/logout y menú de cuenta. Se monta una sola vez
 * desde `src/app/(public)/layout.tsx`.
 */
export function PublicHeader() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const actions = useAccountActions();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 md:px-8">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/"
              className="text-xl font-black tracking-tight text-gray-900 shrink-0"
              onClick={() => setMobileOpen(false)}
            >
              inmo<span className="text-primary">grid</span>
            </Link>

            <ul className="hidden md:flex items-center gap-5">
              {PUBLIC_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                    {link.comingSoon && (
                      <span
                        aria-label="próximamente"
                        className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1 py-0.5 rounded align-middle"
                      >
                        Pronto
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <div
                className="h-8 w-24 rounded-full bg-gray-100 animate-pulse"
                aria-hidden="true"
              />
            ) : isAuthenticated ? (
              <>
                <div className="hidden lg:block text-sm text-gray-600">
                  Hola,{' '}
                  <span className="font-medium text-gray-900">
                    {actions.displayName}
                  </span>
                </div>
                <NotificationBell />
                <AccountMenu
                  avatarUrl={actions.avatarUrl}
                  username={actions.profile?.username}
                  isOpen={actions.isUserMenuOpen}
                  isSigningOut={actions.isSigningOut}
                  onToggle={() =>
                    actions.setIsUserMenuOpen(!actions.isUserMenuOpen)
                  }
                  onSignOut={actions.handleSignOut}
                  onCloseDropdown={() => actions.setIsUserMenuOpen(false)}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
              >
                Iniciar sesión
              </button>
            )}

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <ul className="max-w-6xl mx-auto py-2">
              {PUBLIC_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-2 py-3 rounded-lg text-base font-medium ${
                      isActive(link.href)
                        ? 'bg-primary/10 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.comingSoon && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Pronto
                      </span>
                    )}
                  </Link>
                </li>
              ))}

              {!isAuthenticated && !authLoading && (
                <li className="border-t border-gray-200 mt-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      handleGoogleSignIn();
                    }}
                    className="w-full rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors"
                  >
                    Iniciar sesión con Google
                  </button>
                </li>
              )}

              {isAuthenticated && (
                <li className="border-t border-gray-200 mt-2 pt-2">
                  <Link
                    href="/perfil"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center px-2 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Editar mi perfil
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </nav>

      {actions.isUserMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-transparent"
          onClick={actions.closeAllMenus}
          onKeyDown={(e) => {
            if (e.key === 'Escape') actions.closeAllMenus();
          }}
          aria-label="Cerrar menú"
        />
      )}
    </>
  );
}
