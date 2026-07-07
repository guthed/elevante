import 'server-only';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Best-effort fönsterbaserad rate-limit. `key` bör kombinera route + IP.
 * Returnerar true om anropet får gå igenom, false om taket nåtts.
 * OBS: in-memory per instans — inte en hård global gräns.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Härleder en klientnyckel ur request-headers (proxy-vänligt). */
export function clientKey(req: Request, route: string): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd ? fwd.split(',')[0]!.trim() : 'unknown';
  return `${route}:${ip}`;
}
