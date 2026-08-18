// Seedad, deterministisk slumpning av svarsalternativ i kunskapskollar.
//
// Lager 1 (supabase/functions/transcribe-lesson/index.ts, generateTrainingMaterial)
// slumpar redan ordningen VID GENERERING för att ta bort Claudes uppmätta
// positionsbias (correct_index klustrade kring 1-2, aldrig 0 eller 3). Det
// räcker inte ensamt: selectKnowledgeChecks (lib/data/training.ts) viktar
// medvetet mot frågor eleven svarat sämst på, så SAMMA fråga serveras om och
// om igen — med en fast alternativordning kan eleven lära sig "det var
// alternativ två, och det var fel" utan att någonsin resonera om innehållet.
//
// Lösningen: en deterministisk PRNG seedad på en sträng (session + fråga).
// Samma seed ⇒ samma ordning (stabilt vid sidladdning mitt i en fråga).
// Olika seed (annan session, samma fråga) ⇒ annan ordning.

/**
 * cyrb53 — snabb, icke-kryptografisk stränghash med bra distribution.
 * Används bara för att seeda mulberry32, inget säkerhetskrav.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** mulberry32 — liten, snabb, deterministisk PRNG seedad med ett 32-bitars tal. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Slumpar en array deterministiskt utifrån en textsträng-seed (Fisher–Yates).
 * Ren funktion — muterar aldrig `items`, returnerar alltid en ny array.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(cyrb53(seed) >>> 0);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Slumpar svarsalternativen i en kunskapskoll och räknar om correct_index så
 * att det pekar på den nya positionen för det ursprungligen rätta alternativet.
 * Slumpar en INDEX-array (inte värdena direkt) så att dubblettvärden bland
 * choices aldrig kan få rätt-index att peka fel.
 */
export function shuffleChoices(
  choices: string[],
  correctIndex: number,
  seed: string,
): { choices: string[]; correctIndex: number } {
  const order = seededShuffle(
    choices.map((_, i) => i),
    seed,
  );
  return {
    choices: order.map((i) => choices[i]),
    correctIndex: order.indexOf(correctIndex),
  };
}
