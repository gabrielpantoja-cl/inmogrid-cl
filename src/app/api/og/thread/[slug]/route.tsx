import { ImageResponse } from 'next/og';
import { getThreadBySlug } from '@/features/forum';

export const runtime = 'nodejs';
// Cachea 1h en el CDN de Vercel. Si el hilo cambia título/tags dentro de esa
// hora, el preview social queda desfasado — aceptable vs. hit de DB por petición.
export const revalidate = 3600;

interface Params {
  params: Promise<{ slug: string }>;
}

const BG = '#0b1220';
const FG = '#f8fafc';
const ACCENT = '#f5b301';
const MUTED = '#94a3b8';

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);

  const title = thread?.title ?? 'Hilo no encontrado';
  const author =
    thread?.author?.fullName ?? thread?.author?.username ?? 'inmogrid';
  const tags = (thread?.tags ?? []).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: `linear-gradient(135deg, ${BG} 0%, #111827 100%)`,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BG,
              fontWeight: 800,
              fontSize: 28,
            }}
          >
            i
          </div>
          <div
            style={{
              color: FG,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            inmogrid<span style={{ color: ACCENT }}>.cl</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ color: MUTED, fontSize: 24, fontWeight: 500 }}>
            Foro de la comunidad
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div
            style={{
              color: FG,
              fontSize: title.length > 80 ? 56 : 68,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    color: ACCENT,
                    fontSize: 24,
                    fontWeight: 600,
                    background: 'rgba(245, 179, 1, 0.12)',
                    padding: '8px 18px',
                    borderRadius: 999,
                  }}
                >
                  #{tag}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: MUTED,
            fontSize: 26,
          }}
        >
          <div>
            por <span style={{ color: FG, fontWeight: 600 }}>{author}</span>
          </div>
          <div>inmogrid.cl/foro</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
