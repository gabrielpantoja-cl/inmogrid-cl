'use client';

import { useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';

export interface UseImageUploadConfig {
  /** Bucket de Supabase Storage donde se sube la imagen */
  bucket: string;
  /**
   * UUID del usuario — primer segmento del path. Las RLS policies del
   * bucket esperan que `auth.uid() = (storage.foldername(name))[1]`.
   */
  userId: string;
  /**
   * Carpeta opcional dentro del path del usuario. Útil si querés agrupar
   * por feature (ej. "forum", "blog"). Resultado: `{userId}/{folder}/...`.
   * Si no se provee, queda directo bajo `{userId}/`.
   */
  folder?: string;
  /** Tamaño máximo en bytes. Default 5 MB. */
  maxSizeBytes?: number;
  /** MIME types aceptados. Default: PNG, JPG, WebP, GIF, AVIF. */
  acceptedTypes?: string[];
}

export interface UploadResult {
  publicUrl: string;
  objectPath: string;
}

/**
 * Mensaje de error human-readable para mostrar al usuario.
 */
type UploadError = string;

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
];

/**
 * Hook reutilizable para subir imágenes a Supabase Storage.
 *
 * Patrón: el cliente del browser sube directo a Storage con el SDK de
 * Supabase (sin endpoint API intermedio), respetando las RLS policies del
 * bucket. Este es el mismo patrón que usaba el `AvatarUpload` original
 * pero extraído para reusar en el editor del foro y futuros uploads
 * (cover images de blog, banners de perfil, etc).
 *
 * Validaciones de tipo MIME y tamaño viven en el cliente — son una
 * primera línea de UX, no de seguridad. La defensa real son las
 * `allowed_mime_types` y `file_size_limit` configuradas en el bucket
 * (ver SQL en scripts/sql/) que aplican a nivel del API de Supabase.
 *
 * Uso:
 * ```tsx
 * const { upload, uploading, error } = useImageUpload({
 *   bucket: 'forum-images',
 *   userId: user.id,
 * });
 *
 * const result = await upload(file);
 * if (result) editor.commands.setImage({ src: result.publicUrl });
 * ```
 */
export function useImageUpload(config: UseImageUploadConfig) {
  const {
    bucket,
    userId,
    folder,
    maxSizeBytes = DEFAULT_MAX_SIZE,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  } = config;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);

  const validate = (file: File): UploadError | null => {
    if (!acceptedTypes.includes(file.type)) {
      const labels = acceptedTypes
        .map((t) => t.replace('image/', '').toUpperCase())
        .join(', ');
      return `Formato no soportado. Usa ${labels}.`;
    }
    if (file.size > maxSizeBytes) {
      const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `La imagen supera los ${maxMB} MB (pesa ${sizeMB} MB).`;
    }
    return null;
  };

  /**
   * Sube el archivo y devuelve `{ publicUrl, objectPath }` en éxito,
   * o `null` si hubo un error (en cuyo caso `error` queda seteado).
   *
   * No lanza — la idea es que el caller pueda hacer:
   *   const result = await upload(file);
   *   if (result) {...}
   */
  const upload = async (file: File): Promise<UploadResult | null> => {
    setError(null);

    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return null;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      // Path: {userId}/[folder/]{timestamp}-{random}.{ext}
      // Random suffix para evitar colisiones si el usuario sube varias
      // imágenes en el mismo milisegundo (paste rápido en el editor).
      const random = Math.random().toString(36).slice(2, 8);
      const filename = `${Date.now()}-${random}.${ext}`;
      const objectPath = folder
        ? `${userId}/${folder}/${filename}`
        : `${userId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      return { publicUrl: data.publicUrl, objectPath };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(`No se pudo subir la imagen: ${message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    upload,
    uploading,
    error,
    /** Limpia el estado de error sin tocar uploading. */
    clearError: () => setError(null),
    /** MIME types aceptados — útil para el `accept` del `<input type="file">`. */
    acceptAttr: acceptedTypes.join(','),
  };
}
