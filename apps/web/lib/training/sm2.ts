// SM-2 spaced repetition. Tre-gradig indata (again/hard/good) i stället för
// SM-2:s 0-5, eftersom elevens UI bara har tre knappar. Mappning: again→0,
// hard→3, good→5. Ren funktion — inga beroenden, inget I/O.

export type Sm2Grade = 'again' | 'hard' | 'good';

export type Sm2State = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type Sm2Result = Sm2State & { dueAt: string };

const MIN_EASE_FACTOR = 1.3;
const QUALITY: Record<Sm2Grade, number> = { again: 0, hard: 3, good: 5 };

export function sm2(state: Sm2State, grade: Sm2Grade): Sm2Result {
  const q = QUALITY[grade];

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  let repetitions: number;
  let intervalDays: number;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(state.intervalDays * easeFactor);
  }

  const dueAt = new Date(
    Date.now() + intervalDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return { easeFactor, intervalDays, repetitions, dueAt };
}
