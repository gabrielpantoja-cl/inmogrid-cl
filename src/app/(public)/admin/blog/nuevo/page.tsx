import { requireAdmin } from '@/shared/lib/supabase/auth';
import BlogPostForm from './BlogPostForm';

export const metadata = {
  title: 'Nueva publicación',
  description: 'Crea una nueva publicación del blog',
};

export default async function NewBlogPostPage() {
  // Solo admins pueden crear posts en el blog; los demás usuarios publican
  // en el foro. requireAdmin redirige a /?error=admin_required si el rol
  // no es admin/superadmin.
  await requireAdmin();

  return (
    <div className="max-w-4xl mx-auto">
      <BlogPostForm />
    </div>
  );
}
