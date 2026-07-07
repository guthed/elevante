import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { PracticeQuestion } from '@/lib/supabase/database';

// Hemlighet för token-krypteringen. Återanvänder investerar-secreten om satt,
// annars en dev-fallback. Facit-skyddet är en demo-bekvämlighet mot syntetiskt
// innehåll — inte en säkerhetsgräns kring känslig data — men det MÅSTE ändå
// vara omöjligt för en besökare att läsa svaren i förväg, annars är AI-rättningen
// meningslös. Därför krypterar vi (AES-256-GCM), inte bara signerar.
const SECRET =
  process.env.TRY_TEST_SECRET ?? process.env.INVESTOR_DECK_SECRET ?? 'try-dev-secret';

// 32-byte nyckel härledd ur hemligheten (AES-256).
const KEY = createHash('sha256').update(SECRET).digest();

/**
 * Krypterar frågorna (inkl. facit) till en ogenomtränglig token med AES-256-GCM.
 * GCM ger både sekretess (klienten kan inte läsa facit ur token) och äkthet
 * (manipulation upptäcks vid dekryptering). Token = iv.ciphertext.authTag,
 * base64url-kodat.
 */
export function signQuestions(questions: PracticeQuestion[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(questions), 'utf8');
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ct, tag].map((b) => b.toString('base64url')).join('.');
}

/** Dekrypterar och verifierar token → de fullständiga frågorna (med facit), eller null. */
export function verifyQuestions(token: string): PracticeQuestion[] | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const [iv, ct, tag] = parts.map((p) => Buffer.from(p, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString('utf8'));
    return Array.isArray(parsed) ? (parsed as PracticeQuestion[]) : null;
  } catch {
    // Fel IV/tag/nyckel eller manipulerad token → GCM-verifieringen kastar.
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
