'use client';

import { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

/**
 * Hook que combina `useAuth` y el estado presentacional necesario para
 * renderizar `AccountMenu` (dropdown del navbar / PublicHeader).
 *
 * Diseñado para ser el **único** punto de acoplamiento entre la lógica de
 * sesión y los componentes presentacionales del menú de cuenta. Lo
 * consume el `PublicHeader` de las rutas públicas — garantiza estado
 * consistente (transiciones, signOut) en todo el sitio.
 *
 * **No incluye lógica de eliminar cuenta**. Esa acción destructiva vive
 * solo en `/perfil` vía el componente `DangerZone` del feature `profiles`,
 * protegida por un flujo de confirmación GitHub-style que obliga a
 * escribir el email del usuario. Poner la eliminación en un dropdown
 * global sería demasiado fácil de disparar por accidente.
 */
export function useAccountActions() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setIsUserMenuOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('[useAccountActions] SignOut failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const displayName = profile?.full_name ?? user?.email;
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url;

  return {
    user,
    profile,
    displayName,
    avatarUrl,
    isAdmin,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isUserMenuOpen,
    setIsUserMenuOpen,
    isSigningOut,
    handleSignOut,
    closeAllMenus,
  };
}
