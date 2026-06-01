import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';
import { brandFonts } from '@/lib/fonts';

// PWA-ikon (refereras från manifest.ts).
export async function GET() {
  return new ImageResponse(iconElement(512), {
    width: 512,
    height: 512,
    fonts: await brandFonts(),
  });
}
