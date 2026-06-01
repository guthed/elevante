import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(iconElement(180), { ...size });
}
