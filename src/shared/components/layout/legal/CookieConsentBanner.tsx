'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Shield } from 'lucide-react';
import { Button } from '@/shared/components/ui/primitives/button';
import { useCookieConsent } from './CookieConsentProvider';
import { CookieCategoriesList } from './cookies/CookieCategoriesList';
import { CookieModalShell } from './cookies/CookieModalShell';
import { useCookiePreferencesState } from './cookies/useCookiePreferencesState';
import { ALL_ACCEPTED, DEFAULT_PREFERENCES } from './cookies/categories';

/**
 * Banner de primera visita — pide consentimiento con 3 atajos
 * (Aceptar todas / Solo esenciales / Configurar).
 * El botón Configurar abre un modal con el detalle por categoría.
 */
export default function CookieConsentBanner() {
  const { hasConsent, updatePreferences } = useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const { preferences, toggle } = useCookiePreferencesState(DEFAULT_PREFERENCES);

  useEffect(() => {
    setShowBanner(!hasConsent);
  }, [hasConsent]);

  const handleAcceptAll = () => {
    updatePreferences(ALL_ACCEPTED);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    updatePreferences(DEFAULT_PREFERENCES);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    updatePreferences(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner con estilo dark intencional (fondo slate/zinc sólido + acento
          primary amarillo). Independiente del tema del sitio — así el contraste
          queda predecible tanto en light como en dark mode del browser.
          Los botones outline usan borde + texto blanco explícitos en vez de
          foreground/30 (que desaparecía sobre dark). */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-neutral-950 border-t-2 border-primary text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-white">inmogrid.cl usa cookies</h3>
          </div>
          <p className="text-sm text-neutral-300 mb-4">
            Utilizamos cookies esenciales para el funcionamiento del sitio y cookies
            opcionales para análisis y mejoras. Puedes configurar tus preferencias o
            aceptar todas las cookies.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAcceptAll}
              className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-6"
            >
              Aceptar todas
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="px-6 bg-transparent border-white/40 text-white hover:bg-white/10 hover:border-white hover:text-white"
            >
              Solo esenciales
            </Button>
            <Button
              onClick={() => setShowPreferences(true)}
              variant="outline"
              className="px-6 bg-transparent border-white/40 text-white hover:bg-white/10 hover:border-white hover:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
          <p className="text-xs text-neutral-400 mt-3">
            Al usar este sitio, acepta nuestras{' '}
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Políticas de Privacidad
            </Link>{' '}
            conforme a la Ley 21.719 de Chile.
          </p>
        </div>
      </div>

      {showPreferences && (
        <CookieModalShell
          title="Configuración de Cookies"
          subtitle="Controla qué tipos de cookies permites."
          onClose={() => setShowPreferences(false)}
          footer={
            <>
              <div className="flex gap-3">
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 font-semibold"
                >
                  Guardar Preferencias
                </Button>
                <Button
                  onClick={() => setShowPreferences(false)}
                  variant="outline"
                  className="px-8 py-3 border-foreground/30 hover:bg-foreground/5"
                >
                  Cancelar
                </Button>
              </div>
              <p className="text-xs text-foreground/60 mt-3 text-center">
                Puede cambiar estas preferencias en cualquier momento desde el footer.
              </p>
            </>
          }
        >
          <CookieCategoriesList preferences={preferences} onToggle={toggle} />
        </CookieModalShell>
      )}
    </>
  );
}
