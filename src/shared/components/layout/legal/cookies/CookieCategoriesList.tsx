'use client';

import { COOKIE_CATEGORIES } from './categories';
import { CookieCategoryRow } from './CookieCategoryRow';
import type { CookiePreferences } from '../CookieConsentProvider';

interface Props {
  preferences: CookiePreferences;
  onToggle: (key: keyof CookiePreferences, value: boolean) => void;
  showDetails?: boolean;
}

/**
 * Lista completa de categorías de cookies con sus toggles. Compartida entre
 * CookieConsentBanner (vista "Configurar") y CookiePreferencesModal (centro
 * de privacidad completo del footer).
 */
export function CookieCategoriesList({ preferences, onToggle, showDetails }: Props) {
  return (
    <div className="space-y-4">
      {COOKIE_CATEGORIES.map((category) => (
        <CookieCategoryRow
          key={category.key}
          category={category}
          preferences={preferences}
          onChange={onToggle}
          showDetails={showDetails}
        />
      ))}
    </div>
  );
}
