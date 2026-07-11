import { sendLoopsTransactional } from '@/lib/loops';

type Meta = { locale?: string; maxScroll?: number };

/**
 * Mejlar John när en investerare öppnar decket ('open') eller når the ask ('ask').
 * Best-effort: felar Loops eller saknas nyckel/id loggas det bara (inget kast).
 */
export async function notifyInvestorEvent(
  kind: 'open' | 'ask',
  label: string,
  meta: Meta = {},
): Promise<void> {
  const headline =
    kind === 'open' ? `${label} öppnade investerardecket` : `${label} nådde "the ask"`;

  // Investerarnotiser går alltid till john@elevante.se (ärver inte CONTACT_TO_EMAIL,
  // som kan peka på en annan inbox). Kan överstyras med INVESTOR_NOTIFY_EMAIL.
  await sendLoopsTransactional(
    process.env.LOOPS_INVESTOR_TRANSACTIONAL_ID,
    process.env.INVESTOR_NOTIFY_EMAIL ?? 'john@elevante.se',
    {
      headline,
      investor: label,
      locale: meta.locale ?? '',
      maxScroll: typeof meta.maxScroll === 'number' ? String(meta.maxScroll) : '',
    },
  );
}
