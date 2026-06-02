// Redirect permanente: /[username]/notas → /blog
// La sección "notas" está en desuso — las publicaciones del blog viven en /blog.
import { redirect } from 'next/navigation';

export default function NotasRedirectPage() {
  redirect('/blog');
}
