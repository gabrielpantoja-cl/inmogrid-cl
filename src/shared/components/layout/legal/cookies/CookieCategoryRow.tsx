'use client';

import type { CookieCategoryMeta } from './categories';
import type { CookiePreferences } from '../CookieConsentProvider';

interface Props {
  category: CookieCategoryMeta;
  preferences: CookiePreferences;
  onChange: (key: keyof CookiePreferences, value: boolean) => void;
  /** Si true, muestra la lista `details` debajo de la descripción. */
  showDetails?: boolean;
}

const ACCENT_STYLES: Record<
  CookieCategoryMeta['accentColor'],
  { border: string; bg: string; iconBg: string; iconColor: string; toggle: string }
> = {
  green: {
    border: 'border-2 border-green-200',
    bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
    iconBg: 'bg-white shadow-sm',
    iconColor: 'text-green-600',
    toggle: 'peer-checked:bg-green-600',
  },
  blue: {
    border: 'border border-gray-200',
    bg: 'bg-white',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    toggle: 'peer-checked:bg-primary',
  },
  yellow: {
    border: 'border border-gray-200',
    bg: 'bg-white',
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    toggle: 'peer-checked:bg-yellow-500',
  },
  purple: {
    border: 'border border-gray-200',
    bg: 'bg-white',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    toggle: 'peer-checked:bg-purple-600',
  },
};

export function CookieCategoryRow({ category, preferences, onChange, showDetails }: Props) {
  const Icon = category.icon;
  const isEnabled = preferences[category.key];
  const styles = ACCENT_STYLES[category.accentColor];
  const toggleId = `cookie-toggle-${category.key}`;

  return (
    <div className={`${styles.border} ${styles.bg} rounded-xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{category.title}</h3>
              {category.alwaysActive && (
                <span className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-medium">
                  Siempre activas
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{category.description}</p>
          {showDetails && category.details && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {category.details.map((d) => (
                <p key={d} className="text-xs text-gray-600">
                  {d}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="ml-4 flex flex-col items-center">
          {category.alwaysActive ? (
            <>
              <div className="w-14 h-7 bg-green-500 rounded-full flex items-center justify-end px-1 shadow-inner">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </div>
              <span className="text-xs text-green-700 mt-1 font-medium">Activado</span>
            </>
          ) : (
            <>
              <label className="relative inline-flex items-center cursor-pointer" htmlFor={toggleId}>
                <span className="sr-only">Activar {category.title}</span>
                <input
                  id={toggleId}
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => onChange(category.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-14 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner ${styles.toggle}`}
                />
              </label>
              <span
                className={`text-xs mt-1 font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {isEnabled ? 'Activado' : 'Desactivado'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
