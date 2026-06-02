// GET /api/users/username/check?username=foo
// Verifica disponibilidad de username para el usuario autenticado.
// Devuelve { available: boolean, message: string }

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';

const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

// Rutas de primer nivel que existen en la app — no pueden ser usernames
const RESERVED = new Set([
  'referenciales', 'sofia', 'notas', 'terms', 'privacy',
  'dashboard', 'api', 'auth', 'admin', 'login', 'logout',
  'settings', 'register', 'explorar', 'comunidad', 'feed',
  'perfil', 'about', 'blog', 'help', 'support', 'contact',
  'inmogrid', 'root', 'www', 'mail', 'email',
]);

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get('username') ?? '';
  const username = raw.toLowerCase().trim();

  if (!username) {
    return NextResponse.json({ available: false, message: 'Ingresa un username' });
  }
  if (username.length < 3) {
    return NextResponse.json({ available: false, message: 'Mínimo 3 caracteres' });
  }
  if (username.length > 30) {
    return NextResponse.json({ available: false, message: 'Máximo 30 caracteres' });
  }
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({
      available: false,
      message: 'Solo letras minúsculas, números, guiones ( - ) y guiones bajos ( _ ). No puede empezar ni terminar con guión.',
    });
  }
  if (RESERVED.has(username)) {
    return NextResponse.json({ available: false, message: 'Este username está reservado' });
  }

  const existing = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });

  // Disponible si no existe, o si existe pero es el propio usuario
  const available = !existing || existing.id === user.id;
  return NextResponse.json({
    available,
    message: available ? 'Disponible' : 'Ya está en uso',
  });
}
