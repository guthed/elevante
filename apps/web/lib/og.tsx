import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';
import { brandFonts } from './fonts';

// Delad OG-bildsrenderare. Editorial Calm: ivory canvas, Newsreader-rubrik
// (märkets serif), Geist för UI-text. Foto till höger, text till vänster.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

async function heroImageData(): Promise<string> {
  const filePath = path.join(process.cwd(), 'public/images/teacher-whiteboard.jpg');
  const data = await readFile(filePath);
  return `data:image/jpeg;base64,${data.toString('base64')}`;
}

export async function ogImageResponse({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const [fonts, imgSrc] = await Promise.all([brandFonts(), heroImageData()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#faf7f2',
          color: '#1a1a2e',
          fontFamily: 'Newsreader',
        }}
      >
        {/* Vänster — text */}
        <div
          style={{
            flex: '0 0 620px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 56px 64px 72px',
          }}
        >
          {/* Logotyp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 36 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#ff7a6b',
                display: 'block',
              }}
            />
            <span style={{ fontWeight: 600 }}>Elevante</span>
          </div>

          {/* Rubrik */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {eyebrow ? (
              <div
                style={{
                  fontFamily: 'Geist',
                  fontWeight: 500,
                  fontSize: 20,
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  color: '#6b665f',
                  display: 'flex',
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <div
              style={{
                fontWeight: 400,
                fontSize: title.length > 40 ? 58 : 72,
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              {title}
            </div>
          </div>

          {/* Domän */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'Geist',
              fontWeight: 400,
              fontSize: 24,
              color: '#6b665f',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#b8c5a6',
                display: 'block',
              }}
            />
            elevante.se
          </div>
        </div>

        {/* Höger — foto */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
            }}
          />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
