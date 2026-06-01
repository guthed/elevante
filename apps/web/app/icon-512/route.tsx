import { ImageResponse } from 'next/og';
import { iconElement } from '@/lib/icon';

// PWA-ikon (refereras från manifest.ts).
export function GET() {
  return new ImageResponse(iconElement(512), { width: 512, height: 512 });
}
