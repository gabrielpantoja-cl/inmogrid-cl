import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';
import { uploadToR2, r2PublicUrl } from '@/shared/lib/r2';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export async function POST(request: NextRequest) {
  const authUser = await auth();
  if (!authUser?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const profile = await getProfile(authUser.id);
  if (!isAdminRole(profile?.role)) {
    return NextResponse.json(
      { error: 'Solo administradores pueden subir imágenes' },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: 'Tipo de archivo no soportado', accepted: Object.keys(ALLOWED_TYPES) },
      { status: 415 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagen demasiado grande', maxMB: 5 }, { status: 413 });
  }

  const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, buffer, file.type);
    return NextResponse.json({ url: r2PublicUrl(key) });
  } catch (error) {
    console.error('[R2 Upload Error]:', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}
