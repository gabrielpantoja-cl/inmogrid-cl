import { redirect } from 'next/navigation'

/**
 * Legacy NextAuth sign-in route.
 * Now redirects permanently to the new Supabase Auth login page.
 */
export default function SignInPage() {
  redirect('/auth/login')
}
