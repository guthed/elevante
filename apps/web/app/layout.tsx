import type { ReactNode } from 'react';
import { Geist, Newsreader } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      // lang sätts av [locale]/layout — detta är bara en fallback innan redirect
      lang="sv"
      className={`${geist.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
