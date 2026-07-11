import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const NOTION = 'https://api.notion.com/v1';

export type ShareRecord = {
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  message: string | null;
  locale: string;
  ip: string;
};

/** Primär logg i Supabase. Kastar vid fel (anroparen behandlar som generic). */
export async function insertShare(s: ShareRecord): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from('try_shares').insert({
    sender_name: s.senderName,
    sender_email: s.senderEmail,
    recipient_email: s.recipientEmail,
    message: s.message,
    locale: s.locale,
    ip: s.ip,
  });
  if (error) throw new Error(`try_shares insert: ${error.message}`);
}

/** Antal delningar från denna IP senaste timmen (rate-limit-underlag). */
export async function shareCountLastHour(ip: string): Promise<number> {
  const supabase = createSupabaseServiceRoleClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('try_shares')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since);
  if (error) return 0; // fail-open: loggningen är det primära, inte spärren
  return count ?? 0;
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

const title = (t: string) => ({ title: [{ text: { content: t.slice(0, 200) } }] });
const rich = (t: string) =>
  t ? { rich_text: [{ text: { content: t.slice(0, 1900) } }] } : { rich_text: [] };

async function createDelningRow(props: Record<string, unknown>): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_SHARES_DATABASE_ID;
  if (!token || !databaseId) {
    console.warn('[try-share] Notion env saknas — hoppar över.');
    return;
  }
  const res = await fetch(`${NOTION}/pages`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties: props }),
  });
  if (!res.ok) {
    console.error(`[try-share] Notion ${res.status}: ${await res.text()}`);
  }
}

/** Loggar mottagare + avsändare som två rader i Delningar-DB:n (best-effort). */
export async function logShareToNotion(s: ShareRecord): Promise<void> {
  await createDelningRow({
    Namn: title(s.recipientEmail),
    'E-post': { email: s.recipientEmail },
    Roll: { select: { name: 'Mottagare' } },
    'Delad av': rich(`${s.senderName} <${s.senderEmail}>`),
    Meddelande: rich(s.message ?? ''),
    Status: { select: { name: 'Ny' } },
  });
  await createDelningRow({
    Namn: title(s.senderName),
    'E-post': { email: s.senderEmail },
    Roll: { select: { name: 'Avsändare' } },
    Status: { select: { name: 'Ny' } },
  });
}
