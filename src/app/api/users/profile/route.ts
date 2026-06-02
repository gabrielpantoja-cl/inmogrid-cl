// API privada para gestionar el perfil del usuario autenticado
// GET /api/users/profile - Obtiene perfil completo del usuario
// PUT /api/users/profile - Actualiza perfil del usuario

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { getUser } from '@/shared/lib/supabase/auth';
import { z } from 'zod';
import { ProfessionType } from '@prisma/client';

const USERNAME_RESERVED = new Set([
  'referenciales', 'sofia', 'notas', 'terms', 'privacy',
  'dashboard', 'api', 'auth', 'admin', 'login', 'logout',
  'settings', 'register', 'explorar', 'comunidad', 'feed',
  'perfil', 'about', 'blog', 'help', 'support', 'contact',
  'inmogrid', 'root', 'www', 'mail', 'email',
]);

const profileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'El username debe tener al menos 3 caracteres')
    .max(30, 'El username no puede exceder 30 caracteres')
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/,
      'Solo letras minúsculas, números, guiones y guiones bajos. No puede empezar ni terminar con guión.'
    )
    .refine((v) => !USERNAME_RESERVED.has(v), { message: 'Este username está reservado' })
    .optional(),
  fullName: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  bio: z.string().max(500, 'La biografía no puede exceder 500 caracteres').nullable().optional(),
  tagline: z.string().max(100, 'El tagline no puede exceder 100 caracteres').nullable().optional(),
  // avatarUrl lo persiste el componente `AvatarUpload` después de subir la
  // imagen a Supabase Storage. Aceptamos null para permitir "sacar la foto".
  avatarUrl: z.string().url('Debe ser una URL válida').max(500).nullable().optional(),
  profession: z.nativeEnum(ProfessionType).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  contactEmail: z.string().email('Debe ser un email válido').max(150).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  commune: z.string().max(100).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  website: z.string().url('Debe ser una URL válida').nullable().optional(),
  linkedin: z.string().url('Debe ser una URL válida').nullable().optional(),
  isPublicProfile: z.boolean().optional(),
  location: z.string().max(100).nullable().optional(),
  identityTags: z.array(z.string().max(50)).max(10, 'Máximo 10 tags').optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const authUser = await getUser();

    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        username: true,
        bio: true,
        tagline: true,
        coverImageUrl: true,
        location: true,
        identityTags: true,
        profession: true,
        company: true,
        phone: true,
        contactEmail: true,
        region: true,
        commune: true,
        address: true,
        website: true,
        linkedin: true,
        isPublicProfile: true,
        externalLinks: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('[API Profile GET Error]:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getUser();

    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: authUser.id },
      data: validation.data,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        username: true,
        bio: true,
        tagline: true,
        coverImageUrl: true,
        location: true,
        identityTags: true,
        profession: true,
        company: true,
        phone: true,
        contactEmail: true,
        region: true,
        commune: true,
        address: true,
        website: true,
        linkedin: true,
        isPublicProfile: true,
        externalLinks: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Perfil actualizado correctamente',
    });
  } catch (error) {
    console.error('[API Profile PUT Error]:', error);

    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe un usuario con esos datos' }, { status: 409 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}
