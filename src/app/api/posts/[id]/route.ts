// API privada para operaciones con un post específico.
// Handler delgado — toda la lógica vive en `@/features/posts`.
// GET    /api/posts/[id]
// PUT    /api/posts/[id]
// DELETE /api/posts/[id]

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';
import {
  getPostByIdForUser,
  updatePostForUser,
  deletePostForUser,
  updatePostAsAdmin,
  deletePostAsAdmin,
  updatePostSchema,
} from '@/features/posts';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const post = await getPostByIdForUser(id, authUser.id);

    if (!post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('[API Post GET Error]:', error);
    return NextResponse.json(
      { error: 'Error al obtener post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Admin-only — mismo criterio que POST /api/posts.
    const profile = await getProfile(authUser.id);
    if (!isAdminRole(profile?.role)) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden editar publicaciones del blog' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const post = isAdminRole(profile?.role)
      ? await updatePostAsAdmin(id, parsed.data)
      : await updatePostForUser(id, authUser.id, parsed.data);
    if (!post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('[API Post PUT Error]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Admin-only. Si un ex-admin que ahora es `user` intenta borrar un
    // post propio antiguo, el 403 protege esa retirada de permisos.
    const profile = await getProfile(authUser.id);
    if (!isAdminRole(profile?.role)) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar publicaciones del blog' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ok = isAdminRole(profile?.role)
      ? await deletePostAsAdmin(id)
      : await deletePostForUser(id, authUser.id);
    if (!ok) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post eliminado correctamente',
    });
  } catch (error) {
    console.error('[API Post DELETE Error]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar post' },
      { status: 500 }
    );
  }
}
