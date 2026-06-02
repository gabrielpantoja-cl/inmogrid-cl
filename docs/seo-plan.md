# Plan de mejora SEO — inmogrid.cl

> Fecha: 2026-05-18  
> Estado: ✅ CERRADO — implementación completa verificada en producción  
> Próxima revisión: 2026-06-17

## Contexto

No existe propiedad GA4 para inmogrid.cl. La propiedad `referenciales.cl` en Google Analytics tiene datos muertos (59 sesiones, rutas obsoletas). Sin métricas reales, la estrategia de corto plazo se basa en auditoría estática del código.

**Gap principal identificado**: las páginas de blog (`/blog/[slug]`) carecen de URL canónica, imagen OpenGraph y Twitter card. Sin canónica explícita, Google puede indexar variantes duplicadas y no distribuye correctamente el PageRank entre ellas.

---

## Verificación final (2026-05-18)

| Ítem | Estado | Notas |
|---|---|---|
| Canonical blog posts + OG + Twitter Cards | ✅ commit `98b22b42` | Verificado en producción |
| Canonical /referenciales + título descriptivo | ✅ commit `98b22b42` | Verificado en producción |
| Canonical /privacy y /terms | ✅ commit `98b22b42` | Verificado en producción |
| GA4 `G-XS8XXE3ZPW` | ✅ env var en Vercel | Consent-gated, no aparece en SSR HTML (correcto) |
| Google Search Console | ✅ verificado por DNS desde 16/04/2026 | 441 solicitudes de rastreo en 90 días, propietario verificado |

---

## Cambios de código (4 archivos)

### 1. Blog post — `src/app/(public)/blog/[slug]/page.tsx`

Ampliar `generateMetadata` (actualmente líneas 48–57). La función ya llama a `getPost(slug)` que retorna `image` (`cover_image_url`).

```typescript
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Artículo no encontrado' };
  const canonicalUrl = `https://inmogrid.cl/blog/${slug}`;
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? '',
      type: 'article',
      url: canonicalUrl,
      images: post.image
        ? [{ url: post.image, width: 1200, height: 630, alt: post.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? '',
      images: post.image ? [post.image] : [],
    },
  };
}
```

### 2. Referenciales — `src/app/(public)/referenciales/page.tsx`

Agregar `alternates.canonical` y mejorar el `title` (actualmente solo dice "Mapa"):

```typescript
export const metadata = {
  title: 'Mapa de Transacciones Inmobiliarias · Chile',
  description:
    'Mapa público de transacciones inmobiliarias verificadas en Chile — datos abiertos con fuente CBR. Filtros, exportación CSV y contribuciones para usuarios autenticados.',
  alternates: { canonical: 'https://inmogrid.cl/referenciales' },
};
```

### 3. Política de privacidad — `src/app/(public)/privacy/page.tsx`

Agregar `export const metadata` (actualmente no existe):

```typescript
export const metadata = {
  title: 'Política de Privacidad · inmogrid.cl',
  alternates: { canonical: 'https://inmogrid.cl/privacy' },
};
```

### 4. Términos de servicio — `src/app/(public)/terms/page.tsx`

Agregar `export const metadata` (actualmente no existe):

```typescript
export const metadata = {
  title: 'Términos de Servicio · inmogrid.cl',
  alternates: { canonical: 'https://inmogrid.cl/terms' },
};
```

---

## Acciones de configuración (manuales)

### 5. Crear propiedad GA4 para inmogrid.cl

El código de tracking ya existe en `src/shared/components/layout/legal/ConditionalAnalytics.tsx` — solo necesita el env var.

1. Ir a [analytics.google.com](https://analytics.google.com) → crear propiedad para `inmogrid.cl`
2. Copiar el Measurement ID (`G-XXXXXXXX`)
3. En Vercel → Settings → Environment Variables → agregar `NEXT_PUBLIC_GA_ID=G-XXXXXXXX` (Production)
4. Hacer re-deploy para activar

### 6. Google Search Console

La meta tag de verificación ya está en el layout, condicionada por `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

1. Ir a [search.google.com/search-console](https://search.google.com/search-console) → agregar propiedad `https://inmogrid.cl`
2. Verificar si ya está el env var `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` en Vercel
3. Si no: obtener el verification code → agregarlo en Vercel env vars → re-deploy

---

## Verificación post-implementación

| Check | Cómo verificar |
|---|---|
| Canonical en blog posts | `curl -s https://inmogrid.cl/blog/[slug] \| grep canonical` |
| OG image en blog posts | Facebook Debugger / LinkedIn Post Inspector |
| Twitter card | [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) |
| Canonical en /referenciales | DevTools → Elements → `<head>` |
| Canonical en /privacy y /terms | DevTools → Elements → `<head>` |
| GA4 activo | Google Analytics → Realtime al navegar el sitio |
| Search Console | Verificar propiedad y submit sitemap: `https://inmogrid.cl/sitemap.xml` |

---

## Revisión 2026-06-17 — qué verificar

Volver a GSC y revisar:
- **Cobertura de indexación** — cuántas páginas indexadas vs. excluidas (errores 404, noindex, etc.)
- **Core Web Vitals** — LCP, CLS, FID/INP en móvil y desktop
- **Rendimiento de búsqueda** — impresiones, clics, CTR y posición promedio tras 30 días con las canónicas activas
- **Sitemaps** — confirmar que `https://inmogrid.cl/sitemap.xml` sigue procesado sin errores
- **GA4** — verificar que eventos de sesión estén llegando (Realtime → últimas 30 min)

---

## Lo que ya está bien (no tocar)

- JSON-LD: `blogPostingJsonLd`, `discussionForumPostingJsonLd`, `organizationJsonLd`, `personJsonLd` — implementados en `src/shared/lib/seo/jsonld.ts` y usados en las páginas correspondientes
- Sitemap: `src/app/sitemap.ts` genera rutas dinámicas de posts, threads y perfiles con revalidación 1h
- `generateMetadata` en `/blog`, `/foro`, `/[username]`, `/directorio` — ya tienen título y descripción básicos
- `robots.txt` implícito (Next.js lo genera por defecto)
