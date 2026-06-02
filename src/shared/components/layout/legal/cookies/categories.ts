import { Shield, BarChart3, Zap, Settings as SettingsIcon } from 'lucide-react';
import type { CookiePreferences } from '../CookieConsentProvider';

export type CookieCategoryKey = keyof CookiePreferences;

export interface CookieCategoryMeta {
  key: CookieCategoryKey;
  title: string;
  /** Si es true, la categoría no puede desactivarse (esenciales). */
  alwaysActive?: boolean;
  icon: React.ElementType;
  /** Color Tailwind para el icono y toggle activo. */
  accentColor: 'green' | 'blue' | 'yellow' | 'purple';
  description: string;
  /** Metadata adicional opcional para mostrar en el modal extenso. */
  details?: string[];
}

export const COOKIE_CATEGORIES: CookieCategoryMeta[] = [
  {
    key: 'essential',
    title: 'Cookies Esenciales',
    alwaysActive: true,
    icon: Shield,
    accentColor: 'green',
    description:
      'Necesarias para autenticación, seguridad y funciones básicas. Incluye cookies de sesión.',
    details: ['Cookies: next-auth.session-token, CSRF tokens'],
  },
  {
    key: 'analytics',
    title: 'Cookies Analíticas',
    icon: BarChart3,
    accentColor: 'blue',
    description:
      'Google Analytics 4 para entender cómo se usa el sitio y mejorar la experiencia del usuario.',
    details: [
      'Cookies: _ga, _ga_*, _gid',
      'Duración: hasta 2 años',
      'Proveedor: Google LLC',
    ],
  },
  {
    key: 'performance',
    title: 'Cookies de Rendimiento',
    icon: Zap,
    accentColor: 'yellow',
    description:
      'Vercel Analytics y Speed Insights para optimizar la velocidad y Core Web Vitals.',
    details: ['Duración: 30 días', 'Proveedor: Vercel Inc.', 'No incluye información personal'],
  },
  {
    key: 'functional',
    title: 'Cookies Funcionales',
    icon: SettingsIcon,
    accentColor: 'purple',
    description:
      'Recuerdan preferencias de UI como tema, idioma y configuraciones personalizadas.',
    details: ['Duración: 1 año', 'Almacenamiento: local del navegador'],
  },
];

/** Preferencias por defecto — solo esenciales activas. */
export const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  performance: false,
  functional: false,
};

/** Preferencias con todas las categorías activas. */
export const ALL_ACCEPTED: CookiePreferences = {
  essential: true,
  analytics: true,
  performance: true,
  functional: true,
};
