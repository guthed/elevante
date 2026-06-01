import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';
import { brandFonts } from '@/lib/fonts';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  return new ImageResponse(iconElement(32), {
    ...size,
    fonts: await brandFonts(),
  });
}
