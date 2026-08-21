import { describe, expect, it } from 'vitest';
import { suggestProfileForName } from './suggest-teacher';
import type { TeacherOption } from './suggest-teacher';

const options: TeacherOption[] = [
  { id: 'p-alfred', name: 'Alfred Svensson' },
  { id: 'p-anna-b', name: 'Anna Bergström' },
  { id: 'p-anna-l', name: 'Anna Lind' },
  { id: 'p-rojè', name: 'Rojè Karimi' },
  { id: 'p-enda', name: 'Enikö' },
];

describe('suggestProfileForName', () => {
  it('matchar ett förnamn mot kontots fullständiga namn', () => {
    expect(suggestProfileForName('Alfred', options)).toBe('p-alfred');
  });

  // Det viktigaste fallet. Schemat ger bara "Anna" och skolan har två.
  // Ett godtyckligt förslag hade tyst kopplat fel lärare till lektionerna.
  it('ger inget förslag när förnamnet är tvetydigt', () => {
    expect(suggestProfileForName('Anna', options)).toBeNull();
  });

  it('matchar hela namnet när schemat råkar ha det', () => {
    expect(suggestProfileForName('Anna Lind', options)).toBe('p-anna-l');
  });

  it('hanterar diakriter och svenska tecken', () => {
    expect(suggestProfileForName('Rojè', options)).toBe('p-rojè');
    expect(suggestProfileForName('Enikö', options)).toBe('p-enda');
  });

  it('är skiftlägesokänsligt och tål omgivande blanksteg', () => {
    expect(suggestProfileForName('  alfred  ', options)).toBe('p-alfred');
  });

  it('ger inget förslag för ett namn som inte finns', () => {
    expect(suggestProfileForName('Taifun', options)).toBeNull();
  });

  it('ger inget förslag för tomt namn', () => {
    expect(suggestProfileForName('', options)).toBeNull();
    expect(suggestProfileForName('   ', options)).toBeNull();
  });

  it('ger inget förslag när skolan saknar lärarkonton', () => {
    expect(suggestProfileForName('Alfred', [])).toBeNull();
  });

  // Efternamn ska inte matcha — "Lind" är inte läraren "Anna Lind" i
  // schemat, och en sådan träff hade varit en gissning för mycket.
  it('matchar inte på efternamn', () => {
    expect(suggestProfileForName('Svensson', options)).toBeNull();
  });
});
