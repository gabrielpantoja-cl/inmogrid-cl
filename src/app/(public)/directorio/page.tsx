import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { queryConservadoresDirectory } from '@/shared/lib/queries/referenciales';
import { ConservadoresGrid } from '@/features/conservadores/components/ConservadoresGrid';

export const dynamic = 'force-dynamic';

type DirectoryTab = 'profesionales' | 'conservadores';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { tab: rawTab } = await searchParams;
  const tab: DirectoryTab =
    rawTab === 'conservadores' ? 'conservadores' : 'profesionales';

  if (tab === 'conservadores') {
    return {
      title: 'Conservadores de Bienes Raíces · Directorio',
      description:
        'Directorio oficial de los 91 Conservadores de Bienes Raíces de Chile con información de contacto, jurisdicción y transacciones disponibles en inmogrid.cl.',
      alternates: { canonical: 'https://inmogrid.cl/directorio?tab=conservadores' },
    };
  }
  return {
    title: 'Directorio de la comunidad',
    description:
      'Profesionales inmobiliarios chilenos en inmogrid.cl — tasadores, peritos, corredores, arquitectos, abogados inmobiliarios y más. Explora perfiles y publicaciones de la comunidad.',
    alternates: { canonical: 'https://inmogrid.cl/directorio' },
  };
}

type PostRow = {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  createdAt: Date;
  authorFullName: string | null;
  authorUsername: string | null;
};

async function fetchProfesionalesData() {
  return Promise.all([
    prisma.$queryRaw<PostRow[]>`
      SELECT
        p.id,
        p.title,
        p.excerpt,
        p.slug,
        p.created_at AS "createdAt",
        dp.full_name  AS "authorFullName",
        dp.username   AS "authorUsername"
      FROM posts p
      LEFT JOIN profiles dp ON dp.id = p.user_id
      WHERE p.published = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `,
    prisma.profile.findMany({
      take: 20,
      where: { isPublicProfile: true, username: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        profession: true,
        tagline: true,
      },
    }),
  ]);
}

/**
 * Directorio unificado — fusiona `/comunidad` y `/conservadores` en una sola
 * ruta con tabs. Default: "Profesionales" (la comunidad, más social). El
 * tab "Conservadores" (CBR) es el otro directorio — ambos son catálogos
 * navegables de entidades del ecosistema inmobiliario chileno.
 *
 * Decisión 2B del sprint de reestructuración: default en profesionales
 * porque el usuario casual suele buscar gente antes que entidades legales.
 */
export default async function DirectorioPage({ searchParams }: Props) {
  const { tab: rawTab } = await searchParams;
  const tab: DirectoryTab =
    rawTab === 'conservadores' ? 'conservadores' : 'profesionales';

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Directorio</h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          {tab === 'conservadores'
            ? 'Los 91 Conservadores de Bienes Raíces de Chile: contacto, jurisdicción y cantidad de transacciones disponibles en inmogrid.cl.'
            : 'Profesionales del rubro inmobiliario chileno que publican en inmogrid — tasadores, peritos, corredores, arquitectos, abogados y más.'}
        </p>
      </header>

      {/* Tabs — Links server-side para navegación con ?tab= */}
      <div
        role="tablist"
        aria-label="Secciones del directorio"
        className="flex items-center gap-1 border-b border-gray-200 mb-6"
      >
        <Link
          href="/directorio"
          role="tab"
          aria-selected={tab === 'profesionales'}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'profesionales'
              ? 'text-primary'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Profesionales
          {tab === 'profesionales' && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
          )}
        </Link>
        <Link
          href="/directorio?tab=conservadores"
          role="tab"
          aria-selected={tab === 'conservadores'}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'conservadores'
              ? 'text-primary'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Conservadores (CBR)
          {tab === 'conservadores' && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
          )}
        </Link>
      </div>

      {tab === 'conservadores' ? (
        <ConservadoresSection />
      ) : (
        <ProfesionalesSection />
      )}
    </div>
  );
}

async function ConservadoresSection() {
  const conservadores = await queryConservadoresDirectory();
  return <ConservadoresGrid conservadores={conservadores} />;
}

async function ProfesionalesSection() {
  const [recentPosts, recentProfiles] = await fetchProfesionalesData();

  return (
    <div className="space-y-10">
      {/* Perfiles */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Perfiles recientes
        </h2>
        {recentProfiles.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no hay perfiles públicos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProfiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/${profile.username}`}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/50 hover:shadow-sm transition-all"
              >
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName || ''}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium shrink-0">
                    {(profile.fullName || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {profile.fullName || profile.username}
                  </p>
                  {profile.profession && (
                    <p className="text-xs text-primary font-medium">
                      {profile.profession}
                    </p>
                  )}
                  {profile.tagline && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {profile.tagline}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Publicaciones del blog de la comunidad */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Publicaciones del blog
        </h2>
        {recentPosts.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no hay publicaciones.</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <h3 className="font-medium text-gray-900">{post.title}</h3>
                {post.excerpt && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {post.authorFullName || 'Comunidad inmogrid'} ·{' '}
                  {new Date(post.createdAt).toLocaleDateString('es-CL')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
