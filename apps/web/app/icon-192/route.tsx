import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';
import { brandFonts } from '@/lib/fonts';

// PWA-ikon (refereras från manifest.ts).
export async function GET() {
  return new ImageResponse(iconElement(192), {
    width: 192,
    height: 192,
    fonts: await brandFonts(),
  });
}
