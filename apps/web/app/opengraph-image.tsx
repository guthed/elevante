import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Elevante — minns allt du lär dig i skolan';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return ogImageResponse({
    eyebrow: '',
    title: 'Minns allt du lär dig i skolan',
  });
}
