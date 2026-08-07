import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Egen hemlighet — till skillnad från lib/try/token.ts (som skyddar ett demo-facit)
// grinder den här tokenen riktig kontoskapande via claimInvite. Ingen fallback-kedja
// till en annan features hemlighet är rimlig här; bara en dev-only default-sträng.
const SECRET = process.env.INVITE_TOKEN_SECRET ?? 'invite-dev-secret';

// 32-byte nyckel härledd ur hemligheten (AES-256).
const KEY = createHash('sha256').update(SECRET).digest();

/**
 * Krypterar en invite-id (UUID) till en ogenomtränglig claim-token med AES-256-GCM.
 * GCM ger både sekretess och äkthet (manipulation upptäcks vid dekryptering) —
 * token = iv.ciphertext.authTag, base64url-kodat.
 */
export function signInviteToken(inviteId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const plaintext = Buffer.from(inviteId, 'utf8');
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ct, tag].map((b) => b.toString('base64url')).join('.');
}

/** Dekrypterar och verifierar en claim-token → invite-id, eller null om ogiltig/manipulerad. */
export function verifyInviteToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const [iv, ct, tag] = parts.map((p) => Buffer.from(p, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    const inviteId = plaintext.toString('utf8');
    return inviteId.length > 0 ? inviteId : null;
  } catch {
    // Fel IV/tag/nyckel eller manipulerad token → GCM-verifieringen kastar.
    return null;
  }
}
