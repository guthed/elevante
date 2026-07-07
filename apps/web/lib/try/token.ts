import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PracticeQuestion } from '@/lib/supabase/database';

// Hemlighet för HMAC. Återanvänder investerar-secreten om satt, annars en
// dev-fallback (facit-skyddet är en bekvämlighet i en publik demo mot syntetiskt
// innehåll — inte en säkerhetsgräns kring känslig data).
const SECRET =
  process.env.TRY_TEST_SECRET ?? process.env.INVESTOR_DECK_SECRET ?? 'try-dev-secret';

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

/** Signerar frågorna → token som klienten skickar tillbaka vid rättning. */
export function signQuestions(questions: PracticeQuestion[]): string {
  const payload = Buffer.from(JSON.stringify(questions)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Verifierar token och återger de fullständiga frågorna (med facit), eller null. */
export function verifyQuestions(token: string): PracticeQuestion[] | null {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as PracticeQuestion[]) : null;
  } catch {
    return null;
  }
}

/** Strippar facit ur frågorna innan de skickas till klienten. */
export function stripAnswers(questions: PracticeQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    lesson_id: q.lesson_id,
    options: q.options,
    max_points: q.max_points,
  }));
}

export type PublicQuestion = ReturnType<typeof stripAnswers>[number];
