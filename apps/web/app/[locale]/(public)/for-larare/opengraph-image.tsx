import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Elevante — för lärare';
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
    eyebrow: sv ? 'För lärare' : 'For teachers',
    title: sv ? 'Du lär ut. Elevante minns.' : 'You teach. Elevante remembers.',
  });
}
