'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfileForm } from '../hooks/useProfileForm';
import { AvatarUpload } from './AvatarUpload';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ProfessionalSection } from './sections/ProfessionalSection';
import { SocialSection } from './sections/SocialSection';
import type { ProfileUser } from '../types';

interface ProfileEditFormProps {
  user: ProfileUser;
}

/**
 * Banner superior con URL pública del perfil. Modelo "linkedin-like"
 * (post 2026-04-29): cualquier perfil registrado es accesible vía URL
 * pública; lo que el usuario controla es qué campos rellena vs deja
 * vacíos (los vacíos no se muestran). El toggle global de visibilidad
 * fue removido junto con la página /cuenta/privacidad.
 */
function ProfileUrlBanner({
  username,
}: {
  username: string | null;
}) {
  const [copied, setCopied] = useState(false);

  // `username` es null en la ventana minúscula entre la creación del row
  // en auth.users y la creación del row en profiles vía /auth/callback.
  // En la práctica cuando el user llega a /perfil ya tiene username
  // asignado por generateUniqueUsername(). Si llegara null igual, escondemos
  // el banner en silencio — el form sigue funcional y el username aparece
  // al refrescar.
  if (!username) return null;

  const profileUrl = `https://www.inmogrid.cl/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Tu perfil público
          </span>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-yellow-700 hover:text-yellow-800 hover:underline truncate block"
          >
            {profileUrl}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar enlace'}
          </button>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary text-gray-900 hover:bg-primary/90 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Ver perfil →
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Orquestador del formulario de edición de perfil.
 * La lógica vive en `useProfileForm`; cada sección es un componente presentacional.
 *
 * Nota: `AvatarUpload` queda renderizado ARRIBA del `<form>` porque el avatar
 * se sube de forma inmediata y asíncrona (no espera al submit del resto del
 * form) — así el usuario ve el cambio al toque y no tiene que acordarse de
 * apretar "Guardar".
 */
export default function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter();
  const { formData, loading, error, success, handleChange, handleSubmit } =
    useProfileForm(user);

  return (
    <div className="space-y-8">
      {/* Banner de perfil público — muestra la URL pública. Usa el
          username del form para preview en tiempo real (si el user cambia
          el username, la URL se actualiza). */}
      <ProfileUrlBanner
        username={formData.username || user.username}
      />

      <AvatarUpload
        userId={user.id}
        currentAvatarUrl={user.avatarUrl}
        fullName={formData.fullName || user.fullName || ''}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-700">Perfil actualizado correctamente.</p>
          </div>
        )}

        <BasicInfoSection formData={formData} onChange={handleChange} />
        <ProfessionalSection formData={formData} onChange={handleChange} />
        <SocialSection formData={formData} onChange={handleChange} />

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-gray-900 font-semibold bg-primary rounded-lg hover:bg-primary/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
