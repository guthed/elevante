import { describe, expect, it } from 'vitest';
import { seededShuffle, shuffleChoices } from './shuffle';

describe('seededShuffle', () => {
  it('ger samma ordning för samma seed, varje gång', () => {
    const items = ['a', 'b', 'c', 'd'];
    const first = seededShuffle(items, 'session-1:check-1');
    for (let i = 0; i < 10; i += 1) {
      expect(seededShuffle(items, 'session-1:check-1')).toEqual(first);
    }
  });

  it('ger olika ordning för olika seed (för minst några seed-par)', () => {
    const items = ['a', 'b', 'c', 'd'];
    const seeds = [
      ['session-1:check-1', 'session-2:check-1'],
      ['session-1:check-1', 'session-1:check-2'],
      ['a', 'b'],
      ['foo:1', 'bar:1'],
      ['x:99', 'y:99'],
    ];
    const anyDifferent = seeds.some(
      ([s1, s2]) =>
        JSON.stringify(seededShuffle(items, s1)) !== JSON.stringify(seededShuffle(items, s2)),
    );
    expect(anyDifferent).toBe(true);
  });

  it('returnerar en sann permutation — samma element, samma längd, inget tappat eller dubblerat', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (const seed of ['s1', 's2', 's3', 'annan-seed', 'session-42:check-7']) {
      const shuffled = seededShuffle(items, seed);
      expect(shuffled).toHaveLength(items.length);
      expect([...shuffled].sort()).toEqual([...items].sort());
    }
  });

  it('muterar inte indata-arrayen', () => {
    const items = ['a', 'b', 'c', 'd'];
    const copy = [...items];
    seededShuffle(items, 'some-seed');
    expect(items).toEqual(copy);
  });

  it('hanterar tomma och enelementslistor utan att krascha', () => {
    expect(seededShuffle([], 'seed')).toEqual([]);
    expect(seededShuffle(['a'], 'seed')).toEqual(['a']);
  });
});

describe('shuffleChoices', () => {
  it('rätt svar (värdet) hamnar på den index som correctIndex pekar på, oavsett seed', () => {
    const choices = ['Alternativ A', 'Alternativ B', 'Alternativ C', 'Alternativ D'];
    const correctIndex = 1; // 'Alternativ B'
    const correctValue = choices[correctIndex];

    for (let i = 0; i < 200; i += 1) {
      const seed = `session-${i}:check-abc`;
      const result = shuffleChoices(choices, correctIndex, seed);
      expect(result.choices[result.correctIndex]).toBe(correctValue);
    }
  });

  it('samma seed ger samma ordning (stabilt vid sidladdning mitt i en fråga)', () => {
    const choices = ['A', 'B', 'C', 'D'];
    const first = shuffleChoices(choices, 2, 'session-9:check-9');
    const second = shuffleChoices(choices, 2, 'session-9:check-9');
    expect(second).toEqual(first);
  });

  it('olika seed ger olika ordning för samma fråga (för minst några seeds)', () => {
    const choices = ['A', 'B', 'C', 'D'];
    const orders = Array.from({ length: 10 }, (_, i) =>
      shuffleChoices(choices, 0, `session-${i}:check-1`).choices.join(''),
    );
    const distinct = new Set(orders);
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('returnerar en permutation av samma alternativ', () => {
    const choices = ['A', 'B', 'C', 'D'];
    const result = shuffleChoices(choices, 3, 'session-x:check-y');
    expect([...result.choices].sort()).toEqual([...choices].sort());
  });

  it('muterar inte indata-arrayen', () => {
    const choices = ['A', 'B', 'C', 'D'];
    const copy = [...choices];
    shuffleChoices(choices, 0, 'seed');
    expect(choices).toEqual(copy);
  });
});
