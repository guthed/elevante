import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDelimiter, parseCsv } from './csv.js';

test('kommaseparerad export läses med citerade fält', () => {
  const rows = parseCsv('Skolnamn,Kommun\n"Gymnasiet, Norra",Solna\n');
  assert.deepEqual(rows, [{ Skolnamn: 'Gymnasiet, Norra', Kommun: 'Solna' }]);
});

test('semikolonseparerad export (Excel) detekteras', () => {
  assert.equal(detectDelimiter('Skolnamn;Kommun;Huvudman'), ';');
  const rows = parseCsv('Skolnamn;Kommun\nBlackeberg;Stockholm\n');
  assert.deepEqual(rows, [{ Skolnamn: 'Blackeberg', Kommun: 'Stockholm' }]);
});

test('BOM, CRLF och tomma rader stör inte', () => {
  const rows = parseCsv('﻿Skolnamn,Kommun\r\nÖstra Real,Stockholm\r\n\r\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.Skolnamn, 'Östra Real');
});

test('escapade citattecken bevaras', () => {
  const rows = parseCsv('Skolnamn\n"Skolan ""Framtiden"""\n');
  assert.equal(rows[0]!.Skolnamn, 'Skolan "Framtiden"');
});
