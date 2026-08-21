import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, normalizeRow, splitName } from './normalize.js';

test('använder formelfälten när de finns i källan', () => {
  const row = normalizeRow(
    {
      Skolnamn: 'Kungsholmens gymnasium',
      'Rektor (namn)': 'Anna Svensson',
      'E-post (skolans allmänna)': 'info@kungsholmens.se',
      'Rektor e-post (direkt)': 'anna.svensson@kungsholmens.se',
      'Personlig kontakt?': true,
      'Mottagaradress (utskick)': 'anna.svensson@kungsholmens.se',
      'Hälsningsvariant (utskick)': 'Hej Anna,',
      Kontaktstatus: 'Att kontakta – Fas 1',
      Kommun: 'Stockholm',
      Huvudman: 'Kommunal',
    },
    'page-1',
  );
  assert.equal(row.recipientEmail, 'anna.svensson@kungsholmens.se');
  assert.equal(row.greeting, 'Hej Anna,');
  assert.equal(row.personalContact, true);
});

test('härleder mottagare, hälsning och personlig kontakt när formlerna saknas', () => {
  const personal = normalizeRow(
    {
      Skolnamn: 'Viktor Rydberg',
      'Rektor (namn)': 'Erik Lund',
      'E-post (skolans allmänna)': 'info@vrg.se',
      'Rektor e-post (direkt)': 'erik.lund@vrg.se',
    },
    'page-2',
  );
  assert.equal(personal.personalContact, true);
  assert.equal(personal.recipientEmail, 'erik.lund@vrg.se');
  assert.equal(personal.greeting, 'Hej Erik Lund,');

  const general = normalizeRow(
    { Skolnamn: 'Thorildsplans gymnasium', 'E-post (skolans allmänna)': 'info@thorildsplan.se' },
    'page-3',
  );
  assert.equal(general.personalContact, false);
  assert.equal(general.recipientEmail, 'info@thorildsplan.se');
  assert.equal(general.greeting, 'Hej,');
});

test('checkbox läses även som text från en CSV-export', () => {
  const row = normalizeRow(
    { Skolnamn: 'X', 'Personlig kontakt?': 'Yes', 'Rektor e-post (direkt)': 'r@x.se', 'Rektor (namn)': 'Rut' },
    'csv:2',
  );
  assert.equal(row.personalContact, true);
  assert.equal(row.greeting, 'Hej Rut,');
});

test('e-post normaliseras och ogiltiga adresser blir null', () => {
  assert.equal(normalizeEmail('  Info@Skola.SE '), 'info@skola.se');
  assert.equal(normalizeEmail('info@skola.se, rektor@skola.se'), 'info@skola.se');
  assert.equal(normalizeEmail('inte en adress'), null);
  assert.equal(normalizeEmail(''), null);
  assert.equal(normalizeEmail(null), null);
});

test('rad utan användbar adress ger recipientEmail null i stället för skräp', () => {
  const row = normalizeRow({ Skolnamn: 'Utan kontakt', 'E-post (skolans allmänna)': 'saknas' }, 'csv:9');
  assert.equal(row.recipientEmail, null);
});

test('splitName delar upp namnet men lämnar tomt som null', () => {
  assert.deepEqual(splitName('Anna Svensson'), { firstName: 'Anna', lastName: 'Svensson' });
  assert.deepEqual(splitName('Anna Maria Svensson'), { firstName: 'Anna', lastName: 'Maria Svensson' });
  assert.deepEqual(splitName('Anna'), { firstName: 'Anna', lastName: null });
  assert.deepEqual(splitName(null), { firstName: null, lastName: null });
});
