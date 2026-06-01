import { ImageResponse } from 'next/og';
import { brandFonts } from './fonts';

// Delad OG-bildsrenderare. Editorial Calm: ivory canvas, Newsreader-rubrik
// (märkets serif), Geist för UI-text. Används av den globala OG-bilden och
// per-sides OG-bilder.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export async function ogImageResponse({
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
          fontFamily: 'Newsreader',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 40 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: '#ff7a6b',
                display: 'block',
              }}
            />
            <span style={{ fontWeight: 600 }}>Elevante</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Geist',
              fontWeight: 500,
              fontSize: 24,
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
            fontWeight: 400,
            fontSize: title.length > 48 ? 66 : 86,
            lineHeight: 1.05,
            letterSpacing: -1,
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
            fontFamily: 'Geist',
            fontWeight: 400,
            fontSize: 26,
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
    { ...OG_SIZE, fonts: await brandFonts() },
  );
}
