'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/primitives/button';
import { useCookieConsent } from './CookieConsentProvider';
import { CookieCategoriesList } from './cookies/CookieCategoriesList';
import { CookieModalShell } from './cookies/CookieModalShell';
import { useCookiePreferencesState } from './cookies/useCookiePreferencesState';
import { DEFAULT_PREFERENCES } from './cookies/categories';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Centro de privacidad completo — accesible desde el Footer.
 * Reutiliza `CookieModalShell` y `CookieCategoriesList` para el render;
 * añade resumen de estado actual, acción de reset y botón "ver política".
 */
export default function CookiePreferencesModal({ isOpen, onClose }: CookiePreferencesModalProps) {
  const { preferences: savedPrefs, updatePreferences } = useCookieConsent();
  const { preferences, setPreferences, toggle } = useCookiePreferencesState(savedPrefs);

  if (!isOpen) return null;

  const handleSave = () => {
    updatePreferences(preferences);
    onClose();
  };

  const handleClearAllCookies = () => {
    updatePreferences(DEFAULT_PREFERENCES);
    setPreferences(DEFAULT_PREFERENCES);
    window.location.reload();
  };

  const categoryLabels: Record<string, string> = {
    essential: 'Esenciales',
    analytics: 'Analíticas',
    performance: 'Rendimiento',
    functional: 'Funcionales',
  };

  return (
    <CookieModalShell
      title="Centro de Privacidad"
      subtitle="Gestiona tus preferencias de cookies y privacidad"
      onClose={onClose}
      maxWidth="max-w-4xl"
      footer={
        <>
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-white py-3 font-semibold"
            >
              Guardar Preferencias
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8 py-3 border-gray-300 hover:bg-gray-100"
            >
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Al usar este sitio web, acepta nuestro uso de cookies según se describe en
            esta política. Conforme a la Ley 21.719 de Chile.
          </p>
        </>
      }
    >
      {/* Resumen de estado actual */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Estado Actual de Cookies</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(preferences).map(([key, enabled]) => (
            <span
              key={key}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {categoryLabels[key] ?? key} {enabled ? '✓' : '✗'}
            </span>
          ))}
        </div>
      </div>

      <CookieCategoriesList preferences={preferences} onToggle={toggle} showDetails />

      {/* Acciones avanzadas */}
      <div className="border-t pt-6 mt-6">
        <h3 className="font-semibold mb-4">Acciones Avanzadas</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleClearAllCookies}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Todas las Cookies
          </Button>
          <Button onClick={() => window.open('/privacy', '_blank')} variant="outline">
            Ver Política Completa
          </Button>
        </div>
      </div>
    </CookieModalShell>
  );
}
