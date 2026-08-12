import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { sendLoopsTransactional } from '@/lib/loops';
import type { UserRole } from '@/lib/supabase/database';
import type { Locale } from '@/lib/i18n/config';

export type InviteUserInput = {
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  schoolName: string;
  className?: string;
  locale: Locale;
};

export type InviteUserResult =
  | { ok: true; userId: string }
  | { ok: false; code: 'already-exists' | 'generic'; detail?: string };

const roleLabels: Record<Locale, Record<UserRole, string>> = {
  sv: { student: 'Elev', teacher: 'Lärare', admin: 'Administratör' },
  en: { student: 'Student', teacher: 'Teacher', admin: 'Admin' },
};

type ServiceRoleClient = ReturnType<typeof createSupabaseServiceRoleClient>;
type GenerateLinkParams = Parameters<ServiceRoleClient['auth']['admin']['generateLink']>[0];

type GenerateLinkAttempt =
  | { ok: true; userId: string; actionLink: string }
  | { ok: false; alreadyExists: boolean; detail: string };

// Ett enskilt generateLink-anrop — skiljer på "kontot finns redan" och
// övriga fel så anroparen kan avgöra om ett omförsök (annan `type`) är
// meningsfullt.
async function attemptGenerateLink(
  supabase: ServiceRoleClient,
  params: GenerateLinkParams,
): Promise<GenerateLinkAttempt> {
  const { data, error } = await supabase.auth.admin.generateLink(params);

  if (error) {
    const code = 'code' in error ? error.code : undefined;
    const msg = error.message.toLowerCase();
    const alreadyExists =
      code === 'email_exists' ||
      code === 'user_already_exists' ||
      msg.includes('already') ||
      msg.includes('registered');
    return { ok: false, alreadyExists, detail: error.message };
  }
  if (!data.user || !data.properties?.action_link) {
    return { ok: false, alreadyExists: false, detail: 'Ingen inbjudningslänk returnerades' };
  }
  return { ok: true, userId: data.user.id, actionLink: data.properties.action_link };
}

// Delad av inviteUser (app/actions/admin.ts, en-och-en) och
// importStudents (bulk via CSV) — båda ska skapa kontot på samma sätt.
//
// generateLink({type: 'invite'}) skapar kontot + returnerar en länk men
// skickar INGET mejl (till skillnad från inviteUserByEmail, som skickar via
// Supabases inbyggda e-posttjänst — verifierat live: 429
// over_email_send_rate_limit efter 3 inbjudningar i följd, vilket gör
// 40-rader-CSV-importen obrukbar). Vi skickar själva mejlet via Loops
// istället — samma motor som all annan transaktionell e-post i appen.
export async function inviteUserCore(
  input: InviteUserInput,
): Promise<InviteUserResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = createSupabaseServiceRoleClient();
  const redirectTo = `${siteUrl}/${input.locale}/auth/confirm?next=/${input.locale}/app/${input.role}/konto`;

  let attempt = await attemptGenerateLink(supabase, {
    type: 'invite',
    email: input.email,
    options: {
      data: {
        full_name: input.fullName,
        role: input.role,
        school_id: input.schoolId,
      },
      redirectTo,
    },
  });

  if (!attempt.ok && attempt.alreadyExists) {
    // GoTrue avvisar generateLink/inviteUserByEmail med type:'invite' för
    // ALLA befintliga användare, bekräftade eller ej (dokumenterad
    // uppströmsbegränsning, supabase/auth#2180). Om kontot skapades men
    // Loops-mejlet aldrig gick fram (mallen inte publicerad än, tillfälligt
    // strul) skulle varje omförsök annars fastna här för alltid — adminen
    // ser bara "kontot finns redan" utan väg framåt, och i CSV-importen
    // skulle den befintliga class-link-återhämtningen (Task 15) tyst
    // räkna eleven som färdiginbjuden trots att hen aldrig kan få ett
    // fungerande mejl. type:'magiclink' fungerar för befintliga användare
    // oavsett confirmation-state och ger samma implicit-flow-länk
    // (#access_token=...) som /auth/confirm redan hanterar — gör om
    // omförsöket till ett riktigt omskick istället för en återvändsgränd.
    const fallback = await attemptGenerateLink(supabase, {
      type: 'magiclink',
      email: input.email,
      options: { redirectTo },
    });
    if (!fallback.ok) {
      // Både invite- och magiclink-försöket avvisades — det här är nu det
      // genuint sällsynta, permanent fastlåsta fallet.
      return { ok: false, code: 'already-exists' };
    }
    attempt = fallback;
  }

  if (!attempt.ok) {
    return { ok: false, code: 'generic', detail: attempt.detail };
  }

  const classWord = input.locale === 'en' ? 'class' : 'klass';
  const schoolAndClass = input.className
    ? `${input.schoolName}, ${classWord} ${input.className}`
    : input.schoolName;

  const templateId =
    input.locale === 'en'
      ? process.env.LOOPS_INVITE_TRANSACTIONAL_ID_EN
      : process.env.LOOPS_INVITE_TRANSACTIONAL_ID_SV;

  const sent = await sendLoopsTransactional(templateId, input.email, {
    recipientName: input.fullName,
    roleLabel: roleLabels[input.locale][input.role],
    schoolAndClass,
    inviteUrl: attempt.actionLink,
  });

  if (!sent) {
    return { ok: false, code: 'generic', detail: 'E-post kunde inte skickas via Loops' };
  }

  return { ok: true, userId: attempt.userId };
}
