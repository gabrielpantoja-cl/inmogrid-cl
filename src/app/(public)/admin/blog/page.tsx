import { requireAdmin } from '@/shared/lib/supabase/auth';
import BlogContent from './BlogContent';
import { prisma } from '@/shared/lib/prisma';

export const metadata = {
  title: 'Gestión del Blog (admin)',
  description: 'Gestiona todas las publicaciones del blog',
};

export default async function BlogAdminPage() {
  await requireAdmin();

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      published: true,
      publishedAt: true,
      tags: true,
      readTime: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <BlogContent
      initialPosts={posts}
    />
  );
}
