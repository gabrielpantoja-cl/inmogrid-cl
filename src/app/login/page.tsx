import { redirect } from 'next/navigation'

/**
 * Canonical redirect: /login → /auth/login
 */
export default function LoginPage() {
  redirect('/auth/login')
}
