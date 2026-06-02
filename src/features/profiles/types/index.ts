import type { ProfessionType } from '@prisma/client';

export interface ProfileUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tagline: string | null;
  profession: ProfessionType | null;
  company: string | null;
  phone: string | null;
  contactEmail: string | null;
  region: string | null;
  commune: string | null;
  address: string | null;
  website: string | null;
  linkedin: string | null;
  isPublicProfile: boolean;
  location: string | null;
  identityTags: string[];
}

export interface ProfileFormData {
  username: string;
  fullName: string;
  bio: string;
  tagline: string;
  profession: string;
  company: string;
  phone: string;
  contactEmail: string;
  region: string;
  commune: string;
  address: string;
  website: string;
  linkedin: string;
  isPublicProfile: boolean;
  // Nota: `location` ya no está en el form (deprecado en favor de region+commune
  // estructurados), pero se conserva en `ProfileUser` y en DB para no romper
  // perfiles existentes que aún lo tienen poblado. El perfil público lo sigue
  // leyendo con fallback.
}
