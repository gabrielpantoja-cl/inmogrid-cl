import { redirect } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/server'
import { LoginCard } from './LoginCard'

export const metadata = {
  title: 'Iniciar Sesion | INMOGRID',
  description: 'Accede al ecosistema digital colaborativo de profesionales inmobiliarios.',
}

export default async function LoginPage() {
  // Server-side session check: skip the login page if already authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-12">
      <LoginCard />
    </main>
  )
}
