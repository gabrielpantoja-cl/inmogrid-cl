import React from 'react';
import './globals.css';
import { Poppins } from 'next/font/google';
import { Metadata, Viewport } from 'next';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});
import { Toaster } from 'react-hot-toast';
import { CookieConsentProvider } from '@/shared/components/layout/legal/CookieConsentProvider';
import CookieConsentBanner from '@/shared/components/layout/legal/CookieConsentBanner';
import {
  ConditionalGoogleAnalytics,
  ConditionalVercelAnalytics,
  ConditionalSpeedInsights
} from '@/shared/components/layout/legal/ConditionalAnalytics';
// Footer removido 2026-04-24 — inmogrid.cl pasa a modelo feed-style
// (Reddit/Twitter) sin chrome inferior. Las páginas legales son
// accesibles desde el sidebar izquierdo (Privacidad · Términos al fondo)
// y desde el LoginCard en /auth/login. El componente Footer.tsx se
// conserva por si una ruta futura lo necesita específico.
import VersionChecker from '@/shared/components/VersionChecker';
import { organizationJsonLd, websiteJsonLd } from '@/shared/lib/seo/jsonld';

// Configuración del Viewport
// No limitamos zoom (userScalable) para cumplir WCAG 2.1 SC 1.4.4 y no
// penalizar Lighthouse accessibility score — Google usa esto como señal de UX.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

// Configuración de Metadatos (SEO, Social Sharing, etc.)
export const metadata: Metadata = {
  title: {
    template: '%s | inmogrid.cl',
    default: 'inmogrid.cl — Conocimiento abierto para la comunidad inmobiliaria chilena',
  },
  description: 'Ecosistema digital abierto y colaborativo para la comunidad inmobiliaria chilena. Un espacio libre para tasadores, peritos, corredores de propiedades, abogados inmobiliarios, arquitectos y administradores donde publicar, compartir conocimiento y conectar.',
  metadataBase: new URL('https://inmogrid.cl'),
  applicationName: 'inmogrid.cl',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'inmogrid.cl',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  authors: [{ name: 'inmogrid.cl', url: 'https://inmogrid.cl' }],
  creator: 'inmogrid.cl',
  publisher: 'inmogrid.cl',
  keywords: ['comunidad inmobiliaria', 'sector inmobiliario chile', 'tasadores', 'peritos judiciales', 'corredores de propiedades', 'abogados inmobiliarios', 'arquitectos', 'administradores de propiedad', 'datos abiertos', 'código abierto', 'open source', 'referenciales', 'CBR', 'conservador de bienes raíces'],
  // Nota: el favicon principal vive en `src/app/icon.png` y Next.js 15 lo
  // inyecta automaticamente vía file-based metadata conventions. Las entries
  // de abajo son solo para los tamaños mayores (PWA launcher icons) y Apple
  // touch icon, que no siguen la convención de ruta.
  icons: {
    icon: [
      { url: '/images/android/android-launchericon-512-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/images/android/android-launchericon-192-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/images/ios/180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'inmogrid.cl — Conocimiento abierto para la comunidad inmobiliaria chilena',
    description: 'Ecosistema digital abierto y colaborativo para tasadores, peritos, corredores, abogados inmobiliarios, arquitectos y otros profesionales del rubro inmobiliario en Chile.',
    url: 'https://inmogrid.cl',
    siteName: 'inmogrid.cl',
    locale: 'es_CL',
    type: 'website',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'inmogrid.cl — Comunidad inmobiliaria abierta de Chile',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'inmogrid.cl — Conocimiento abierto para la comunidad inmobiliaria chilena',
    description: 'Ecosistema digital abierto y colaborativo para tasadores, peritos, corredores, abogados inmobiliarios, arquitectos y otros profesionales del rubro inmobiliario en Chile.',
    images: ['/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://inmogrid.cl',
  },
  // Google Search Console: el token se inyecta vía variable de entorno
  // `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (opcional) para no hardcodearlo.
  // Obtenerlo en https://search.google.com/search-console → Add property → HTML tag.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: 'real estate',
};

// Componente RootLayout Principal
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning={true} className={poppins.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* JSON-LD: Organization + WebSite (presente en todas las páginas) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        {/* Google Analytics Consent Mode Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                functionality_storage: 'denied',
                personalization_storage: 'denied',
                security_storage: 'granted',
                wait_for_update: 500,
              });
            `
          }}
        />
      </head>
      <body className={`antialiased ${poppins.className}`}>
        <CookieConsentProvider>
          {children}

          {/* Componente para mostrar notificaciones (react-hot-toast) */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#22c55e',
                },
              },
              error: {
                duration: 3000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />

          {/* Analytics condicionales - Solo se cargan con consentimiento */}
          <ConditionalGoogleAnalytics />
          <ConditionalVercelAnalytics />
          <ConditionalSpeedInsights />

          {/* Banner de consentimiento de cookies */}
          <CookieConsentBanner />

          {/* Detecta deploys nuevos y prompt de reload — ver VersionChecker.tsx */}
          <VersionChecker />

        </CookieConsentProvider>
      </body>
    </html>
  );
}
