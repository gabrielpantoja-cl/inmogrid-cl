// Helpers para generar JSON-LD structured data (schema.org).
// Uso: <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />
// Ver https://schema.org y https://developers.google.com/search/docs/appearance/structured-data

const SITE_URL = 'https://inmogrid.cl';
const SITE_NAME = 'inmogrid.cl';
const LOGO_URL = `${SITE_URL}/images/inmogrid-icon.svg`;
const DEFAULT_OG = `${SITE_URL}/images/og-image.jpg`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      'Ecosistema digital abierto y colaborativo para la comunidad inmobiliaria chilena.',
    sameAs: [] as string[],
  } as const;
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'es-CL',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  } as const;
}

interface BlogPostingInput {
  title: string;
  description: string;
  slug: string;
  image?: string | null;
  publishedAt: Date | string | null;
  updatedAt?: Date | string | null;
  authorName: string;
  authorUrl?: string | null;
}

export function blogPostingJsonLd(p: BlogPostingInput) {
  const url = `${SITE_URL}/blog/${p.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: p.image ?? DEFAULT_OG,
    datePublished:
      p.publishedAt instanceof Date ? p.publishedAt.toISOString() : p.publishedAt ?? undefined,
    dateModified:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt ?? undefined,
    author: {
      '@type': 'Person',
      name: p.authorName,
      url: p.authorUrl ?? undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    inLanguage: 'es-CL',
  } as const;
}

interface DiscussionThreadInput {
  title: string;
  description: string;
  slug: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  authorName: string;
  authorUrl?: string | null;
  commentCount: number;
  likeCount: number;
}

// Google soporta DiscussionForumPosting desde 2024 — rich results para foros.
export function discussionForumPostingJsonLd(t: DiscussionThreadInput) {
  const url = `${SITE_URL}/foro/${t.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: t.title,
    text: t.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    dateModified: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
    author: {
      '@type': 'Person',
      name: t.authorName,
      url: t.authorUrl ?? undefined,
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: t.likeCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: t.commentCount,
      },
    ],
    inLanguage: 'es-CL',
  } as const;
}

interface PersonInput {
  username: string;
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  worksFor?: string | null;
  sameAs?: Array<string | null | undefined>;
}

export function personJsonLd(p: PersonInput) {
  const url = `${SITE_URL}/${p.username}`;
  const sameAs = (p.sameAs ?? []).filter((u): u is string => Boolean(u));
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.fullName || p.username,
    alternateName: p.username,
    url,
    mainEntityOfPage: { '@type': 'ProfilePage', '@id': url },
    description: p.bio ?? undefined,
    image: p.avatarUrl ?? undefined,
    jobTitle: p.jobTitle ?? undefined,
    worksFor: p.worksFor ? { '@type': 'Organization', name: p.worksFor } : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  } as const;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  } as const;
}

// Componente wrapper para inyectar múltiples schemas en una sola página.
export function jsonLdScript(data: object | object[]) {
  const payload = Array.isArray(data) ? data : [data];
  return payload.map((item) => JSON.stringify(item));
}
