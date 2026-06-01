import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Elevante — kontakt';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sv = locale === 'sv';
  return ogImageResponse({
    eyebrow: sv ? 'Kontakt' : 'Contact',
    title: sv ? 'Hör av dig.' : 'Get in touch.',
  });
}
