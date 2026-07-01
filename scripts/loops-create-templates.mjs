// Skapar/uppdaterar Elevantes fyra transactional-mallar i Loops via API:t och
// publicerar dem. Idempotent: matchar befintliga mallar på namn och uppdaterar
// dem i stället för att skapa dubbletter. Skriver ut env-raderna med mall-ID:n
// på slutet — klistra in dem i apps/web/.env.local och i Vercel.
//
// Kör:  node scripts/loops-create-templates.mjs
// Kräver: LOOPS_API_KEY i apps/web/.env.local
//
// Endpoints (Loops API v1, bekräftade i deras docs):
//   POST /v1/transactional-emails                              (skapa)
//   GET  /v1/transactional-emails                              (lista)
//   POST /v1/transactional-emails/{id}/draft                  (säkerställ draft)
//   POST /v1/email-messages/{emailMessageId}                  (sätt innehåll: subject/from/lmx)
//   POST /v1/transactional-emails/{id}/publish                (publicera)

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://app.loops.so/api';

// --- Ladda LOOPS_API_KEY från apps/web/.env.local (samma mönster som repots andra scripts) ---
function loadEnv() {
  const envPath = resolve(ROOT, 'apps/web/.env.local');
  const content = readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    content
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).replace(/^"|"$/g, '').trim()];
      }),
  );
}

const env = loadEnv();
const API_KEY = env.LOOPS_API_KEY;
if (!API_KEY) {
  console.error('❌ LOOPS_API_KEY saknas i apps/web/.env.local — lägg in den och kör igen.');
  process.exit(1);
}

function lmx(file) {
  return readFileSync(resolve(ROOT, 'docs/loops-templates/lmx', file), 'utf8');
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

// De fyra mallarna. fromEmail = användarnamn (Loops lägger på @elevante.se).
const TEMPLATES = [
  {
    envKey: 'LOOPS_SKOL_KONTAKT_ID',
    name: 'Elevante — skol-kontaktmejl',
    subject: 'Låt eleverna på {data.schoolName} minnas varje lektion',
    previewText: 'Elever som ställer frågor om sina egna lektioner, i egen takt.',
    fromName: 'Elevante',
    fromEmail: 'hej',
    replyToEmail: 'john@elevante.se', // fast adress — skolans svar landar hos John
    lmxFile: '1-skol-kontaktmejl.lmx',
  },
  {
    envKey: 'LOOPS_LEAD_NOTIS_ID',
    name: 'Elevante — lead-notis (prisberäknare)',
    subject: 'Ny intresseanmälan: {data.schoolName} ({data.students} elever)',
    previewText: 'En skola har lämnat en intresseanmälan via prisberäknaren.',
    fromName: 'Elevante',
    fromEmail: 'hej',
    // Reply-to = {data.replyToAddress} sätts i Loops-editorn (API tar bara literal e-post).
    lmxFile: '2-lead-notis.lmx',
  },
  {
    envKey: 'LOOPS_KONTAKT_NOTIS_ID',
    name: 'Elevante — kontakt-notis',
    subject: 'Nytt kontaktmeddelande: {data.topic} – {data.name}',
    previewText: 'Ett nytt meddelande via kontaktformuläret på elevante.se.',
    fromName: 'Elevante',
    fromEmail: 'hej',
    // Reply-to = {data.replyToAddress} sätts i Loops-editorn (API tar bara literal e-post).
    lmxFile: '3-kontakt-notis.lmx',
  },
  {
    envKey: 'LOOPS_INVESTOR_NOTIS_ID',
    name: 'Elevante — investerar-notis',
    subject: 'Investerardeck · {data.headline}',
    previewText: 'Aktivitet på investerardecket.',
    fromName: 'Elevante',
    fromEmail: 'hej',
    lmxFile: '4-investerar-notis.lmx',
  },
];

async function listExisting() {
  const byName = new Map();
  let cursor;
  do {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const page = await api('GET', `/v1/transactional-emails${q}`);
    for (const t of page.data ?? []) byName.set(t.name, t);
    cursor = page.pagination?.nextCursor ?? null;
  } while (cursor);
  return byName;
}

async function upsertTemplate(t, existing) {
  let transactionalId;
  let emailMessageId;
  let expectedRevisionId;

  if (existing) {
    transactionalId = existing.id;
    // Säkerställ en redigerbar draft och hämta message-id + revision.
    const draft = await api('POST', `/v1/transactional-emails/${transactionalId}/draft`);
    emailMessageId = draft.draftEmailMessageId ?? existing.draftEmailMessageId;
    expectedRevisionId = draft.draftEmailMessageContentRevisionId ?? draft.contentRevisionId;
    console.log(`  ↻ Uppdaterar befintlig (${transactionalId})`);
  } else {
    const created = await api('POST', '/v1/transactional-emails', { name: t.name });
    transactionalId = created.id;
    emailMessageId = created.draftEmailMessageId;
    expectedRevisionId = created.draftEmailMessageContentRevisionId;
    console.log(`  ＋ Skapade ny (${transactionalId})`);
  }

  if (!emailMessageId) throw new Error('inget emailMessageId från API:t — kolla svarsformen ovan');

  await api('POST', `/v1/email-messages/${emailMessageId}`, {
    expectedRevisionId,
    subject: t.subject,
    previewText: t.previewText,
    fromName: t.fromName,
    fromEmail: t.fromEmail,
    ...(t.replyToEmail ? { replyToEmail: t.replyToEmail } : {}),
    lmx: lmx(t.lmxFile),
  });
  console.log(`  ✎ Innehåll satt${t.replyToEmail ? ` (reply-to: ${t.replyToEmail})` : ''}`);

  await api('POST', `/v1/transactional-emails/${transactionalId}/publish`);
  console.log('  ✓ Publicerad');

  return transactionalId;
}

async function main() {
  console.log('Hämtar befintliga transactional-mallar…');
  const existing = await listExisting();

  const results = [];
  for (const t of TEMPLATES) {
    console.log(`\n${t.name}`);
    try {
      const id = await upsertTemplate(t, existing.get(t.name));
      results.push({ envKey: t.envKey, id });
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
      results.push({ envKey: t.envKey, id: null, error: err.message });
    }
  }

  console.log('\n\n=== Klistra in i apps/web/.env.local + Vercel ===');
  for (const r of results) {
    console.log(`${r.envKey}=${r.id ?? '<MISSLYCKADES — se fel ovan>'}`);
  }
  const failed = results.filter((r) => !r.id).length;
  console.log(`\n${results.length - failed}/${results.length} mallar klara.`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error('\n❌ Oväntat fel:', err.message);
  process.exit(1);
});
