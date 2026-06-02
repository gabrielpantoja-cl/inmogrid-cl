'use client';

interface ProfileBioProps {
  bio?: string | null;
  location?: string | null;
  profession?: string | null;
  company?: string | null;
  website?: string | null;
}

export default function ProfileBio({
  bio,
  location,
  profession,
  company,
  website,
}: ProfileBioProps) {
  if (!bio && !location && !profession && !company) {
    return null;
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-md md:p-8">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-800">
        <span>✨</span> Sobre mí
      </h2>

      {/* Bio principal */}
      {bio && (
        <div className="mb-6 whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
          {bio}
        </div>
      )}

      {/* Metadata */}
      {(location || profession || company || website) && (
        <div className="grid gap-3 border-t border-gray-200 pt-4 md:grid-cols-2">
          {location && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-xl">📍</span>
              <span>{location}</span>
            </div>
          )}
          {profession && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-xl">💼</span>
              <span>{profession}</span>
            </div>
          )}
          {company && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-xl">🏢</span>
              <span>{company}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-xl">🌐</span>
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline hover:text-green-600"
              >
                {website.replace(/^https?:\/\//,'').replace(/\/$/, '')}
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
