'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import { useCookieConsent } from './CookieConsentProvider';

export function ConditionalGoogleAnalytics() {
  const { preferences } = useCookieConsent();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Solo renderizar GA si se ha dado consentimiento, existe GA_ID y es producción
  if (!preferences?.analytics || !gaId || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return <GoogleAnalytics gaId={gaId} />;
}

export function ConditionalVercelAnalytics() {
  // Deshabilitado para deployment en VPS (no Vercel)
  // Solo usar en producción si está deployado en Vercel
  return null;

  /* const { preferences } = useCookieConsent();

  // Solo cargar si el usuario consintió cookies de rendimiento
  if (!preferences?.performance) {
    return null;
  }

  return <Analytics />; */
}

export function ConditionalSpeedInsights() {
  // Deshabilitado para deployment en VPS (no Vercel)
  // Solo usar en producción si está deployado en Vercel
  return null;

  /* const { preferences } = useCookieConsent();

  if (!preferences?.performance) {
    return null;
  }

  return <SpeedInsights />; */
}