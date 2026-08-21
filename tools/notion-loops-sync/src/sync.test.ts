import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRow } from './normalize.js';
import { emptyState, type StateFile } from './state.js';
import { contactProperties, isTestAddress, runSync, type SyncOptions } from './sync.js';
import type { LoopsApi, LoopsResult } from './loops.js';
import type { Logger } from './log.js';
import type { SchoolRow } from './types.js';

const silentLogger: Logger = { debug() {}, info() {}, warn() {}, error() {}, plain() {} };

type Call = { kind: 'contact' | 'event'; email: string; payload: unknown };

function fakeLoops(overrides: { fail?: 'contact' | 'event' } = {}): LoopsApi & { calls: Call[] } {
  const calls: Call[] = [];
  const ok: LoopsResult = { ok: true, status: 200 };
  const fail: LoopsResult = { ok: false, status: 422, error: 'nej' };
  return {
    calls,
    async upsertContact(email, properties) {
      calls.push({ kind: 'contact', email, payload: properties });
      return overrides.fail === 'contact' ? fail : ok;
    },
    async sendEvent(email, eventName) {
      calls.push({ kind: 'event', email, payload: eventName });
      return overrides.fail === 'event' ? fail : ok;
    },
    async ensureProperty() {
      return ok;
    },
  };
}

function row(overrides: Record<string, string | boolean | null> = {}): SchoolRow {
  return normalizeRow(
    {
      Skolnamn: 'Testskolan',
      'Rektor (namn)': 'Anna Svensson',
      'E-post (skolans allmänna)': 'info@testskolan.se',
      'Rektor e-post (direkt)': 'anna@testskolan.se',
      Kontaktstatus: 'Att kontakta – Fas 1',
      Kommun: 'Stockholm',
      Huvudman: 'Fristående',
      ...overrides,
    },
    'page-test',
  );
}

const baseOptions: SyncOptions = { dryRun: false, testMode: false, force: false, limit: null, only: null };

async function run(rows: SchoolRow[], options: Partial<SyncOptions> = {}, state: StateFile = emptyState()) {
  const loops = fakeLoops();
  const summary = await runSync({
    rows,
    state,
    loops,
    logger: silentLogger,
    options: { ...baseOptions, ...options },
    persist: () => {},
  });
  return { summary, loops, state };
}

test('en rad ger en kontaktuppdatering och ett event', async () => {
  const { summary, loops } = await run([row()]);
  assert.equal(summary.eventsSent, 1);
  assert.equal(summary.contactsUpdated, 1);
  assert.deepEqual(
    loops.calls.map((c) => c.kind),
    ['contact', 'event'],
  );
  assert.equal(loops.calls[1]!.payload, 'outreach_fas1_started');
});

test('andra körningen med oförändrad status skickar ingenting', async () => {
  const state = emptyState();
  await run([row()], {}, state);
  const second = await run([row()], {}, state);
  assert.equal(second.summary.eventsSent, 0);
  assert.equal(second.summary.eventsAlreadySent, 1);
  assert.equal(second.summary.contactsUpdated, 0);
  assert.equal(second.loops.calls.length, 0);
});

test('ändrad Kontaktstatus triggar det nya fasens event, inte det gamla igen', async () => {
  const state = emptyState();
  await run([row()], {}, state);
  const second = await run([row({ Kontaktstatus: 'Flaggskepp – prioritera parallellt' })], {}, state);
  assert.equal(second.summary.eventsSent, 1);
  assert.equal(second.loops.calls.find((c) => c.kind === 'event')!.payload, 'outreach_flaggskepp_started');

  // ...och tillbaka till Fas 1 skickar inte om Fas 1-eventet.
  const third = await run([row()], {}, state);
  assert.equal(third.summary.eventsSent, 0);
});

test('--force skickar om trots att eventet redan gått ut', async () => {
  const state = emptyState();
  await run([row()], {}, state);
  const forced = await run([row()], { force: true }, state);
  assert.equal(forced.summary.eventsSent, 1);
});

test('dry-run rör aldrig state — nästa skarpa körning skickar fortfarande', async () => {
  const state = emptyState();
  const dry = await run([row()], { dryRun: true }, state);
  assert.equal(dry.summary.eventsSent, 1);
  assert.deepEqual(state.contacts, {});
  const real = await run([row()], {}, state);
  assert.equal(real.summary.eventsSent, 1);
});

test('status utan fas hoppas över, okänd status likaså', async () => {
  const { summary } = await run([
    row({ Kontaktstatus: 'Ej påbörjad' }),
    row({ Kontaktstatus: null, 'Rektor e-post (direkt)': 'b@testskolan.se' }),
    row({ Kontaktstatus: 'Fas 9 – månen', 'Rektor e-post (direkt)': 'c@testskolan.se' }),
  ]);
  assert.equal(summary.skipped, 3);
  assert.equal(summary.eventsSent, 0);
});

test('rad utan giltig adress räknas som fel, inte som tyst överhoppad', async () => {
  const { summary } = await run([
    row({ 'Rektor e-post (direkt)': null, 'E-post (skolans allmänna)': 'saknas' }),
  ]);
  assert.equal(summary.errors, 1);
  assert.equal(summary.eventsSent, 0);
});

test('samma adress på två rader ger bara ett event', async () => {
  const { summary, loops } = await run([
    row({ Skolnamn: 'Skola A', 'Rektor e-post (direkt)': null, 'E-post (skolans allmänna)': 'info@delad.se' }),
    row({ Skolnamn: 'Skola B', 'Rektor e-post (direkt)': null, 'E-post (skolans allmänna)': 'info@delad.se' }),
  ]);
  assert.equal(summary.eventsSent, 1);
  assert.equal(loops.calls.filter((c) => c.kind === 'event').length, 1);
});

test('testläge kör bara testadresser', async () => {
  const { summary, loops } = await run(
    [row(), row({ Skolnamn: 'Demo', 'Rektor e-post (direkt)': 'rektor@example.com' })],
    { testMode: true },
  );
  assert.equal(summary.eventsSent, 1);
  assert.equal(loops.calls[0]!.email, 'rektor@example.com');
});

test('testläge räknar rad utan adress som överhoppad, inte som fel', async () => {
  const { summary } = await run(
    [row({ 'Rektor e-post (direkt)': null, 'E-post (skolans allmänna)': 'saknas' })],
    { testMode: true },
  );
  assert.equal(summary.errors, 0);
  assert.equal(summary.skipped, 1);
});

test('skarp körning hoppar över testadresser', async () => {
  const { summary } = await run([row({ 'Rektor e-post (direkt)': 'rektor@example.com' })]);
  assert.equal(summary.eventsSent, 0);
  assert.equal(summary.skipped, 1);
});

test('--only och --limit begränsar körningen', async () => {
  const rows = [
    row({ 'Rektor e-post (direkt)': 'a@testskolan.se' }),
    row({ 'Rektor e-post (direkt)': 'b@testskolan.se' }),
    row({ 'Rektor e-post (direkt)': 'c@testskolan.se' }),
  ];
  const only = await run(rows, { only: 'B@testskolan.se' });
  assert.equal(only.summary.eventsSent, 1);
  assert.equal(only.loops.calls[0]!.email, 'b@testskolan.se');

  const limited = await run(rows, { limit: 2 });
  assert.equal(limited.summary.processed, 2);
  assert.equal(limited.summary.eventsSent, 2);
});

test('ett fel på kontaktuppdateringen stoppar eventet för den raden', async () => {
  const loops = fakeLoops({ fail: 'contact' });
  const summary = await runSync({
    rows: [row()],
    state: emptyState(),
    loops,
    logger: silentLogger,
    options: baseOptions,
    persist: () => {},
  });
  assert.equal(summary.errors, 1);
  assert.equal(loops.calls.filter((c) => c.kind === 'event').length, 0);
});

test('ett misslyckat event skrivs inte till state — nästa körning försöker igen', async () => {
  const state = emptyState();
  const failing = fakeLoops({ fail: 'event' });
  await runSync({ rows: [row()], state, loops: failing, logger: silentLogger, options: baseOptions, persist: () => {} });
  const retry = await run([row()], {}, state);
  assert.equal(retry.summary.eventsSent, 1);
});

test('inget förnamn och ingen hälsning skickas till Loops', () => {
  const personal = contactProperties(row(), 'outreach_fas1_started');
  assert.equal('firstName' in personal, false);
  assert.equal('lastName' in personal, false);
  assert.equal('halsning' in personal, false);
  // Namnet följer med som referens, aldrig som tilltal.
  assert.equal(personal.rektor, 'Anna Svensson');
  assert.equal(personal.personligKontakt, true);

  const general = contactProperties(
    row({ 'Rektor e-post (direkt)': null, 'Personlig kontakt?': false }),
    'outreach_fas1_started',
  );
  assert.equal('firstName' in general, false);
  assert.equal(general.personligKontakt, false);
});

test('isTestAddress känner igen testdomäner men inte riktiga', () => {
  assert.equal(isTestAddress('a@example.com'), true);
  assert.equal(isTestAddress('a@test.com'), true);
  assert.equal(isTestAddress('rektor@kungsholmensgymnasium.stockholm.se'), false);
});
