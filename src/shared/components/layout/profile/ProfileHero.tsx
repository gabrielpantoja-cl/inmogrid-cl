'use client';

import Image from 'next/image';

interface ProfileHeroProps {
  name: string;
  username?: string | null;
  tagline?: string | null;
  image?: string | null;
  coverImageUrl?: string | null;
  identityTags?: string[];
}

export default function ProfileHero({
  name,
  username,
  tagline,
  image,
  coverImageUrl,
  identityTags = [],
}: ProfileHeroProps) {
  // URL de portada por defecto (gradiente verde)
  const defaultCover = 'linear-gradient(135deg, #2d5016 0%, #4a7c2c 100%)';

  return (
    <div className="relative h-[400px] w-full">
      {/* Portada */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: coverImageUrl
            ? `url(${coverImageUrl})`
            : defaultCover,
        }}
      >
        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
      </div>

      {/* Contenido del Hero */}
      <div className="relative z-10 flex h-full items-end p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-6xl items-end gap-4 md:gap-8">
          {/* Foto de perfil */}
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-2xl md:h-40 md:w-40">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-4xl font-bold text-white md:text-5xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info del perfil */}
          <div className="flex-1 pb-2 text-white md:pb-4">
            <h1 className="mb-1 text-3xl font-bold drop-shadow-lg md:text-5xl">
              {name}
            </h1>
            {tagline && (
              <p className="mb-3 text-lg font-light drop-shadow-md md:text-xl md:mb-4">
                {tagline}
              </p>
            )}
            {/* Tags de identidad */}
            {identityTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {identityTags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
