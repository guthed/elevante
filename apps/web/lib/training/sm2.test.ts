import { describe, expect, it } from 'vitest';
import { sm2, type Sm2State } from './sm2';

const fresh: Sm2State = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

describe('sm2', () => {
  it('ger 1 dags intervall vid första godkända repetitionen', () => {
    const next = sm2(fresh, 'good');
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
  });

  it('ger 6 dagars intervall vid andra godkända repetitionen', () => {
    const next = sm2(sm2(fresh, 'good'), 'good');
    expect(next.repetitions).toBe(2);
    expect(next.intervalDays).toBe(6);
  });

  it('multiplicerar intervallet med ease factor från tredje repetitionen', () => {
    const third = sm2(sm2(sm2(fresh, 'good'), 'good'), 'good');
    expect(third.repetitions).toBe(3);
    // 6 * easeFactor, avrundat
    expect(third.intervalDays).toBe(Math.round(6 * third.easeFactor));
  });

  it('nollställer repetitioner och intervall vid "again"', () => {
    const learned = sm2(sm2(fresh, 'good'), 'good');
    const lapsed = sm2(learned, 'again');
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
  });

  it('höjer ease factor vid "good" och sänker vid "hard"', () => {
    expect(sm2(fresh, 'good').easeFactor).toBeGreaterThan(fresh.easeFactor);
    expect(sm2(fresh, 'hard').easeFactor).toBeLessThan(fresh.easeFactor);
  });

  it('räknar ease factor exakt enligt SM-2-formeln för varje betyg', () => {
    // EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), q = again:0, hard:3, good:5
    expect(sm2(fresh, 'good').easeFactor).toBeCloseTo(2.6, 5);
    expect(sm2(fresh, 'hard').easeFactor).toBeCloseTo(2.36, 5);
    expect(sm2(fresh, 'again').easeFactor).toBeCloseTo(1.7, 5);
  });

  it('behandlar "hard" som en svag godkänd repetition, inte som ett bortfall', () => {
    const next = sm2(fresh, 'hard');
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
  });

  it('låter aldrig ease factor gå under 1.3', () => {
    let state = fresh;
    for (let i = 0; i < 20; i += 1) state = sm2(state, 'again');
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('sätter dueAt intervalDays framåt i tiden', () => {
    const before = Date.now();
    const next = sm2(fresh, 'good');
    const diffDays =
      (new Date(next.dueAt).getTime() - before) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(0.9);
    expect(diffDays).toBeLessThan(1.1);
  });
});
