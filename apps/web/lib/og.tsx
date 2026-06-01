import { ImageResponse } from 'next/og';

// Delad OG-bildsrenderare. Editorial Calm: ivory canvas, ink serif-rubrik,
// Elevante-ordmärke uppe till vänster, elevante.se nere. Används av den globala
// OG-bilden och per-sides OG-bilder.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export function ogImageResponse({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
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
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 38 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: '#ff7a6b',
                display: 'block',
              }}
            />
            <span>Elevante</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#6b665f',
            }}
          >
            {eyebrow}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 48 ? 64 : 82,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 26,
            fontFamily: 'sans-serif',
            color: '#1a1a2e',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: '#b8c5a6',
              display: 'block',
            }}
          />
          elevante.se
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
