// DELETE /api/delete-account
//
// Elimina definitivamente la cuenta del usuario autenticado:
//  1. Valida que el body contenga `{ confirmation }` matcheando el email.
//  2. En una transacción, borra filas de public.* y auth.users.
//  3. Devuelve 200 si todo fue atómico.
//
// Usamos `$executeRaw` porque la tabla `posts` tiene columnas legacy
// (author_id, status, image) fuera del Prisma schema.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';

const deleteBodySchema = z.object({
  confirmation: z.string().min(1),
});

export async function DELETE(request: NextRequest) {
  // 1. Autenticación
  const authUser = await getUser();

  if (!authUser?.id || !authUser?.email) {
    return NextResponse.json(
      {
        success: false,
        message: 'No tienes autorización para realizar esta acción. Por favor, inicia sesión.',
        error: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // 2. Parse + validación del body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'El cuerpo de la petición no es JSON válido.',
        error: 'INVALID_BODY',
      },
      { status: 400 }
    );
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Falta el campo `confirmation` en el cuerpo de la petición.',
        error: 'MISSING_CONFIRMATION',
      },
      { status: 400 }
    );
  }

  // 3. La confirmación debe matchear el email del usuario exactamente.
  //    Case-sensitive — forzamos al usuario a copiar/escribir el email tal
  //    cual para que sea un gesto deliberado.
  if (parsed.data.confirmation !== authUser.email) {
    return NextResponse.json(
      {
        success: false,
        message: 'El texto de confirmación no coincide con tu email. Escríbelo exactamente como aparece en la pantalla.',
        error: 'CONFIRMATION_MISMATCH',
      },
      { status: 400 }
    );
  }

  // 4. Borrado transaccional. Orden:
  //    - Data de public.* que referencia al user
  //    - auth.users al final (si algo falla antes, el usuario puede reintentar)
  const userId = authUser.id;

  try {
    await prisma.$transaction([
      // Posts (columna `author_id`)
      prisma.$executeRaw`DELETE FROM public.posts WHERE author_id = ${userId}::uuid`,

      // Tablas sin cascade automático — columna `user_id`
      prisma.$executeRaw`DELETE FROM public.audit_logs            WHERE user_id = ${userId}::uuid`,
      prisma.$executeRaw`DELETE FROM public.chat_messages         WHERE user_id = ${userId}::uuid`,
      prisma.$executeRaw`DELETE FROM public.events                WHERE user_id = ${userId}::uuid`,
      prisma.$executeRaw`DELETE FROM public.professional_profiles WHERE user_id = ${userId}::uuid`,
      prisma.$executeRaw`
        DELETE FROM public.connections
        WHERE requester_id = ${userId}::uuid OR receiver_id = ${userId}::uuid
      `,
      prisma.$executeRaw`DELETE FROM public.profiles WHERE id = ${userId}::uuid`,

      // auth.users (al final — si algo explotó antes, el usuario sigue
      // existiendo y puede volver a intentarlo)
      prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`,
    ]);
  } catch (error) {
    console.error('[DELETE /api/delete-account] Transaction failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ocurrió un error al intentar eliminar tu cuenta. No se eliminó nada. Por favor, intenta de nuevo.',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Tu cuenta y todos tus datos fueron eliminados. Serás redirigido a la página principal.',
    },
    { status: 200 }
  );
}
