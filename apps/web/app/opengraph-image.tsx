import { ImageResponse } from 'next/og';

export const alt = 'Elevante — minns allt du lär dig i skolan';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
          background: '#ffffff',
          color: '#1A1A2E',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontFamily: 'sans-serif',
            color: '#5b5e72',
            letterSpacing: -0.5,
          }}
        >
          Elevante
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
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: -2,
              fontFamily: 'serif',
              color: '#1A1A2E',
            }}
          >
            Skolan i fickan
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#5b5e72',
              fontFamily: 'sans-serif',
              maxWidth: 900,
            }}
          >
            Vi spelar in, transkriberar och minns allt som sägs i klassrummet.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 26,
            color: '#4F7FFF',
            fontFamily: 'sans-serif',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#4F7FFF',
              display: 'block',
            }}
          />
          elevante.se
        </div>
      </div>
    ),
    { ...size },
  );
}
