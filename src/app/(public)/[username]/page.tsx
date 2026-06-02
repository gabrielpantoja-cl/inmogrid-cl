// Perfil público de usuario
// Ruta: /{username} (sin autenticación requerida)

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { getUser } from '@/shared/lib/supabase/auth';
import ProfileHero from '@/shared/components/layout/profile/ProfileHero';
import ProfileBio from '@/shared/components/layout/profile/ProfileBio';
import SocialLinks from '@/shared/components/layout/profile/SocialLinks';
import { personJsonLd, breadcrumbJsonLd } from '@/shared/lib/seo/jsonld';
import OwnerForumTabs from './OwnerForumTabs';

type OwnerTab = 'hilos' | 'guardados' | 'likes';

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const viewer = await getUser();

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      id: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      tagline: true,
      coverImageUrl: true,
      location: true,
      identityTags: true,
      externalLinks: true,
      profession: true,
      company: true,
      website: true,
      linkedin: true,
      isPublicProfile: true,
      createdAt: true,
    },
  });

  if (!profile || !profile.isPublicProfile) {
    notFound();
  }

  const isOwner = !!viewer && viewer.id === profile.id;
  const activeTab: OwnerTab =
    rawTab === 'guardados' || rawTab === 'likes' ? rawTab : 'hilos';

  // Hilos del foro más recientes del usuario (visibles a todos los visitantes)
  const threads = await prisma.forumThread.findMany({
    where: { authorId: profile.id, status: 'published' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      contentText: true,
      likeCount: true,
      commentCount: true,
      createdAt: true,
    },
  });

  // externalLinks es Json — extraer URLs string para schema.sameAs
  const externalLinksArray: string[] = (() => {
    if (!profile.externalLinks || typeof profile.externalLinks !== 'object') return [];
    if (Array.isArray(profile.externalLinks)) {
      return profile.externalLinks.filter((v): v is string => typeof v === 'string');
    }
    return Object.values(profile.externalLinks).filter(
      (v): v is string => typeof v === 'string'
    );
  })();

  const personLd = personJsonLd({
    username: profile.username ?? username,
    fullName: profile.fullName,
    bio: profile.bio ?? profile.tagline,
    avatarUrl: profile.avatarUrl,
    jobTitle: profile.profession,
    worksFor: profile.company,
    sameAs: [profile.website, profile.linkedin, ...externalLinksArray],
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: 'https://inmogrid.cl' },
    {
      name: profile.fullName || profile.username || 'Perfil',
      url: `https://inmogrid.cl/${profile.username ?? username}`,
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {/* Hero Section */}
      <ProfileHero
        name={profile.fullName || profile.username || 'Usuario'}
        username={profile.username}
        tagline={profile.tagline}
        image={profile.avatarUrl}
        coverImageUrl={profile.coverImageUrl}
        identityTags={profile.identityTags}
      />

      {/* Contenido Principal */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Bio Section */}
        <div className="mb-8">
          <ProfileBio
            bio={profile.bio}
            location={profile.location}
            profession={profile.profession || undefined}
            company={profile.company}
            website={profile.website}
          />
        </div>

        {/* Social Links */}
        {profile.externalLinks && (
          <div className="mb-12 rounded-xl bg-white p-6 shadow-md md:p-8">
            <h2 className="mb-4 text-xl font-bold text-gray-800">
              📬 Contacto y redes
            </h2>
            <SocialLinks externalLinks={profile.externalLinks} />
          </div>
        )}

        {/* Tabs del foro — solo visibles si el viewer es el propio owner */}
        {isOwner && profile.username && (
          <OwnerForumTabs
            userId={profile.id}
            username={profile.username}
            activeTab={activeTab}
          />
        )}

        {/* Hilos recientes en el foro */}
        {threads.length > 0 && (
          <section className="mb-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                💬 Hilos en el Foro
              </h2>
              <Link href="/foro" className="text-sm text-green-700 underline hover:text-green-600">
                Ver en el foro →
              </Link>
            </div>
            <div className="space-y-3">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/foro/${thread.slug}`}
                  className="block rounded-xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-green-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{thread.title}</h3>
                  {thread.contentText && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {thread.contentText.slice(0, 120)}{thread.contentText.length > 120 ? '…' : ''}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      {new Date(thread.createdAt).toLocaleDateString('es-CL', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                    <span>❤️ {thread.likeCount}</span>
                    <span>💬 {thread.commentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer del perfil */}
        <div className="mt-16 border-t border-gray-200 pt-8 text-center text-gray-500">
          <p className="text-sm">
            Perfil en{' '}
            <Link href="/" className="font-semibold text-green-700 hover:underline">
              inmogrid.cl
            </Link>
            {' '} - Ecosistema digital colaborativo
          </p>
          <p className="mt-2 text-xs">
            Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-CL', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params;

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      fullName: true,
      username: true,
      bio: true,
      tagline: true,
      avatarUrl: true,
    },
  });

  if (!profile) {
    return { title: 'Perfil no encontrado' };
  }

  const displayName = profile.fullName || profile.username;
  const url = `https://inmogrid.cl/${profile.username}`;
  return {
    title: displayName,
    description: profile.tagline || profile.bio?.substring(0, 160) || `Perfil de ${displayName} en inmogrid.cl`,
    alternates: { canonical: url },
    openGraph: {
      title: displayName,
      description: profile.tagline || profile.bio?.substring(0, 160),
      url,
      type: 'profile',
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
  };
}
