import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageToRawRow, readNotionProperty } from './notion.js';

test('läser de property-typer databasen faktiskt använder', () => {
  assert.equal(readNotionProperty({ type: 'title', title: [{ plain_text: 'Östra Real' }] }), 'Östra Real');
  assert.equal(readNotionProperty({ type: 'rich_text', rich_text: [{ plain_text: 'Anna ' }, { plain_text: 'Svensson' }] }), 'Anna Svensson');
  assert.equal(readNotionProperty({ type: 'email', email: 'a@b.se' }), 'a@b.se');
  assert.equal(readNotionProperty({ type: 'select', select: { name: 'Att kontakta – Fas 1' } }), 'Att kontakta – Fas 1');
  assert.equal(readNotionProperty({ type: 'checkbox', checkbox: true }), true);
  assert.equal(readNotionProperty({ type: 'phone_number', phone_number: '08-123' }), '08-123');
  assert.equal(readNotionProperty({ type: 'url', url: 'https://x.se' }), 'https://x.se');
});

test('formelfält läses både som sträng och som boolean', () => {
  assert.equal(readNotionProperty({ type: 'formula', formula: { type: 'string', string: 'Hej Anna,' } }), 'Hej Anna,');
  assert.equal(readNotionProperty({ type: 'formula', formula: { type: 'boolean', boolean: false } }), false);
});

test('tomma och okända värden blir null i stället för "undefined"', () => {
  assert.equal(readNotionProperty({ type: 'email', email: null }), null);
  assert.equal(readNotionProperty({ type: 'title', title: [] }), null);
  assert.equal(readNotionProperty({ type: 'files', files: [] }), null);
  assert.equal(readNotionProperty(null), null);
});

test('pageToRawRow ger en platt uppslagstabell på fältnamn', () => {
  const raw = pageToRawRow({
    id: 'page-1',
    properties: {
      Skolnamn: { type: 'title', title: [{ plain_text: 'Blackebergs gymnasium' }] },
      'Personlig kontakt?': { type: 'formula', formula: { type: 'boolean', boolean: true } },
    },
  });
  assert.equal(raw.Skolnamn, 'Blackebergs gymnasium');
  assert.equal(raw['Personlig kontakt?'], true);
});
