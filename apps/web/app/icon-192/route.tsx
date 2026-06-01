import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';

// PWA-ikon (refereras från manifest.ts).
export function GET() {
  return new ImageResponse(iconElement(192), { width: 192, height: 192 });
}
