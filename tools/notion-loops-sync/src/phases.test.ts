import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupPhase, normalizeStatus, PHASES } from './phases.js';

test('varje konfigurerad fas hittas på sitt exakta statusvärde', () => {
  for (const phase of PHASES) {
    const result = lookupPhase(phase.status);
    assert.equal(result.kind, 'phase');
    assert.equal(result.kind === 'phase' && result.phase.eventName, phase.eventName);
  }
});

test('dash-varianter och extra blanksteg matchar samma fas', () => {
  const variants = [
    'Att kontakta - Fas 1',
    'Att kontakta — Fas 1',
    '  att kontakta –  fas 1 ',
    'ATT KONTAKTA – FAS 1',
  ];
  for (const variant of variants) {
    const result = lookupPhase(variant);
    assert.equal(result.kind, 'phase', `misslyckades för "${variant}"`);
    assert.equal(result.kind === 'phase' && result.phase.eventName, 'outreach_fas1_started');
  }
});

test('tom, ignorerad och okänd status skiljs åt', () => {
  assert.equal(lookupPhase(null).kind, 'empty');
  assert.equal(lookupPhase('').kind, 'empty');
  assert.equal(lookupPhase('Ej påbörjad').kind, 'ignored');
  assert.equal(lookupPhase('Fas 7 – rymden').kind, 'unknown');
});

test('normalizeStatus är stabil', () => {
  assert.equal(normalizeStatus('Kommunal – tidig dialog'), 'kommunal - tidig dialog');
});
