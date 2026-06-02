import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/perfil',
          '/referenciales/mis-aportes',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://inmogrid.cl/sitemap.xml',
    host: 'https://inmogrid.cl',
  }
}
