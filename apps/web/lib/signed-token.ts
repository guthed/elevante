// HMAC-signerade payloads. Web Crypto → funkar i både proxy- och Node-runtime.
//
// Används av investerardecket (sessions-cookie) och skolbesöken (telemetri-
// token). Signering ger integritet, INTE sekretess: payloaden är läsbar för den
// som har token. Lägg aldrig hemligheter här — behövs det, kryptera i stället
// (se lib/try/token.ts).

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

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

/** Signerar en payload. Returnerar null om secret saknas. */
export async function signPayload(
  secret: string | undefined,
  payload: unknown,
): Promise<string | null> {
  if (!secret) return null;
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(secret, body)}`;
}

/**
 * Verifierar en token och kör payloaden genom `guard`. Returnerar null vid
 * saknad secret, trasig token, felaktig signatur eller payload som inte
 * passerar guarden.
 */
export async function verifyPayload<T>(
  secret: string | undefined,
  token: string | undefined,
  guard: (value: unknown) => value is T,
): Promise<T | null> {
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
    const parsed: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
