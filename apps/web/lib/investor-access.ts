// Delad mellan Server Action (sign) och proxy (verify). Web Crypto → funkar i
// både Node- och edge-runtime. Token = HMAC_SHA256(lösenord, "granted").

export const INVESTOR_COOKIE = 'investor_access';
const PAYLOAD = 'granted';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function makeAccessToken(password: string): Promise<string> {
  return hmac(password, PAYLOAD);
}

export async function verifyAccessToken(token: string | undefined, password: string): Promise<boolean> {
  if (!token) return false;
  const expected = await makeAccessToken(password);
  if (token.length !== expected.length) return false;
  // konstant-tids-jämförelse
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
