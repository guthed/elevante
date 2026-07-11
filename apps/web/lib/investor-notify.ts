import { sendLoopsTransactional } from '@/lib/loops';

type Meta = { locale?: string; maxScroll?: number };

/**
 * Mejlar John när en investerare öppnar decket ('open') eller når the ask ('ask').
 * Graceful fallback via Loops-klienten: saknas nyckel loggas bara.
 */
export async function notifyInvestorEvent(
  kind: 'open' | 'ask',
  label: string,
  meta: Meta = {},
): Promise<void> {
  const to = process.env.INVESTOR_NOTIFY_EMAIL ?? 'john@elevante.se';
  const headline =
    kind === 'open' ? `${label} öppnade investerardecket` : `${label} nådde "the ask"`;
  await sendLoopsTransactional(process.env.LOOPS_INVESTOR_NOTIS_ID, to, {
    headline,
    investor: label,
    locale: meta.locale ?? '',
    maxScroll: typeof meta.maxScroll === 'number' ? `${meta.maxScroll}%` : '',
  });
}
