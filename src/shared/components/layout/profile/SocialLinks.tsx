'use client';

interface SocialLinksProps {
  externalLinks?: any; // JSON con { whatsapp, instagram, linkedin, etc. }
  email?: string;
}

export default function SocialLinks({ externalLinks, email }: SocialLinksProps) {
  if (!externalLinks && !email) {
    return null;
  }

  const links = externalLinks || {};

  return (
    <div className="flex flex-wrap gap-3">
      {/* WhatsApp */}
      {links.whatsapp && (
        <a
          href={`https://wa.me/${links.whatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-green-600 hover:text-green-600 hover:shadow-md"
        >
          <span className="text-xl">📱</span>
          <span>WhatsApp</span>
        </a>
      )}

      {/* Instagram */}
      {links.instagram && (
        <a
          href={`https://instagram.com/${links.instagram.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-pink-600 hover:text-pink-600 hover:shadow-md"
        >
          <span className="text-xl">📷</span>
          <span>Instagram</span>
        </a>
      )}

      {/* LinkedIn */}
      {links.linkedin && (
        <a
          href={links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-md"
        >
          <span className="text-xl">💼</span>
          <span>LinkedIn</span>
        </a>
      )}

      {/* Email */}
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-600 hover:text-gray-600 hover:shadow-md"
        >
          <span className="text-xl">✉️</span>
          <span>Email</span>
        </a>
      )}

      {/* GitHub (si existe) */}
      {links.github && (
        <a
          href={`https://github.com/${links.github.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-800 hover:text-gray-800 hover:shadow-md"
        >
          <span className="text-xl">💻</span>
          <span>GitHub</span>
        </a>
      )}

      {/* Sitio web personalizado */}
      {links.website && (
        <a
          href={links.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-green-700 hover:text-green-700 hover:shadow-md"
        >
          <span className="text-xl">🌐</span>
          <span>Sitio Web</span>
        </a>
      )}
    </div>
  );
}
