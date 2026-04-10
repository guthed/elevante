import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, locales } from './lib/i18n/config';

function pickLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return defaultLocale;
  // Parse "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7" → first matching locale
  const parts = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0]!.trim().toLowerCase());
  for (const part of parts) {
    const base = part.split('-')[0]!;
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if already localised
  const pathLocale = pathname.split('/')[1];
  if (pathLocale && isLocale(pathLocale)) {
    return NextResponse.next();
  }

  const locale = pickLocale(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const proxyConfig = {
  matcher: [
    // Skip Next.js internals, static files, and common public assets
    '/((?!_next/|api/|.*\\..*).*)',
  ],
};
