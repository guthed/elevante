import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { defaultLocale, isLocale } from './lib/i18n/config';

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

// Subdomän riktad till intresserade skolor. All sidtrafik på denna host
// servar scroll-presentationen (/skolan); assets (_next, bilder) har redan
// släppts igenom av shouldSkip innan host-kontrollen körs.
const SCHOOLS_HOST_PREFIX = 'skolor.';

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

  // Bloggen är svensk-only. Eventuella /en/blogg-URL:er redirectas permanent
  // till den svenska canonical-versionen — undviker mjuk 404 (status 200 på en
  // förrenderad notFound).
  if (pathname === '/en/blogg' || pathname.startsWith('/en/blogg/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/en/blogg', '/sv/blogg');
    return NextResponse.redirect(url, 308);
  }

  // Steg 0.5: skolor.elevante.se → scroll-presentationen för skolor.
  // Subdomänen är enkelspårig: all sidtrafik rewritas till /skolan (men
  // URL:en i webbläsaren förblir ren). /rektor-decket nås på huvuddomänen.
  const host = (request.headers.get('host') ?? '').toLowerCase();
  if (host.startsWith(SCHOOLS_HOST_PREFIX)) {
    if (pathname === '/skolan') {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/skolan';
    return NextResponse.rewrite(url);
  }

  // Steg 1: locale-redirect
  // Endast root `/` redirectar till default-locale (308 permanent).
  // Okända top-level-segment (t.ex. `/no`, `/fr`) släpps igenom så Next
  // returnerar 404 i stället för att skapa mjuka 404:or via `/sv/no`.
  const firstSegment = pathname.split('/')[1];
  if (!firstSegment) {
    const locale = pickLocale();
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url, 308);
  }
  if (!isLocale(firstSegment)) {
    return NextResponse.next();
  }

  const locale = firstSegment;
  let response = NextResponse.next();

  // Steg 2: bara auth-relaterade rutter behöver Supabase-session.
  // De publika marknadssidorna är statiska och ska INTE betala för en
  // getUser()-roundtrip till Supabase Auth vid varje navigering.
  const isAppRoute = pathname.startsWith(`/${locale}/app`);
  const isAuthRoute = pathname.startsWith(`/${locale}/login`);
  if (!isAppRoute && !isAuthRoute) {
    return response;
  }

  // Steg 3: refresha Supabase-session + skydda/omdirigera auth-rutter
  const { supabase } = refreshSupabaseSession(request, response);
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAppRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    // Redirect inloggade användare från /login → /app
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
