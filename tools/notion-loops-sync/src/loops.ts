import type { Logger } from './log.js';

// LOOPS_API_BASE finns för att kunna köra hela flödet mot en lokal stub-server
// i test. Sätt den aldrig i skarp drift.
const LOOPS = process.env.LOOPS_API_BASE ?? 'https://app.loops.so/api';

/**
 * Retry-logiken är samma som i apps/web/lib/loops.ts: Loops rate-limitar (429)
 * vid många anrop i snabb följd, och ett 429-svar är ett "lyckat" fetch-anrop
 * (res.ok === false) — retryar man bara på nätverksfel går det aldrig igenom
 * retry-vägen. Vid en bulksynk av flera hundra skolor är det regel, inte undantag.
 */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const TIMEOUT_MS = 15_000;

export type LoopsResult = { ok: true; status: number } | { ok: false; status: number; error: string };

export type LoopsApi = {
  upsertContact(email: string, properties: Record<string, unknown>): Promise<LoopsResult>;
  sendEvent(email: string, eventName: string, properties: Record<string, unknown>): Promise<LoopsResult>;
  ensureProperty(name: string, type: 'string' | 'number' | 'boolean' | 'date'): Promise<LoopsResult>;
};

export type LoopsClientOptions = {
  apiKey: string;
  logger: Logger;
  /** Fördröjning mellan anrop, håller oss under Loops rate limit (10 req/s). */
  throttleMs?: number;
};

export function createLoopsClient({ apiKey, logger, throttleMs = 120 }: LoopsClientOptions): LoopsApi {
  let lastCallAt = 0;

  async function call(path: string, body: unknown): Promise<LoopsResult> {
    const since = Date.now() - lastCallAt;
    if (since < throttleMs) await sleep(throttleMs - since);

    let lastError = 'okänt fel';
    let lastStatus = 0;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${LOOPS}${path}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(timer);
          lastCallAt = Date.now();
        }

        if (res.ok) return { ok: true, status: res.status };

        lastStatus = res.status;
        lastError = (await res.text()).slice(0, 500);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS - 1) {
          return { ok: false, status: res.status, error: lastError };
        }
        const retryAfter = Number(res.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
        logger.debug(`Loops ${res.status} på ${path} — nytt försök om ${delay} ms`);
        await sleep(delay);
      } catch (err) {
        lastError = String(err);
        if (attempt === MAX_ATTEMPTS - 1) return { ok: false, status: 0, error: lastError };
        await sleep(400 * (attempt + 1));
      }
    }
    return { ok: false, status: lastStatus, error: lastError };
  }

  return {
    upsertContact: (email, properties) => call('/v1/contacts/update', { email, ...properties }),
    sendEvent: (email, eventName, properties) =>
      call('/v1/events/send', { email, eventName, eventProperties: properties }),
    ensureProperty: (name, type) => call('/v1/contacts/properties', { name, type }),
  };
}

/** Loggar vad som skulle ha skickats i stället för att anropa Loops. */
export function createDryRunClient(logger: Logger): LoopsApi {
  const ok = async (): Promise<LoopsResult> => ({ ok: true, status: 200 });
  return {
    upsertContact: async (email, properties) => {
      logger.debug(`[dry-run] POST /v1/contacts/update ${email} ${JSON.stringify(properties)}`);
      return ok();
    },
    sendEvent: async (email, eventName) => {
      logger.debug(`[dry-run] POST /v1/events/send ${email} ${eventName}`);
      return ok();
    },
    ensureProperty: async () => ok(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
