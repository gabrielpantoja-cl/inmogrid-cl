'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bars3Icon,
  XMarkIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import {
  AccountMenu,
  useAccountActions,
} from '@/shared/components/layout/common/account-menu';
import { UfWidget } from '@/shared/components/layout/common/UfWidget';
import { useAuth } from '@/shared/hooks/useAuth';
import { createClient } from '@/shared/lib/supabase/client';
import { SearchBar } from './SearchBar';
import { LeftSidebar } from './LeftSidebar';

export function TopBar() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const actions = useAccountActions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [publishMenuOpen, setPublishMenuOpen] = useState(false);
  const publishMenuRef = useRef<HTMLDivElement | null>(null);

  // Cerrar el dropdown al hacer click fuera o presionar Escape.
  useEffect(() => {
    if (!publishMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        publishMenuRef.current &&
        !publishMenuRef.current.contains(e.target as Node)
      ) {
        setPublishMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPublishMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [publishMenuOpen]);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-3 md:gap-6 px-3 md:px-6 h-14">
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen(true)}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          <Link
            href="/"
            className="text-xl font-black tracking-tight text-gray-900 shrink-0"
          >
            inmo<span className="text-primary">grid</span>
          </Link>

          {/* Search oculto en mobile — el flex-1 empujaba el avatar /
              botón de login fuera del viewport. En <sm el search vive
              dentro del drawer lateral (ver abajo); en >=sm ocupa el
              centro del header como siempre. */}
          <div className="flex-1 hidden sm:flex justify-center min-w-0">
            <SearchBar />
          </div>
          <div className="flex-1 sm:hidden" aria-hidden />


          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <UfWidget />

            {isAuthenticated && !isAdmin && (
              <Link
                href="/foro/nuevo"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Publicar
              </Link>
            )}

            {isAuthenticated && isAdmin && (
              <div className="relative hidden sm:block" ref={publishMenuRef}>
                <button
                  type="button"
                  onClick={() => setPublishMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={publishMenuOpen}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Publicar
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                </button>

                {publishMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50"
                  >
                    <Link
                      href="/foro/nuevo"
                      role="menuitem"
                      onClick={() => setPublishMenuOpen(false)}
                      className="flex items-start gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                      <div>
                        <div className="font-medium">Hilo en el foro</div>
                        <div className="text-xs text-gray-500">
                          Pregunta o debate con la comunidad
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/admin/blog/nuevo"
                      role="menuitem"
                      onClick={() => setPublishMenuOpen(false)}
                      className="flex items-start gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                    >
                      <DocumentTextIcon className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                      <div>
                        <div className="font-medium">Post en el blog</div>
                        <div className="text-xs text-gray-500">
                          Artículo editorial (solo admin)
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {authLoading ? (
              <div
                className="h-8 w-20 rounded-full bg-gray-100 animate-pulse"
                aria-hidden="true"
              />
            ) : isAuthenticated ? (
              <>
                <AccountMenu
                  avatarUrl={actions.avatarUrl}
                  username={actions.profile?.username}
                  isAdmin={actions.isAdmin}
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
                className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 px-3 md:px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="text-lg font-black tracking-tight text-gray-900"
              >
                inmo<span className="text-primary">grid</span>
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100"
                aria-label="Cerrar menú"
                onClick={() => setDrawerOpen(false)}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            {/* SearchBar dentro del drawer porque en el header del mobile
                el input se removió para priorizar hamburger + logo + avatar
                en 375px. Tap en un hilo ciérralo via `onNavigate`. */}
            <div className="p-3 border-b border-gray-200">
              <SearchBar />
            </div>
            <div className="flex-1 overflow-y-auto">
              <LeftSidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {actions.isUserMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-transparent"
          onClick={actions.closeAllMenus}
          aria-label="Cerrar menú"
        />
      )}
    </>
  );
}
