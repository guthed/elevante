import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyState, getContactState, hashProperties, loadState, saveState, setContactState } from './state.js';

test('hash är oberoende av nyckelordning men känslig för värden', () => {
  assert.equal(hashProperties({ a: 1, b: 'x' }), hashProperties({ b: 'x', a: 1 }));
  assert.notEqual(hashProperties({ a: 1 }), hashProperties({ a: 2 }));
});

test('state överlever en tur- och returresa till disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-state-'));
  try {
    const path = join(dir, 'nested', 'state.json');
    const state = emptyState();
    setContactState(state, 'Rektor@Skola.se', {
      lastStatus: 'Att kontakta – Fas 1',
      contactHash: 'abc',
      contactSyncedAt: '2026-08-21T10:00:00.000Z',
      events: { outreach_fas1_started: '2026-08-21T10:00:00.000Z' },
    });
    saveState(path, state);

    const reloaded = loadState(path);
    // Nyckeln normaliseras till gemener — samma adress i annan skiftläge är samma kontakt.
    const contact = getContactState(reloaded, 'REKTOR@skola.se');
    assert.equal(contact.contactHash, 'abc');
    assert.ok(contact.events.outreach_fas1_started);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('trasig state-fil ger tom state i stället för krasch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-state-'));
  try {
    const path = join(dir, 'state.json');
    saveState(path, emptyState());
    writeFileSync(path, '{ inte json', 'utf8');
    assert.deepEqual(loadState(path).contacts, {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
