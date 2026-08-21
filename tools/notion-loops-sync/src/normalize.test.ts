import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, normalizeRow } from './normalize.js';

test('använder formelfälten när de finns i källan — men aldrig hälsningen', () => {
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

  const general = normalizeRow(
    { Skolnamn: 'Thorildsplans gymnasium', 'E-post (skolans allmänna)': 'info@thorildsplan.se' },
    'page-3',
  );
  assert.equal(general.personalContact, false);
  assert.equal(general.recipientEmail, 'info@thorildsplan.se');
});

test('checkbox läses även som text från en CSV-export', () => {
  const row = normalizeRow(
    { Skolnamn: 'X', 'Personlig kontakt?': 'Yes', 'Rektor e-post (direkt)': 'r@x.se', 'Rektor (namn)': 'Rut' },
    'csv:2',
  );
  assert.equal(row.personalContact, true);
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

test('en personaliserad Hälsningsvariant i Notion läses inte in', () => {
  const row = normalizeRow(
    {
      Skolnamn: 'Franska Skolan',
      'Rektor (namn)': 'Kremena Söderström',
      'Rektor e-post (direkt)': 'krs@adm.franskaskolan.se',
      'Hälsningsvariant (utskick)': 'Hej Kremena,',
    },
    'page-4',
  );
  assert.equal('greeting' in row, false);
  assert.equal(row.rectorName, 'Kremena Söderström');
});
