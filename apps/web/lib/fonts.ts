// next/og (satori) använder inte CSS-fonter, så märkets typsnitt (Newsreader
// serif + Geist sans) hämtas som woff-binärer från Fontsource via jsDelivr och
// memoiseras — hämtas en gång per funktionsinstans, och de genererade bilderna
// cachas. Server-side fetch påverkas inte av CSP.
const FONT_URLS = {
  newsreader400:
    'https://cdn.jsdelivr.net/npm/@fontsource/newsreader@5.2.5/files/newsreader-latin-400-normal.woff',
  newsreader600:
    'https://cdn.jsdelivr.net/npm/@fontsource/newsreader@5.2.5/files/newsreader-latin-600-normal.woff',
  geist400:
    'https://cdn.jsdelivr.net/npm/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff',
  geist500:
    'https://cdn.jsdelivr.net/npm/@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff',
};

const load = (url: string) => fetch(url).then((r) => r.arrayBuffer());

const fontsPromise = (async () => {
  const [newsreader400, newsreader600, geist400, geist500] = await Promise.all([
    load(FONT_URLS.newsreader400),
    load(FONT_URLS.newsreader600),
    load(FONT_URLS.geist400),
    load(FONT_URLS.geist500),
  ]);

  return [
    { name: 'Newsreader', data: newsreader400, weight: 400 as const, style: 'normal' as const },
    { name: 'Newsreader', data: newsreader600, weight: 600 as const, style: 'normal' as const },
    { name: 'Geist', data: geist400, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist', data: geist500, weight: 500 as const, style: 'normal' as const },
  ];
})();

export function brandFonts() {
  return fontsPromise;
}
