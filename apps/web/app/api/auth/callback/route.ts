import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

// Supabase mail-bekräftelselänkar OCH Google/Microsoft-OAuth landar här.
// Vi byter code → session och redirectar till `next`-URL:en.
//
// Provisionerad inloggning: handle_new_auth_user() sätter alltid `pending` på
// nya profiler. För OAuth-inloggningar (Google/Microsoft) kör vi därför en
// 3-stegs gating här innan vi litar på kontot:
//   1. Obruten user_invites-träff (e-post, ej inlöst, ej utgången) → aktivera
//      profilen med invitens role/school_id och redirecta till `next`.
//   2. Ingen invite, men e-postens domän matchar en skolas identity_domain →
//      lämna profilen `pending` och redirecta till väntesidan.
//   3. Ingen träff alls → radera det nyss skapade auth-kontot, logga ut och
//      redirecta till /login med ett tydligt felmeddelande.
// Återkommande inloggningar (profilen redan `active`) går rakt igenom
// oförändrat, precis som lösenordsflödet.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/sv/app';
  const locale = localeFromNext(next);

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return NextResponse.redirect(`${origin}/${locale}/login?error=config`);
    }

    // Alla efterföljande redirects (oavsett gating-utfall) återanvänder den
    // här responsen så att cookie-jarrets Set-Cookie-headers — satta av
    // exchangeCodeForSession nedan, och senare ev. av signOut() — faktiskt
    // följer med. Att bygga en ny NextResponse.redirect() senare skulle
    // tappa dem: `createServerClient`s `setAll` skriver bara till *den här*
    // objektinstansen.
    const response = NextResponse.redirect(`${origin}${next}`);
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const provider = data.user.app_metadata.provider;
      const isOAuth = provider === 'google' || provider === 'azure';

      if (!isOAuth) {
        // Lösenordsflödet (mejl-bekräftelse) — oförändrat.
        return response;
      }

      return handleOAuthGating({
        userId: data.user.id,
        email: data.user.email,
        locale,
        origin,
        response,
        supabase,
      });
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=callback`);
}

// `next` är alltid `/${locale}/app`-format (satt av SsoButtons/signUp).
// Default `sv` om något oväntat skulle sakna prefixet.
function localeFromNext(next: string): 'sv' | 'en' {
  const segment = next.split('/').filter(Boolean)[0];
  return segment === 'en' ? 'en' : 'sv';
}

// `identity_domain` kan ha sparats med vilken casing en admin råkade skriva
// in — jämförelsen måste vara case-insensitive. `.eq()` är det inte, så vi
// använder `.ilike()` (case-insensitive) och escapar bort ILIKE:s egna
// wildcard-tecken (`%`, `_`, `\`) så matchningen förblir exakt, inte ett
// mönster — domännamn kan i teorin innehålla understreck.
function escapeForIlike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

type GatingArgs = {
  userId: string;
  email: string | undefined;
  locale: 'sv' | 'en';
  origin: string;
  response: NextResponse;
  supabase: ReturnType<typeof createServerClient>;
};

async function handleOAuthGating({
  userId,
  email,
  locale,
  origin,
  response,
  supabase,
}: GatingArgs): Promise<NextResponse> {
  try {
    // Service-role rakt igenom: en färsk `pending`-profil har ingen RLS-åtkomst
    // till user_invites/schools alls (admin-scopad policy, och school_id är
    // null tills den här gatingen sätter den) — så hela blocket, inklusive den
    // inledande status-läsningen på den egna profilen, körs med service-role
    // för enkelhetens skull och konsekvens.
    const serviceRole = createSupabaseServiceRoleClient();

    const { data: profile } = await serviceRole
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || profile.status !== 'pending') {
      // Återkommande inloggning på ett redan aktiverat (eller inaktiverat)
      // konto — oförändrat rakt igenom.
      return response;
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      // Google/Microsoft ger alltid e-post med `email`-scopet, men krascha
      // aldrig om den ändå saknas — behandla som "ingen träff".
      return await rejectUnauthorizedUser({ serviceRole, userId, supabase, response, origin, locale });
    }

    // Tier 1: obruten invite på e-posten. `.ilike()` + escape ger samma
    // case-insensitive-men-exakta matchning som mot `lower(email)` — den
    // faktiska `email`-kolumnen kan vara sparad i vilken casing en admin (eller
    // ett CSV-import-flöde) råkade skriva in.
    const { data: invite } = await serviceRole
      .from('user_invites')
      .select('id, school_id, role')
      .ilike('email', escapeForIlike(normalizedEmail))
      .is('claimed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invite) {
      await serviceRole
        .from('profiles')
        .update({ role: invite.role, school_id: invite.school_id, status: 'active' })
        .eq('id', userId);
      await serviceRole
        .from('user_invites')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', invite.id);

      // `response` redirectar redan till `${origin}${next}` — inget att ändra.
      return response;
    }

    // Tier 2: ingen invite, men e-postens domän matchar en skolas
    // identity_domain (Google Workspace eller Microsoft 365 — samma kolumn).
    const domain = normalizedEmail.split('@')[1];
    if (domain) {
      const { data: school } = await serviceRole
        .from('schools')
        .select('id')
        .ilike('identity_domain', escapeForIlike(domain))
        .maybeSingle();

      if (school) {
        // Lämna profilen pending (school_id förblir null) — vantar-godkannande
        // gör det tydligt att en admin behöver godkänna manuellt.
        response.headers.set('Location', `${origin}/${locale}/app/vantar-godkannande`);
        return response;
      }
    }

    // Tier 3: ingen träff alls.
    return await rejectUnauthorizedUser({ serviceRole, userId, supabase, response, origin, locale });
  } catch {
    // Feltrappat konto (saknad SUPABASE_SERVICE_ROLE_KEY i en preview-miljö,
    // eller ett transient Supabase-fel mot profiles/user_invites/schools/
    // admin.deleteUser) ska aldrig krascha routen med ett rått 500 — samma
    // `response`-objekt återanvänds så att ev. redan satta Set-Cookie-headers
    // (från exchangeCodeForSession) följer med, precis som i alla andra grenar.
    response.headers.set('Location', `${origin}/${locale}/login?error=config`);
    return response;
  }
}

async function rejectUnauthorizedUser({
  serviceRole,
  userId,
  supabase,
  response,
  origin,
  locale,
}: {
  serviceRole: ReturnType<typeof createSupabaseServiceRoleClient>;
  userId: string;
  supabase: ReturnType<typeof createServerClient>;
  response: NextResponse;
  origin: string;
  locale: 'sv' | 'en';
}): Promise<NextResponse> {
  await serviceRole.auth.admin.deleteUser(userId);
  // Rensar sessionscookien i webbläsaren via samma `response`-objekt (och
  // dess `setAll`-callback) som exchangeCodeForSession skrev till ovan —
  // annars fastnar användaren "inloggad" mot ett konto som just raderades.
  await supabase.auth.signOut();

  response.headers.set('Location', `${origin}/${locale}/login?error=unauthorized-domain`);
  return response;
}
