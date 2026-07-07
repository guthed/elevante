import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Tvåspråkig sträng — samma mönster som app/investerare/content.ts.
export type L = { sv: string; en: string };

export type TrySegment = { ts: string; text: string };

export type TryLesson = {
  id: string;
  file: string;
  title: L;
  summary: L;
  concepts: string[];
  suggestions: L[]; // förslagsfrågor, hårdkodade per lektion (aldrig AI-genererade i runtime)
};

// Metadata per lektion. Transkriptet laddas från .txt-filen (server-only).
// Koncepten driver RAG-taggningen; suggestions driver förslags-chipsen i chatten.
export const TRY_LESSONS: TryLesson[] = [
  {
    id: 'ekosystem',
    file: '01-ekosystem.txt',
    title: { sv: 'Ekosystem — grundbegrepp', en: 'Ecosystems — the basics' },
    summary: {
      sv: 'Biotiska och abiotiska faktorer, toleransområde, biotop och habitat.',
      en: 'Biotic and abiotic factors, tolerance ranges, biotope and habitat.',
    },
    concepts: ['Ekosystem', 'Biotiska faktorer', 'Abiotiska faktorer', 'Tolerans', 'Habitat'],
    suggestions: [
      { sv: 'Vad är skillnaden mellan biotiska och abiotiska faktorer?', en: 'What is the difference between biotic and abiotic factors?' },
      { sv: 'Vad menas med en arts toleransområde?', en: 'What is a species’ tolerance range?' },
      { sv: 'Vad är skillnaden mellan biotop och habitat?', en: 'What is the difference between biotope and habitat?' },
    ],
  },
  {
    id: 'naringskedjor',
    file: '02-naringskedjor.txt',
    title: { sv: 'Näringskedjor och näringsvävar', en: 'Food chains and food webs' },
    summary: {
      sv: 'Trofinivåer, producenter, konsumenter och nedbrytare — vem äter vem.',
      en: 'Trophic levels, producers, consumers and decomposers — who eats whom.',
    },
    concepts: ['Näringskedja', 'Trofinivå', 'Producent', 'Konsument', 'Nedbrytare'],
    suggestions: [
      { sv: 'Vad är en trofinivå?', en: 'What is a trophic level?' },
      { sv: 'Vilken roll har nedbrytarna i ekosystemet?', en: 'What role do decomposers play in the ecosystem?' },
      { sv: 'Vad är skillnaden mellan en näringskedja och en näringsväv?', en: 'What is the difference between a food chain and a food web?' },
    ],
  },
  {
    id: 'energifloede',
    file: '03-energifloede.txt',
    title: { sv: 'Energiflöde och energipyramider', en: 'Energy flow and energy pyramids' },
    summary: {
      sv: 'Hur energi förs vidare mellan trofinivåer och varför den mesta går förlorad.',
      en: 'How energy passes between trophic levels and why most of it is lost.',
    },
    concepts: ['Energiflöde', 'Energipyramid', 'Tio-procent-regeln', 'Biomassa'],
    suggestions: [
      { sv: 'Varför försvinner så mycket energi mellan trofinivåerna?', en: 'Why is so much energy lost between trophic levels?' },
      { sv: 'Vad visar en energipyramid?', en: 'What does an energy pyramid show?' },
      { sv: 'Vad menas med tio-procent-regeln?', en: 'What does the ten percent rule mean?' },
    ],
  },
  {
    id: 'kretslopp',
    file: '04-kretslopp.txt',
    title: { sv: 'Kretslopp i naturen', en: 'Cycles in nature' },
    summary: {
      sv: 'Kolets och kvävets kretslopp — hur grundämnen byter form men aldrig försvinner.',
      en: 'The carbon and nitrogen cycles — how elements change form but never disappear.',
    },
    concepts: ['Kolets kretslopp', 'Kvävets kretslopp', 'Fotosyntes', 'Cellandning', 'Nedbrytning'],
    suggestions: [
      { sv: 'Hur rör sig kolet i kretsloppet?', en: 'How does carbon move through its cycle?' },
      { sv: 'Vad händer med kolet när en växt dör?', en: 'What happens to the carbon when a plant dies?' },
      { sv: 'Varför är kvävets kretslopp viktigt?', en: 'Why is the nitrogen cycle important?' },
    ],
  },
  {
    id: 'mangfald',
    file: '05-mangfald.txt',
    title: { sv: 'Biologisk mångfald', en: 'Biodiversity' },
    summary: {
      sv: 'Vad biologisk mångfald är, varför den är viktig och vad som hotar den.',
      en: 'What biodiversity is, why it matters, and what threatens it.',
    },
    concepts: ['Biologisk mångfald', 'Art', 'Ekosystemtjänster', 'Hotade arter'],
    suggestions: [
      { sv: 'Vad menas med biologisk mångfald?', en: 'What is meant by biodiversity?' },
      { sv: 'Varför är biologisk mångfald viktig?', en: 'Why is biodiversity important?' },
      { sv: 'Vad hotar den biologiska mångfalden?', en: 'What threatens biodiversity?' },
    ],
  },
  {
    id: 'populationer',
    file: '06-populationer.txt',
    title: { sv: 'Populationer', en: 'Populations' },
    summary: {
      sv: 'Hur populationer växer, begränsas och regleras i ett ekosystem.',
      en: 'How populations grow, are limited, and are regulated in an ecosystem.',
    },
    concepts: ['Population', 'Tillväxt', 'Bärkraft', 'Begränsande faktorer'],
    suggestions: [
      { sv: 'Vad betyder bärkraft för en population?', en: 'What does carrying capacity mean for a population?' },
      { sv: 'Vad kan begränsa hur en population växer?', en: 'What can limit how a population grows?' },
      { sv: 'Vad är skillnaden mellan exponentiell och begränsad tillväxt?', en: 'What is the difference between exponential and limited growth?' },
    ],
  },
];

const transcriptCache = new Map<string, string>();

/** Laddar (och cachar) den råa transkripttexten för en lektion. */
export function loadTranscript(lessonId: string): string {
  const lesson = TRY_LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return '';
  const cached = transcriptCache.get(lessonId);
  if (cached) return cached;
  const path = join(process.cwd(), 'lib', 'try', 'transcripts', lesson.file);
  const text = readFileSync(path, 'utf8').trim();
  transcriptCache.set(lessonId, text);
  return text;
}

/**
 * Delar ett transkript i stycken och ger varje ett pseudo-tidsstämpel jämnt
 * fördelat över en 40-minuterslektion. Används som källcitat-underlag —
 * segmenten är äkta textutdrag, tidsstämpeln är ungefärlig (lektionerna är
 * syntetiska och saknar riktig ljudtid).
 */
export function toSegments(transcript: string): TrySegment[] {
  const paras = transcript
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 40);
  const total = Math.max(paras.length, 1);
  return paras.map((text, i) => {
    const minute = Math.round((i / total) * 40) + 2; // 02:00 → ~42:00
    const ts = `${String(minute).padStart(2, '0')}:00`;
    return { ts, text };
  });
}

/** Slår ihop metadata + transkript för ett urval lektions-id:n. */
export function selectedLessons(ids: string[]): (TryLesson & { transcript: string })[] {
  return TRY_LESSONS.filter((l) => ids.includes(l.id)).map((l) => ({
    ...l,
    transcript: loadTranscript(l.id),
  }));
}
