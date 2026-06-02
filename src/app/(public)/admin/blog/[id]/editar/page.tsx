import { notFound } from 'next/navigation';
import { requireAdmin } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';
import BlogEditForm from './BlogEditForm';

export const metadata = {
  title: 'Editar publicación (admin)',
};

export default async function EditarPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      coverImageUrl: true,
      tags: true,
      published: true,
    },
  });

  if (!post) notFound();

  return <BlogEditForm post={post} />;
}
