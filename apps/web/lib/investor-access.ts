// Signerad sessions-cookie för investerardecket. Bär { label, sid } signerat
// med INVESTOR_DECK_SECRET. Web Crypto → funkar i både proxy- och Node-runtime.

export const INVESTOR_COOKIE = 'investor_access';

export type InvestorSession = { label: string; sid: string; pid: string };

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8ToBase64Url(s: string): string {
  return toBase64Url(new TextEncoder().encode(s));
}

function base64UrlToUtf8(s: string): string {
  return new TextDecoder().decode(fromBase64Url(s));
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

/** Signerar en sessions-payload. Returnerar null om INVESTOR_DECK_SECRET saknas. */
export async function signSession(payload: InvestorSession): Promise<string | null> {
  const secret = process.env.INVESTOR_DECK_SECRET;
  if (!secret) return null;
  const body = utf8ToBase64Url(JSON.stringify(payload));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

/** Verifierar en token och returnerar payloaden, eller null. */
export async function verifySession(token: string | undefined): Promise<InvestorSession | null> {
  const secret = process.env.INVESTOR_DECK_SECRET;
  if (!secret || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const parsed = JSON.parse(base64UrlToUtf8(body)) as Partial<InvestorSession>;
    if (
      typeof parsed.label === 'string' &&
      typeof parsed.sid === 'string' &&
      typeof parsed.pid === 'string'
    ) {
      return { label: parsed.label, sid: parsed.sid, pid: parsed.pid };
    }
    return null;
  } catch {
    return null;
  }
}
