// Redirect permanente: /[username]/notas/[slug] → /blog/[slug]
// La sección "notas" está en desuso — los posts del blog viven en /blog/[slug].
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NotaSlugRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/blog/${slug}`);
}
