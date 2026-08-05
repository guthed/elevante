// Porträtt för demo-kontona. Syntetiska (AI-genererade) ansikten — inga riktiga
// personer — så demon känns som ett klassrum i stället för en rad initialer.
// Riktiga användare har inget porträtt här och faller tillbaka på initialer.

const AVATARS: Record<string, string> = {
  // NA1A — demo-elever
  'alma nyström': '/avatars/alma-nystrom.jpg',
  'elin bergström': '/avatars/elin-bergstrom.jpg',
  'lukas persson': '/avatars/lukas-persson.jpg',
  'maja karlsson': '/avatars/maja-karlsson.jpg',
  'mira holm': '/avatars/mira-holm.jpg',
  'oskar lindberg': '/avatars/oskar-lindberg.jpg',
  'sara svensson': '/avatars/sara-svensson.jpg',
  'theo eriksson': '/avatars/theo-eriksson.jpg',
  // Lärare
  'anna andersson': '/avatars/anna-andersson.jpg',
  // Investerardeckets demo-klass (se app/investerare/demo-insight.ts)
  'astrid lindqvist': '/avatars/astrid-lindqvist.jpg',
  'hugo bergström': '/avatars/hugo-bergstrom.jpg',
  'maja nyström': '/avatars/maja-nystrom.jpg',
  'elias holm': '/avatars/elias-holm.jpg',
  'saga lund': '/avatars/saga-lund.jpg',
  'vincent falk': '/avatars/vincent-falk.jpg',
};

/** Porträtt-URL för ett fullständigt namn, eller null om personen saknar bild. */
export function avatarFor(name: string | null | undefined): string | null {
  if (!name) return null;
  return AVATARS[name.trim().toLowerCase()] ?? null;
}
