import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Elevante — för skolor';
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
    eyebrow: sv ? 'För skolor' : 'For schools',
    title: sv
      ? 'Hela skolan, inte bara en klass.'
      : 'The whole school, not just one class.',
  });
}
