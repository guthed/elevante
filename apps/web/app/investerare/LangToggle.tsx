import Link from 'next/link';
import type { Lang } from './content';

export default function LangToggle({ lang }: { lang: Lang }) {
  const base = 'px-2.5 py-1 text-sm rounded-full transition-colors';
  return (
    <nav className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full bg-surface/80 px-1 py-1 shadow-soft backdrop-blur" aria-label="Språk / Language">
      <Link href="/investerare" aria-current={lang === 'sv' ? 'true' : undefined}
        className={`${base} ${lang === 'sv' ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}>SV</Link>
      <Link href="/investerare/en" aria-current={lang === 'en' ? 'true' : undefined}
        className={`${base} ${lang === 'en' ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}>EN</Link>
    </nav>
  );
}
