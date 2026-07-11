// Skickar ett testmejl per transactional-mall till en mottagare, med exempeldata,
// så man kan syna design + variabler i inkorgen. Engångsverktyg.
//
// Kör:  node scripts/loops-send-tests.mjs [mottagare]
//       (default-mottagare: john@elevante.se)
// Kräver: LOOPS_API_KEY + LOOPS_*_ID i apps/web/.env.local

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://app.loops.so/api';
const TO = process.argv[2] || 'john@elevante.se';

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, 'apps/web/.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).replace(/^"|"$/g, '').trim()];
    }),
);

const API_KEY = env.LOOPS_API_KEY;
if (!API_KEY) { console.error('❌ LOOPS_API_KEY saknas i apps/web/.env.local'); process.exit(1); }

// Mall → exempeldata (alla värden strängar, som Loops kräver).
const TESTS = [
  { id: env.LOOPS_SKOL_KONTAKT_ID, label: 'skol-kontaktmejl', data: {
    schoolName: 'Nacka Gymnasium', ort: 'Nacka',
  } },
  { id: env.LOOPS_LEAD_NOTIS_ID, label: 'lead-notis', data: {
    schoolName: 'Nacka Gymnasium', students: '1850',
    leadEmail: 'rektor@nackagymnasium.se',
    message: 'Vi vill veta mer om hur Elevante funkar för våra NA-klasser.',
    replyToAddress: 'rektor@nackagymnasium.se',
  } },
  { id: env.LOOPS_KONTAKT_NOTIS_ID, label: 'kontakt-notis', data: {
    name: 'Anna Lindqvist', email: 'anna@exempelskolan.se',
    school: 'Exempelskolan', topic: 'demo',
    message: 'Kan vi boka en demo nästa vecka?',
    replyToAddress: 'anna@exempelskolan.se',
  } },
  { id: env.LOOPS_INVESTOR_NOTIS_ID, label: 'investerar-notis', data: {
    headline: 'Anna Investerare öppnade investerardecket',
    investor: 'Anna Investerare', locale: 'sv', maxScroll: '80%',
  } },
];

async function send(t) {
  if (!t.id) return console.error(`  ❌ ${t.label}: ID saknas i .env.local`);
  const res = await fetch(`${BASE}/v1/transactional`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TO, transactionalId: t.id, dataVariables: t.data }),
  });
  const body = await res.text();
  console.log(res.ok ? `  ✓ ${t.label} skickad` : `  ❌ ${t.label} → ${res.status}: ${body.slice(0, 300)}`);
}

console.log(`Skickar 4 testmejl till ${TO}…\n`);
for (const t of TESTS) await send(t);
console.log('\nKlart — kolla inkorgen.');
