'use client';

import { useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 5 * 1024 * 1024;

interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setError(null);

    if (!ACCEPTED.split(',').includes(file.type)) {
      setError('Tipo no soportado. Usa JPEG, PNG, WebP o AVIF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen no puede superar 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/posts/upload-image', { method: 'POST', body });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al subir la imagen.');
        return;
      }

      const { url } = await res.json();
      onChange(url);
    } catch {
      setError('Error de red al subir la imagen.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value && (
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Portada"
            className="w-10 h-10 rounded object-cover border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1.5 -right-1.5 bg-white border border-gray-300 rounded-full p-0.5 hover:bg-gray-100"
            title="Quitar imagen"
          >
            <XMarkIcon className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => { setError(null); inputRef.current?.click(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PhotoIcon className="w-4 h-4" />
          {uploading ? 'Subiendo…' : 'Subir imagen'}
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    </div>
  );
}
