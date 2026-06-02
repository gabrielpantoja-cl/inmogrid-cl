'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useImageUpload } from '@/shared/hooks/useImageUpload';

/**
 * Componente de subida de avatar.
 *
 * Estrategia: el usuario autenticado hace un upload directo desde el browser
 * a Supabase Storage usando el cliente de Supabase (respetando las RLS
 * policies del bucket). Una vez subida la imagen, la URL pública se envía
 * a PUT /api/users/profile para persistirla en `profiles.avatar_url`.
 *
 * El upload usa el hook compartido `useImageUpload` (mismo patrón que el
 * editor del foro). Específico de avatar: tamaño máximo 2 MB y MIME types
 * limitados (sin GIF/AVIF — para foto de perfil queremos algo simple).
 *
 * El upload es inmediato e independiente del submit del form de edición de
 * perfil — por eso este componente se renderiza fuera del `<form>` normal.
 */

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
}

export function AvatarUpload({ userId, currentAvatarUrl, fullName }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { upload, uploading, error: uploadError, acceptAttr } = useImageUpload({
    bucket: 'avatars',
    userId,
    maxSizeBytes: 2 * 1024 * 1024, // 2 MB — más estricto que el default del hook
    acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });

  const error = persistError || uploadError;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPersistError(null);
    setSuccess(false);

    // Vista previa local inmediata mientras sube
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const result = await upload(file);

    if (!result) {
      // Rollback del preview — el hook ya seteó el error en `uploadError`
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(currentAvatarUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Persistir la URL en el perfil via API privada
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: result.publicUrl }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'La imagen se subió pero no pudimos actualizar tu perfil.');
      }

      URL.revokeObjectURL(localPreview);
      setPreviewUrl(result.publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : 'Error desconocido');
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(currentAvatarUrl);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initial = (fullName || 'U').trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 bg-white rounded-xl border border-gray-200">
      {/* Avatar actual / preview */}
      <div className="relative self-start sm:self-center">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={fullName || 'Avatar'}
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            unoptimized
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-yellow-100 border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-yellow-700">
            {initial}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-medium">Subiendo…</span>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex-1 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Foto de perfil</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            PNG, JPG o WebP · máximo 2 MB · recomendado al menos 256×256 px
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Subiendo…' : previewUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttr}
            onChange={handleFileSelect}
            className="sr-only"
            aria-label="Subir foto de perfil"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600" role="alert">❌ {error}</p>
        )}
        {success && (
          <p className="text-xs text-green-600">✅ Foto actualizada</p>
        )}
      </div>
    </div>
  );
}
