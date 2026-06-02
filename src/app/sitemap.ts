import { MetadataRoute } from 'next'
import prisma from '@/shared/lib/prisma'

const BASE_URL = 'https://inmogrid.cl'

// Cachear 1h — Google suele reconsultar cada ~24h; 3 queries Prisma por consulta
// no escalan. Si se publica un hilo nuevo tarda ≤1h en aparecer, aceptable.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/referenciales`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // Directorio — dos tabs, ambos indexables. El tab default (profesionales)
    // queda sin querystring para maximizar SEO; el de conservadores se
    // declara explícito porque es un directorio reconocido y con volumen.
    { url: `${BASE_URL}/directorio`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/directorio?tab=conservadores`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/eventos`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // Sofia — desactivada, fuera del sitemap hasta reactivar.
    // (ruta física en app/(public)/_sofia-disabled; ver LeftSidebar para el
    //  proceso completo de reactivación)
    // { url: `${BASE_URL}/sofia`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Blog posts — tabla tiene columnas legacy (status) + Prisma (published).
  // Ambas están pobladas, usamos Prisma para consistencia con el resto del schema.
  let postRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    postRoutes = posts
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${BASE_URL}/blog/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      }))
  } catch (err) {
    console.error('[sitemap] posts query failed:', err instanceof Error ? err.message : err)
  }

  // Hilos del foro publicados
  let threadRoutes: MetadataRoute.Sitemap = []
  try {
    const threads = await prisma.forumThread.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    threadRoutes = threads
      .filter((t) => t.slug)
      .map((t) => ({
        url: `${BASE_URL}/foro/${t.slug}`,
        lastModified: t.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  } catch (err) {
    console.error('[sitemap] threads query failed:', err instanceof Error ? err.message : err)
  }

  // Perfiles públicos (isPublicProfile = true, con username)
  let profileRoutes: MetadataRoute.Sitemap = []
  try {
    const profiles = await prisma.profile.findMany({
      where: { isPublicProfile: true, username: { not: null } },
      select: { username: true, updatedAt: true },
    })
    profileRoutes = profiles
      .filter((p) => p.username)
      .map((p) => ({
        url: `${BASE_URL}/${p.username}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
  } catch (err) {
    console.error('[sitemap] profiles query failed:', err instanceof Error ? err.message : err)
  }

  return [...staticRoutes, ...postRoutes, ...threadRoutes, ...profileRoutes]
}
