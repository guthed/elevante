import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';
import { brandFonts } from '@/lib/fonts';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  return new ImageResponse(iconElement(180), {
    ...size,
    fonts: await brandFonts(),
  });
}
