'use client';

import { useEffect, useState } from 'react';
import type { CookiePreferences } from '../CookieConsentProvider';
import { DEFAULT_PREFERENCES } from './categories';

/**
 * Estado local de preferencias de cookies. Sincroniza con las preferencias
 * iniciales que vengan del contexto y expone un helper `toggle` tipado.
 */
export function useCookiePreferencesState(initial?: CookiePreferences | null) {
  const [preferences, setPreferences] = useState<CookiePreferences>(
    initial ?? DEFAULT_PREFERENCES
  );

  useEffect(() => {
    if (initial) setPreferences(initial);
  }, [initial]);

  const toggle = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return { preferences, setPreferences, toggle };
}
