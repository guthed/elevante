import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

// Default-OG för alla publika sidor (inkl. startsidan). Ligger djupare än
// [locale]-layoutens openGraph och styr därför og:image. Per-sides
// opengraph-image.tsx (för-skolor m.fl.) överskuggar i sin tur denna.
export const alt = 'Elevante — minns allt du lär dig i skolan';
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
    eyebrow: '',
    title: sv
      ? 'Minns allt du lär dig i skolan'
      : 'Remembers everything you learn at school',
  });
}
