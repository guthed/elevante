import { sendLoopsTransactional } from '@/lib/loops';
import { SITE_URL } from '@/lib/site';
import { signInviteToken } from './token';

type SendInviteEmailParams = {
  inviteId: string;
  email: string;
  name: string;
  schoolName: string;
};

// Mejl-länk-flödet saknar locale-kontext vid invite-skapande (den som bjuder in
// vet inte nödvändigtvis mottagarens språkpreferens) — vi landar därför alltid
// på svenska /valkommen, som är kodbasens defaultLocale.
const CLAIM_LOCALE = 'sv';

/**
 * Skickar claim-mejlet via Loops till en nybjuden användare (roster-only-flödet,
 * skolor utan SSO). Best-effort: loggar men stoppar aldrig anroparens flöde vid
 * mejlfel — samma mönster som lib/try/share-log.ts / try-share.ts.
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const claimUrl = `${SITE_URL}/${CLAIM_LOCALE}/valkommen?token=${signInviteToken(params.inviteId)}`;

  await sendLoopsTransactional(process.env.LOOPS_INVITE_TRANSACTIONAL_ID, params.email, {
    name: params.name,
    schoolName: params.schoolName,
    claimUrl,
  });
}
