import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(iconElement(32), { ...size });
}
