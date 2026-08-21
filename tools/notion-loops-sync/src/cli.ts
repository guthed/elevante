#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFiles } from './env.js';
import { createLogger, type LogLevel } from './log.js';
import { createDryRunClient, createLoopsClient, type LoopsApi } from './loops.js';
import { PHASES } from './phases.js';
import { loadFromCsv } from './sources/csv.js';
import { loadFromNotion } from './sources/notion.js';
import { loadState, saveState } from './state.js';
import { CUSTOM_PROPERTIES, runSync, type SyncSummary } from './sync.js';
import type { SchoolRow } from './types.js';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PKG_DIR, '..', '..');

type Args = {
  source: 'notion' | 'csv' | null;
  csvPath: string | null;
  statePath: string | null;
  dryRun: boolean;
  testMode: boolean;
  force: boolean;
  limit: number | null;
  only: string | null;
  ensureProperties: boolean;
  logLevel: LogLevel;
  help: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    source: null,
    csvPath: null,
    statePath: null,
    dryRun: false,
    testMode: false,
    force: false,
    limit: null,
    only: null,
    ensureProperties: true,
    logLevel: 'info',
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    // Stöder både "--flagga värde" och "--flagga=värde".
    const eq = arg.indexOf('=');
    const name = eq > 0 ? arg.slice(0, eq) : arg;
    const inlineValue = eq > 0 ? arg.slice(eq + 1) : null;
    const nextValue = () => inlineValue ?? argv[++i] ?? '';

    switch (name) {
      case '--source': {
        const value = nextValue();
        if (value !== 'notion' && value !== 'csv') throw new Error(`--source måste vara "notion" eller "csv", fick "${value}".`);
        args.source = value;
        break;
      }
      case '--csv':
        args.csvPath = resolve(process.cwd(), nextValue());
        args.source ??= 'csv';
        break;
      case '--state':
        args.statePath = resolve(process.cwd(), nextValue());
        break;
      case '--limit': {
        const value = Number(nextValue());
        if (!Number.isInteger(value) || value < 1) throw new Error('--limit måste vara ett positivt heltal.');
        args.limit = value;
        break;
      }
      case '--only':
        args.only = nextValue().trim().toLowerCase();
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--test':
        args.testMode = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--no-ensure-properties':
        args.ensureProperties = false;
        break;
      case '--verbose':
        args.logLevel = 'debug';
        break;
      case '--quiet':
        args.logLevel = 'warn';
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`Okänd flagga: ${arg}. Kör med --help för hjälp.`);
    }
  }
  return args;
}

const HELP = `
Synkar skolkontakter från Notion (eller en CSV-export) till Loops och triggar
rätt outreach-event per Kontaktstatus.

  npm run sync -- [flaggor]

Flaggor
  --dry-run                Visa vad som skulle skickas. Anropar aldrig Loops och
                           skriver aldrig state-filen.
  --test                   Testläge: kör BARA rader vars mottagaradress ligger på
                           en testdomän (@example.com, @test.com m.fl.). Egen
                           state-fil, så riktiga kontakter påverkas inte.
  --source notion|csv      Datakälla. Standard: notion om NOTION_TOKEN och
                           NOTION_DATABASE_ID är satta, annars csv.
  --csv <fil>              Sökväg till CSV-export (implicerar --source csv).
                           Standard: data/skolor.csv i verktygets katalog.
  --state <fil>            Sökväg till idempotens-loggen.
  --only <e-post>          Kör bara raden med exakt den mottagaradressen.
  --limit <n>              Kör högst n rader (bra för en försiktig första körning).
  --force                  Skicka om event även om de redan gått ut. Använd med
                           urskiljning — det innebär ett nytt mejl till rektorn.
  --no-ensure-properties   Hoppa över kontrollen att custom properties finns i Loops.
  --verbose / --quiet      Mer respektive mindre loggning.
  -h, --help               Den här hjälpen.

Faser som är konfigurerade (se src/phases.ts):
${PHASES.map((p) => `  "${p.status}"  →  ${p.eventName}`).join('\n')}

Miljövariabler (läses från .env i verktygets katalog eller i repo-roten):
  LOOPS_API_KEY        Krävs för skarp körning.
  NOTION_TOKEN         Internal integration token, för --source notion.
  NOTION_DATABASE_ID   Databas-id för "Gymnasieskolor i Stockholms län".
`;

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP.trim());
    return 0;
  }

  const logger = createLogger(args.logLevel);
  const envFiles = loadEnvFiles([
    resolve(PKG_DIR, '.env'),
    resolve(PKG_DIR, '.env.local'),
    resolve(REPO_ROOT, '.env'),
    resolve(REPO_ROOT, '.env.local'),
  ]);
  if (envFiles.length > 0) logger.debug(`Läste env från: ${envFiles.join(', ')}`);

  const notionToken = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;
  const source = args.source ?? (notionToken && notionDatabaseId ? 'notion' : 'csv');

  logger.plain('');
  logger.plain(`Elevante · Notion → Loops${args.dryRun ? '  [DRY RUN]' : ''}${args.testMode ? '  [TESTLÄGE]' : ''}`);
  logger.plain('─'.repeat(60));

  // Hämta data
  let rows: SchoolRow[];
  if (source === 'notion') {
    if (!notionToken || !notionDatabaseId) {
      logger.error('NOTION_TOKEN och/eller NOTION_DATABASE_ID saknas. Sätt dem i .env, eller kör med --source csv.');
      return 1;
    }
    logger.info(`Källa: Notion-databas ${notionDatabaseId}`);
    rows = await loadFromNotion({ token: notionToken, databaseId: notionDatabaseId, logger });
  } else {
    const csvPath = args.csvPath ?? findDefaultCsv();
    if (!csvPath) {
      logger.error(
        `Hittade ingen CSV. Lägg exporten i ${resolve(PKG_DIR, 'data/skolor.csv')} eller peka ut den med --csv <fil>.`,
      );
      return 1;
    }
    logger.info(`Källa: CSV ${csvPath}`);
    rows = loadFromCsv(csvPath, logger);
  }
  logger.info(`Läste ${rows.length} rader.`);

  // Loops-klient
  let loops: LoopsApi;
  if (args.dryRun) {
    loops = createDryRunClient(logger);
  } else {
    const apiKey = process.env.LOOPS_API_KEY;
    if (!apiKey) {
      logger.error('LOOPS_API_KEY saknas. Sätt den i .env, eller kör med --dry-run.');
      return 1;
    }
    loops = createLoopsClient({ apiKey, logger });
    if (args.ensureProperties) await ensureProperties(loops, logger);
  }

  // Idempotens-logg. Testläget har en egen fil så en testkörning aldrig kan
  // få en riktig rektor att se ut som redan kontaktad.
  const statePath =
    args.statePath ?? resolve(PKG_DIR, '.state', args.testMode ? 'sync-state.test.json' : 'sync-state.json');
  const state = loadState(statePath);
  logger.debug(`State: ${statePath} (${Object.keys(state.contacts).length} kända kontakter)`);
  logger.plain('');

  const summary = await runSync({
    rows,
    state,
    loops,
    logger,
    options: {
      dryRun: args.dryRun,
      testMode: args.testMode,
      force: args.force,
      limit: args.limit,
      only: args.only,
    },
    persist: () => saveState(statePath, state),
  });

  if (!args.dryRun) saveState(statePath, state);
  printSummary(summary, { dryRun: args.dryRun, statePath, logger });
  return summary.errors > 0 ? 1 : 0;
}

function findDefaultCsv(): string | null {
  for (const candidate of [resolve(PKG_DIR, 'data/skolor.csv'), resolve(REPO_ROOT, 'data/skolor.csv')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Loops tar emot okända properties utan att klaga, men de blir osynliga i
 * segmenteringen tills de finns registrerade. Best-effort: ett fel här ska
 * aldrig stoppa själva synken.
 */
async function ensureProperties(loops: LoopsApi, logger: ReturnType<typeof createLogger>): Promise<void> {
  for (const prop of CUSTOM_PROPERTIES) {
    const res = await loops.ensureProperty(prop.name, prop.type);
    if (res.ok) logger.debug(`Property "${prop.name}" (${prop.type}) finns i Loops.`);
    else logger.debug(`Property "${prop.name}": ${res.status} ${res.error} (troligen redan skapad)`);
  }
}

function printSummary(
  summary: SyncSummary,
  { dryRun, statePath, logger }: { dryRun: boolean; statePath: string; logger: ReturnType<typeof createLogger> },
): void {
  logger.plain('');
  logger.plain('─'.repeat(60));
  logger.plain(dryRun ? 'Sammanfattning (inget skickades — dry run)' : 'Sammanfattning');
  const row = (label: string, value: number) => logger.plain(`  ${label.padEnd(24)}${value}`);
  row('Rader i källan', summary.total);
  row('Behandlade', summary.processed);
  row('Kontakter uppdaterade', summary.contactsUpdated);
  row(dryRun ? 'Event att skicka' : 'Event skickade', summary.eventsSent);
  row('Event redan skickade', summary.eventsAlreadySent);
  row('Överhoppade', summary.skipped);
  row('Fel', summary.errors);

  const perEvent = new Map<string, number>();
  for (const r of summary.results) {
    if (r.outcome.kind === 'synced' && r.outcome.event === 'skickat' && r.eventName) {
      perEvent.set(r.eventName, (perEvent.get(r.eventName) ?? 0) + 1);
    }
  }
  if (perEvent.size > 0) {
    logger.plain('');
    logger.plain(dryRun ? '  Event som skulle triggas:' : '  Triggade event:');
    for (const [name, count] of [...perEvent].sort()) logger.plain(`    ${name}  ×${count}`);
  }

  const errors = summary.results.filter((r) => r.outcome.kind === 'error');
  if (errors.length > 0) {
    logger.plain('');
    logger.plain('  Fel:');
    for (const r of errors) {
      logger.plain(`    ${r.school} <${r.email ?? '—'}>: ${r.outcome.kind === 'error' ? r.outcome.reason : ''}`);
    }
  }

  const skipReasons = new Map<string, number>();
  for (const r of summary.results) {
    if (r.outcome.kind === 'skipped') skipReasons.set(r.outcome.reason, (skipReasons.get(r.outcome.reason) ?? 0) + 1);
  }
  if (skipReasons.size > 0) {
    logger.plain('');
    logger.plain('  Överhoppade, per orsak:');
    for (const [reason, count] of [...skipReasons].sort((a, b) => b[1] - a[1])) {
      logger.plain(`    ${count}×  ${reason}`);
    }
  }

  logger.plain('');
  if (dryRun) logger.plain('  Kör om utan --dry-run för att skicka på riktigt.');
  else logger.plain(`  Idempotens-logg: ${statePath}`);
  logger.plain('');
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error('✗  Synken avbröts:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
