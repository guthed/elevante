import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/blog';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Elevante';

type Props = { params: Promise<{ locale: string; slug: string }> };

// Genererad OG-bild per artikel — används när inlägget saknar heroImage.
export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? 'Elevante';
  const category = post?.category ?? 'Blogg';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#faf7f2',
          color: '#1a1a2e',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 28,
            fontFamily: 'sans-serif',
            color: '#6b665f',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: '#ff7a6b',
              display: 'block',
            }}
          />
          Elevante · Blogg
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              fontSize: 26,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#6b665f',
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontSize: title.length > 70 ? 56 : 68,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: '#1a1a2e',
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            fontFamily: 'sans-serif',
            color: '#1a1a2e',
          }}
        >
          elevante.se
        </div>
      </div>
    ),
    { ...size },
  );
}
