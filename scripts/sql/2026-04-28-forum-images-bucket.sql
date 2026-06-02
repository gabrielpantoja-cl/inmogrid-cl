-- Bucket de imágenes embebidas en hilos del foro.
--
-- Nuevo bucket separado de `avatars` porque tiene un lifecycle distinto
-- (las imágenes del foro pueden quedar huérfanas si el user descarta el
-- hilo, mientras el avatar siempre se reemplaza con upsert al mismo
-- objectPath). Mantener buckets separados también permite políticas de
-- retención distintas en el futuro (ej. cron mensual para limpiar
-- huérfanas en `forum-images` sin tocar `avatars`).
--
-- Patrón de path: `{userId}/{timestamp}-{random}.{ext}` — el primer
-- segmento del path es el UUID del usuario, lo que permite RLS por
-- carpeta (`auth.uid()::text = (storage.foldername(name))[1]`).
--
-- Ejecutar en el SQL Editor de Supabase. Idempotente: se puede correr
-- múltiples veces sin error.

-- ============================================================
-- 1. Bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  true, -- lectura pública
  5242880, -- 5 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. RLS policies sobre storage.objects
-- ============================================================

-- Lectura pública: cualquiera puede ver las imágenes (es lo que esperamos
-- para imágenes embebidas en hilos públicos del foro).
DROP POLICY IF EXISTS "forum-images: public read" ON storage.objects;
CREATE POLICY "forum-images: public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'forum-images');

-- Insert: usuario autenticado solo puede subir dentro de SU carpeta
-- (primer segmento del path = su user_id).
DROP POLICY IF EXISTS "forum-images: user insert own folder" ON storage.objects;
CREATE POLICY "forum-images: user insert own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'forum-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update: mismo principio. En la práctica usamos paths con timestamp así
-- que casi nunca actualizamos un objeto, pero por consistencia.
DROP POLICY IF EXISTS "forum-images: user update own folder" ON storage.objects;
CREATE POLICY "forum-images: user update own folder"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'forum-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: el usuario puede borrar sus propias imágenes (útil si
-- implementamos limpieza desde la UI más adelante).
DROP POLICY IF EXISTS "forum-images: user delete own folder" ON storage.objects;
CREATE POLICY "forum-images: user delete own folder"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'forum-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
