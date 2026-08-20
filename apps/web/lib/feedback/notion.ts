import 'server-only';
import type { FeedbackCategory } from '@/lib/supabase/database';
import { notionCategoryLabel } from './copy';
import { notionSurfaceLabel, type FeedbackSurface } from './surface';
import { formatContextLine, type FeedbackContext } from './context';

const NOTION = 'https://api.notion.com/v1';

export type FeedbackNotionRecord = {
  category: FeedbackCategory;
  surface: FeedbackSurface;
  message: string | null;
  context: FeedbackContext;
  schoolName: string | null;
  className: string | null;
  /** Ogenomskinlig referens — ALDRIG namn eller mejl. */
  studentRef: string;
};

const rich = (t: string | null) =>
  t ? { rich_text: [{ text: { content: t.slice(0, 1900) } }] } : { rich_text: [] };

/**
 * Rubriken är det man ser i listvyn: vad eleven valde + var det hände.
 * Lektionstiteln vinner över ytan när den finns — den är mer specifik.
 */
function buildTitle(r: FeedbackNotionRecord): string {
  const where = r.context.lessonTitle?.trim() || notionSurfaceLabel(r.surface);
  return `${notionCategoryLabel(r.category)} — ${where}`.slice(0, 200);
}

/**
 * Skriver rapporten till 💬 Elevante – Elevfeedback. Kastar aldrig — Supabase
 * är sanningen, Notion är arbetsytan, och en trasig Notion-integration får
 * aldrig kosta oss en elevrapport. Returnerar sidans id vid framgång så
 * anroparen kan skriva tillbaka det till raden.
 *
 * Fällan att minnas: databasen måste kopplas MANUELLT till den integration
 * appen skriver via ("Elevante leads" i prod, "Claude sync" lokalt). Missas
 * det svarar Notion 404 och skrivningen faller tyst — precis det som hände
 * delningsloggen. Därför loggas statuskoden alltid.
 */
export async function logFeedbackToNotion(
  r: FeedbackNotionRecord,
): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_FEEDBACK_DATABASE_ID;
  if (!token || !databaseId) {
    console.warn('[feedback] Notion env saknas (NOTION_TOKEN/NOTION_FEEDBACK_DATABASE_ID) — hoppar över.');
    return null;
  }

  const properties = {
    Rubrik: { title: [{ text: { content: buildTitle(r) } }] },
    'Eleven valde': { select: { name: notionCategoryLabel(r.category) } },
    'Var i appen': { select: { name: notionSurfaceLabel(r.surface) } },
    'Vad eleven skrev': rich(r.message),
    Lektion: rich(r.context.lessonTitle ?? null),
    Klass: rich(r.className),
    Skola: rich(r.schoolName),
    Kontext: rich(formatContextLine(r.context)),
    Elevreferens: rich(r.studentRef),
    Status: { select: { name: 'Ny' } },
  };

  try {
    const res = await fetch(`${NOTION}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    });
    if (!res.ok) {
      console.error(`[feedback] Notion ${res.status}: ${await res.text()}`);
      return null;
    }
    const page = (await res.json()) as { id?: string };
    return page.id ?? null;
  } catch (err) {
    console.error('[feedback] Notion-anrop misslyckades:', err);
    return null;
  }
}
