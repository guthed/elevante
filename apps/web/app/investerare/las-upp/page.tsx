import type { Metadata } from 'next';
import UnlockForm from './UnlockForm';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — investerardeck' },
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next?.startsWith('/investerare') ? sp.next : '/investerare';
  const lang = sp.lang === 'en' ? 'en' : 'sv';
  const sv = lang === 'sv';
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
      <div className="w-full max-w-sm">
        <p className="eyebrow flex items-center gap-3">
          <span className="inline-block h-px w-9 bg-coral" aria-hidden />
          Elevante
        </p>
        <h1 className="mt-5 font-serif text-4xl">{sv ? 'Investerardeck' : 'Investor deck'}</h1>
        <p className="mt-3 mb-8 text-ink-secondary">
          {sv ? 'Ange lösenordet för att se presentationen.' : 'Enter the password to view the presentation.'}
        </p>
        <UnlockForm next={next} lang={lang} />
      </div>
    </main>
  );
}
