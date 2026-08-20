import type { FeedbackSurface } from './surface';

/**
 * Det som en vy kan registrera om VAD eleven tittade på när hen tryckte.
 * Registreras av vyerna själva (se useFeedbackItem) — allt är valfritt, en
 * rapport från en vy som inte registrerat något är fortfarande giltig.
 *
 * Fälten är innehåll eleven redan ser på skärmen. Ingenting hämtas i smyg,
 * och bladet visar sammanfattningen av vad som bifogas innan hen skickar.
 */
export type FeedbackItemContext = {
  lessonId?: string | null;
  lessonTitle?: string | null;
  itemType?: 'flashcard' | 'knowledge_check';
  itemId?: string | null;
  /** Kortets framsida eller frågans text — så en rapport går att hitta i materialet. */
  itemLabel?: string | null;
  conceptName?: string | null;
};

/** Sparas i feedback_reports.context och sammanfattas i Notions Kontext-fält. */
export type FeedbackContext = FeedbackItemContext & {
  surface: FeedbackSurface;
  /** Sidans URL utan locale-prefix — locale sparas separat. */
  path: string;
  locale: string;
};

const MAX_LABEL = 200;

function trim(v: string | null | undefined, max = MAX_LABEL): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Notions Kontext-fält är EN textrad man ska kunna skumma i en tabellvy —
 * inte en JSON-dump. Den fullständiga strukturen finns kvar i Supabase.
 */
export function formatContextLine(ctx: FeedbackContext): string {
  const parts: string[] = [`Sida: ${ctx.path}`];
  if (ctx.conceptName) parts.push(`Begrepp: ${trim(ctx.conceptName, 80)}`);
  if (ctx.itemType && ctx.itemId) {
    const kind = ctx.itemType === 'flashcard' ? 'Kort' : 'Fråga';
    parts.push(`${kind}: ${ctx.itemId}`);
  }
  if (ctx.itemLabel) parts.push(`Innehåll: "${trim(ctx.itemLabel)}"`);
  parts.push(`Språk: ${ctx.locale}`);
  return parts.join(' · ');
}
