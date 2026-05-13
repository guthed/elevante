import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { defaultLocale, isLocale, locales } from './lib/i18n/config';

// Svenska är alltid default. Språkväljaren i headern byter till /en.
function pickLocale(): string {
  return defaultLocale; // 'sv'
}

function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { user: null, response };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  return { supabase, response };
}

// Paths som ALDRIG ska redirectas av locale-logiken.
// Matcher i config räcker inte alltid (filnamn med ~ eller andra
// specialtecken kan glida förbi negative lookahead-regex:en).
function shouldSkip(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/static/')) return true;
  // Filer med extension (favicon.ico, robots.txt, opengraph-image, etc.)
  const lastSegment = pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) return true;
  // Next.js metadata-routes (icon, opengraph-image, sitemap.xml, robots.txt)
  if (
    pathname === '/icon' ||
    pathname === '/opengraph-image' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Steg 0: hoppa över statiska assets helt
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // Steg 1: locale-redirect
  const firstSegment = pathname.split('/')[1];
  if (!firstSegment || !isLocale(firstSegment)) {
    const locale = pickLocale();
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = firstSegment;
  let response = NextResponse.next();

  // Steg 2: refresha Supabase-session för alla lokaliserade rutter
  const { supabase } = refreshSupabaseSession(request, response);
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Steg 3: skydda /[locale]/app/-rutter — kräv auth
    const isAppRoute = pathname.startsWith(`/${locale}/app`);
    const isAuthRoute = pathname.startsWith(`/${locale}/login`);

    if (isAppRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    // Steg 4: redirect inloggade användare från /login → /app
    if (isAuthRoute && user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/app`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const proxyConfig = {
  matcher: [
    // Hoppa över Next.js internals och statiska filer
    '/((?!_next/|api/|.*\\..*).*)',
  ],
};
