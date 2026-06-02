import type { ReactNode } from 'react';
import { AppShell } from '@/shared/components/layout/AppShell';

/**
 * Layout del route group `(public)`. Consume el shell compartido
 * `AppShell` para mantener la misma navegación (TopBar + sidebar izquierdo)
 * entre rutas públicas y autenticadas.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
