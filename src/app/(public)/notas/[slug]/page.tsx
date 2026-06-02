import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

// `/notas/[slug]` fue reemplazado por `/blog/[slug]`. Mantenemos este
// redirect para preservar enlaces externos existentes e indexación.
export default async function NotaPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/blog/${slug}`);
}
