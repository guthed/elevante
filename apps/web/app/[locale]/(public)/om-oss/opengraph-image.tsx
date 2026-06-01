import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Elevante — om oss';
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
    eyebrow: sv ? 'Om oss' : 'About',
    title: sv
      ? 'Vi byggde det som saknades i klassrummet.'
      : 'We built what was missing in the classroom.',
  });
}
