/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================
  // PRODUCTION CONFIGURATION
  // ============================================

  // Configuración de imágenes para optimización
  images: {
    // Permitir optimización de imágenes locales y externas
    domains: [
      'localhost',
      'inmogrid.cl',
      'www.inmogrid.cl',
      'vercel.app',
      'lh3.googleusercontent.com',  // Para avatares de Google
      'avatars.githubusercontent.com', // Para avatares de GitHub (futuro)
    ],
    // Patrones remotos para mayor flexibilidad
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.tile.openstreetmap.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vercel.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'inmogrid.cl',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.inmogrid.cl',
        port: '',
        pathname: '/covers/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
    // Formatos soportados para optimización
    formats: ['image/webp', 'image/avif'],
    // Configuraciones adicionales para desarrollo
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Configuración de tamaños de imagen
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configuración de Headers para CSP y Cache Control
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com https://vercel.live;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://*.googleusercontent.com https://*.tile.openstreetmap.org https://inmogrid.cl https://www.inmogrid.cl https://images.unsplash.com https://ui-avatars.com https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://images.inmogrid.cl https://*.r2.dev;
      font-src 'self' data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://vercel.live/ https://vitals.vercel-insights.com https://api.openai.com https://nominatim.openstreetmap.org https://generativelanguage.googleapis.com ws://127.0.0.1:* ws://localhost:*;
      block-all-mixed-content;
      upgrade-insecure-requests;
    `;

    return [
      // Headers para páginas HTML - cache corto
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'accept',
            value: '(.*text/html.*)',
          },
        ],
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Headers para archivos estáticos con hash (inmutables)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Headers para imágenes (cache medio)
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
          },
        ],
      },
      // Headers para favicon y manifest
      {
        source: '/(favicon.ico|manifest.json|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      // Headers para API pública legacy (cache corto con revalidación)
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      // Headers para API v1 (cache + CORS)
      {
        source: '/api/v1/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, X-API-Key',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Headers para APIs privadas (no cachear)
      {
        source: '/api/:path((?!public|v1).*)*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Configuración adicional para desarrollo
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },

  // `canvas` (dep nativa opcional) queda como external para que webpack
  // no intente bundlearla. Resuelta en runtime vía node_modules.
  serverExternalPackages: ['canvas', '@aws-sdk/client-s3'],

  // Configuración de webpack para desarrollo
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Mejoras para desarrollo local
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Configuración adicional para manejar módulos
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },

  // Configuración de transpile para módulos específicos
  transpilePackages: [],

  // Redirects 301 (permanentes) post-eliminación del concepto /dashboard.
  // El dashboard se disolvió: rutas de user pasan a raíz (/perfil,
  // /referenciales/tabla, /referenciales/mis-aportes), admin a /admin/*
  // y la home es el feed del foro. Ver architecture.md §Protección de rutas
  // y el commit que introdujo este cambio para contexto completo.
  async redirects() {
    return [
      // Auth legacy
      { source: '/login', destination: '/auth/signin', permanent: false },
      { source: '/signin', destination: '/auth/signin', permanent: false },

      // Dashboard → rutas nuevas (301 permanentes para preservar SEO y links
      // antiguos). El orden de estos redirects importa porque Next aplica
      // el primero que matchea.
      { source: '/dashboard', destination: '/', permanent: true },
      { source: '/dashboard/perfil', destination: '/perfil', permanent: true },
      {
        source: '/dashboard/referenciales',
        destination: '/referenciales',
        permanent: true,
      },
      {
        source: '/dashboard/referenciales/mapa',
        destination: '/referenciales',
        permanent: true,
      },
      {
        source: '/dashboard/referenciales/tabla',
        destination: '/referenciales/tabla',
        permanent: true,
      },
      {
        source: '/dashboard/referenciales/contribuciones',
        destination: '/referenciales/mis-aportes',
        permanent: true,
      },
      {
        source: '/dashboard/explorar',
        destination: '/directorio',
        permanent: true,
      },
      {
        source: '/dashboard/comunidad',
        destination: '/directorio',
        permanent: true,
      },
      {
        source: '/dashboard/networking',
        destination: '/directorio',
        permanent: true,
      },
      {
        source: '/dashboard/blog',
        destination: '/admin/blog',
        permanent: true,
      },
      {
        source: '/dashboard/blog/nuevo',
        destination: '/admin/blog/nuevo',
        permanent: true,
      },
      {
        source: '/dashboard/admin/reportes',
        destination: '/admin/reportes',
        permanent: true,
      },
      {
        source: '/dashboard/documentacion',
        destination: '/admin/docs',
        permanent: true,
      },

      // Fusión Conservadores + Comunidad → Directorio (2026-04-24). El
      // directorio tiene tabs internos (?tab=profesionales default,
      // ?tab=conservadores). Redirect con preservación del tab correcto
      // para que los links antiguos caigan en el contenido que esperan.
      {
        source: '/conservadores',
        destination: '/directorio?tab=conservadores',
        permanent: true,
      },
      {
        source: '/comunidad',
        destination: '/directorio',
        permanent: true,
      },
    ];
  },

  // Rewrites — el browser sigue pidiendo /favicon.ico por compatibilidad,
  // pero el favicon del proyecto es icon.png (Next 15 file-based). Servimos
  // el PNG como .ico internamente para evitar el 404 ruidoso en logs.
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/icon.png' },
    ];
  },
};

module.exports = nextConfig;
