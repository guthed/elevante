import 'server-only';

const LOOPS = 'https://app.loops.so/api';

// Fetch med timeout + en retry med backoff, samma mönster som lib/skolverket.ts.
async function loopsFetch(path: string, body: unknown): Promise<Response> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  for (let attempt = 0; attempt < 2; attempt++) {
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
      return res;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

// Alla funktioner är fire-and-forget och kastar aldrig uppåt: saknas nyckel eller
// felar API:t loggas det bara. Persistens sker alltid före mejl hos anroparen.
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

export async function sendLoopsTransactional(
  transactionalId: string | undefined,
  email: string,
  dataVariables: Record<string, string> = {},
): Promise<void> {
  if (!transactionalId) {
    console.info('[loops] transactionalId saknas — loggar mejl:', { email, dataVariables });
    return;
  }
  try {
    const res = await loopsFetch('/v1/transactional', { email, transactionalId, dataVariables });
    if (!res.ok) console.error('[loops] transactional misslyckades:', res.status, await res.text());
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar mejl:', { email, transactionalId, dataVariables });
    } else {
      console.error('[loops] transactional error:', err);
    }
  }
}
