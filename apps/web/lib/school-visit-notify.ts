import 'server-only';
import { sendLoopsTransactional } from '@/lib/loops';

const PAGE_LABEL: Record<string, string> = {
  rektor: 'rektorssidan',
  larare: 'lärarsidan',
};

/**
 * Mejlar John när någon öppnar en personlig säljlänk. Best-effort: saknas
 * nyckel eller mall loggas det bara (Supabase har alltid datan).
 */
export async function notifySchoolVisit(
  school: string,
  page: string,
  meta: { maxScroll?: number; minutes?: number } = {},
): Promise<void> {
  const label = PAGE_LABEL[page] ?? page;
  await sendLoopsTransactional(
    process.env.LOOPS_SCHOOL_VISIT_TRANSACTIONAL_ID,
    process.env.SCHOOL_VISIT_NOTIFY_EMAIL ?? 'john@elevante.se',
    {
      headline: `${school} öppnade ${label}`,
      school,
      page: label,
      maxScroll: typeof meta.maxScroll === 'number' ? String(meta.maxScroll) : '',
      minutes: typeof meta.minutes === 'number' ? String(meta.minutes) : '',
    },
  );
}
