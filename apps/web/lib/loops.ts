import 'server-only';

const LOOPS = 'https://app.loops.so/api';

// Fetch med timeout + retries. Upptäckt vid en 543-raders bulkimport
// (2026-08-12): Loops rate-limitar (429) vid många transactional-anrop i
// snabb följd, och den gamla varianten retry:ade bara på nätverksfel —
// ett 429-svar är ett "lyckat" fetch-anrop (res.ok=false), så det gick
// aldrig igenom retry-vägen. Det ledde till att kontot redan hunnit
// skapas (generateLink) men mejlet aldrig gick fram, och anroparen fick
// ett hårt fel utan att veta att kontot existerade. Retry:ar nu även på
// 429/5xx, med Retry-After-headern om Loops skickar en, annars backoff.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function loopsFetch(path: string, body: unknown): Promise<Response> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  const maxAttempts = 4;
  let lastRes: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${LOOPS}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts - 1) {
        return res;
      }
      lastRes = res;
      const retryAfterHeader = Number(res.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delayMs));
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  // Ska aldrig kunna nås (sista varvet returnerar alltid), men lastRes
  // täcker fallet om typescript-kontrollflödet ändå tar hit.
  return lastRes!;
}

// Alla funktioner kastar aldrig uppåt: saknas nyckel eller felar API:t loggas det
// bara. Persistens sker alltid före mejl hos anroparen.
export async function upsertLoopsContact(
  email: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await loopsFetch('/v1/contacts/update', { email, ...properties });
    if (!res.ok) console.error('[loops] contact update misslyckades:', res.status, await res.text());
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar kontakt:', { email, properties });
    } else {
      console.error('[loops] contact update error:', err);
    }
  }
}

export async function sendLoopsEvent(
  email: string,
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const res = await loopsFetch('/v1/events/send', { email, eventName, eventProperties: properties });
    if (!res.ok) console.error('[loops] event misslyckades:', res.status, await res.text());
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar event:', { email, eventName, properties });
    } else {
      console.error('[loops] event error:', err);
    }
  }
}

// Returnerar true vid 2xx, annars false (kastar aldrig). Anroparen avgör om ett
// misslyckande ska påverka användarflödet (kontakt = ja, delning/notis = nej).
export async function sendLoopsTransactional(
  transactionalId: string | undefined,
  email: string,
  dataVariables: Record<string, string> = {},
): Promise<boolean> {
  if (!transactionalId) {
    console.info('[loops] transactionalId saknas — loggar mejl:', { email, dataVariables });
    return false;
  }
  try {
    const res = await loopsFetch('/v1/transactional', { email, transactionalId, dataVariables });
    if (!res.ok) {
      console.error('[loops] transactional misslyckades:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar mejl:', { email, transactionalId, dataVariables });
    } else {
      console.error('[loops] transactional error:', err);
    }
    return false;
  }
}
