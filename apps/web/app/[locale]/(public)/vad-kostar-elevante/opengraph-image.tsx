import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Elevante — vad kostar det?';
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
    eyebrow: sv ? 'Priskalkylator' : 'Price calculator',
    title: sv
      ? 'Vad kostar Elevante för er skola?'
      : 'What does Elevante cost for your school?',
  });
}
