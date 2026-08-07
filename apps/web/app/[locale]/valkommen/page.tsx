import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { verifyInviteToken } from '@/lib/invites/token';
import { ClaimInviteForm } from './ClaimInviteForm';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.auth.claim.title,
    // Privat, token-gated sida — ska aldrig indexeras.
    robots: { index: false, follow: false },
  };
}

type ClaimableInvite = { id: string; email: string; full_name: string | null };

// Dekrypterar token → hämtar (service-role) user_invites-raden → null om
// token är manipulerad/ogiltig, raden saknas, redan claimad eller utgången.
// En enda felmeddelande-yta täcker alla dessa fall (se kommentar i page-body) —
// att särskilja "redan claimad" från "utgången" tillför inte mycket värde här
// och adressen har uppenbarligen redan lösts in eller inte längre är giltig.
async function loadClaimableInvite(token: string): Promise<ClaimableInvite | null> {
  const inviteId = verifyInviteToken(token);
  if (!inviteId) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data: invite } = await supabase
    .from('user_invites')
    .select('id, email, full_name, claimed_at, expires_at')
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite) return null;
  if (invite.claimed_at) return null;
  if (new Date(invite.expires_at).getTime() < Date.now()) return null;

  return { id: invite.id, email: invite.email, full_name: invite.full_name };
}

// Publik, förautentiserings-route (inte under /app) — den som klickar en
// claim-länk är inte inloggad än. Editorial Calm, samma visuella mönster som
// /login och /app/vantar-godkannande (standalone-kort, inget AppShell).
export default async function ClaimInvitePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const labels = dict.auth.claim;
  const { token } = await searchParams;

  const invite = token ? await loadClaimableInvite(token) : null;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Link
          href={`/${locale}`}
          className="font-serif text-[1.5rem] leading-none tracking-tight text-[var(--color-ink)]"
        >
          Elevante
        </Link>

        {invite && token ? (
          <>
            <div className="mt-20">
              <h1 className="font-serif text-[clamp(2.5rem,4vw+1rem,3.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {labels.title}
              </h1>
              <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {labels.subtitle}
              </p>
            </div>

            <div className="mt-10">
              <ClaimInviteForm
                locale={locale}
                token={token}
                email={invite.email}
                fullName={invite.full_name ?? ''}
                labels={labels}
              />
            </div>
          </>
        ) : (
          <div className="mt-20">
            <h1 className="font-serif text-[clamp(2rem,3vw+1rem,2.75rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
              {labels.invalidTitle}
            </h1>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {labels.errorInviteInvalid}
            </p>
            <Link
              href={`/${locale}/login`}
              className="mt-8 inline-block text-sm font-medium text-[var(--color-accent)] underline underline-offset-4"
            >
              {labels.backToLogin}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
