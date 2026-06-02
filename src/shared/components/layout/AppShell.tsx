import type { ReactNode } from 'react';
import { TopBar } from '@/shared/components/layout/public/TopBar';
import { LeftSidebar } from '@/shared/components/layout/public/LeftSidebar';

/**
 * Shell estilo Reddit — TopBar sticky + sidebar izquierdo sticky en desktop
 * (drawer en mobile) + main content. Unificado entre rutas públicas y
 * autenticadas para que la experiencia de navegación sea consistente al
 * iniciar sesión (no cambia el chrome, solo el contenido).
 *
 * El `LeftSidebar` se adapta solo al estado de autenticación — no hay que
 * pasarle props de rol; consume `useAuth` internamente.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden md:block w-60 shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-100">
          <LeftSidebar />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
