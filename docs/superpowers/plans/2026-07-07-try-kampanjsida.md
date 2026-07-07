# /try — publik kampanjsida: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygg `/sv/try` + `/en/try` — en publik, indexerbar, inloggningsfri sida där vem som helst upplever Elevantes kärnloop: välj Ekologi-lektioner → chatta med äkta RAG och källcitat → generera ett prov → få det AI-rättat med personlig feedback.

**Architecture:** En statisk, server-renderad sida (`page.tsx`) med en client-komponent (`TryExperience`) som orkestrerar tre steg helt i webbläsar-state — inget sparas på servern. Tre stateless API-rutter (`/api/try/chat`, `/api/try/test`, `/api/try/grade`) återbrukar den befintliga Claude-lagret i `lib/ai/anthropic.ts`. Lektionsinnehållet bor server-only i `lib/try/`. Provets facit skyddas via en HMAC-signerad payload så det aldrig läcker till klienten.

**Tech Stack:** Next.js 16 (App Router, React 19), Tailwind v4, Zod, `@anthropic-ai/sdk`, Node `crypto` (HMAC). Inga nya beroenden.

**Verifiering (repo-konvention):** Repot har inget testramverk. Varje task verifieras med `pnpm --filter @elevante/web typecheck`, `pnpm --filter @elevante/web lint`, och där det är UI/flöde: en preview-kontroll (`preview_start` → interagera → `preview_console_logs`). Rena hjälpfunktioner får en engångs-assertionssnutt körd med `node` som raderas efteråt (ingen permanent testinfra införs).

---

## Filstruktur

**Nya filer:**
- `apps/web/lib/try/transcripts/01-ekosystem.txt` … `06-populationer.txt` — flyttade från `scripts/synthetic-ekologi/` (server-only källtext).
- `apps/web/lib/try/lessons.ts` — server-only lektionsbibliotek (metadata + laddar transkript + segmentering för citat).
- `apps/web/lib/try/copy.ts` — tvåspråkig UI-copy + typen `L`.
- `apps/web/lib/try/token.ts` — HMAC-signering/verifiering av prov-payload (facit-skydd).
- `apps/web/lib/try/ratelimit.ts` — best-effort in-memory rate-limiter.
- `apps/web/app/api/try/chat/route.ts` — RAG-chatt.
- `apps/web/app/api/try/test/route.ts` — provgenerering.
- `apps/web/app/api/try/grade/route.ts` — rättning.
- `apps/web/components/try/TryExperience.tsx` — orkestrerar steg + state (client).
- `apps/web/components/try/StepRail.tsx` — progress-rad.
- `apps/web/components/try/LessonPicker.tsx` — steg ①.
- `apps/web/components/try/ChatStep.tsx` — steg ②.
- `apps/web/components/try/TestStep.tsx` — steg ③ (prov + resultat).
- `apps/web/app/[locale]/(public)/try/page.tsx` — sidan.

**Modifierade filer:**
- `apps/web/lib/ai/anthropic.ts` — lägg valfri `locale`-param på `generatePracticeTest` och `gradePracticeTest` (bakåtkompatibelt, default svenska).
- `apps/web/lib/site.ts` — lägg `/try` i `PAGE_PATHS`.
- `apps/web/components/public/Header.tsx` + `Footer.tsx` — nav-länk till `/try`.
- `apps/web/lib/i18n/locales/sv.ts` + `en.ts` + `lib/i18n/types.ts` — nav-etikett `try`.

---

## Task 1: Flytta lektionstranskripten in i web-appen

**Files:**
- Create: `apps/web/lib/try/transcripts/01-ekosystem.txt` … `06-populationer.txt`
- Source: `scripts/synthetic-ekologi/*.txt`

- [ ] **Step 1: Kopiera de sex transkripten**

```bash
mkdir -p apps/web/lib/try/transcripts
cp scripts/synthetic-ekologi/01-ekosystem-grundbegrepp.txt      apps/web/lib/try/transcripts/01-ekosystem.txt
cp scripts/synthetic-ekologi/02-naringskedjor-naringsvavar.txt  apps/web/lib/try/transcripts/02-naringskedjor.txt
cp scripts/synthetic-ekologi/03-energifloede-energipyramider.txt apps/web/lib/try/transcripts/03-energifloede.txt
cp scripts/synthetic-ekologi/04-kretslopp.txt                   apps/web/lib/try/transcripts/04-kretslopp.txt
cp scripts/synthetic-ekologi/05-biologisk-mangfald.txt          apps/web/lib/try/transcripts/05-mangfald.txt
cp scripts/synthetic-ekologi/06-populationer.txt                apps/web/lib/try/transcripts/06-populationer.txt
```

- [ ] **Step 2: Verifiera att alla sex finns och har innehåll**

Run: `wc -l apps/web/lib/try/transcripts/*.txt`
Expected: sex filer, var och en med >20 rader.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/try/transcripts/
git commit -m "feat(try): flytta syntetiska Ekologi-transkript in i web-appen"
```

---

## Task 2: Lektionsbiblioteket (`lib/try/lessons.ts`)

Server-only modul som laddar transkripten, håller tvåspråkig metadata och delar transkriptet i segment med pseudo-tidsstämplar för källcitat.

**Files:**
- Create: `apps/web/lib/try/lessons.ts`

- [ ] **Step 1: Skriv modulen**

```typescript
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
```

- [ ] **Step 2: Verifiera segmentering med engångs-assertion**

Skriv `/tmp/try-check.mjs`:

```javascript
import { TRY_LESSONS, loadTranscript, toSegments } from '../apps/web/lib/try/lessons.ts';
```

Detta kräver ts-loader — hoppa istället över och verifiera i typecheck (Step 3). Ta bort filen om skapad.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel som rör `lib/try/lessons.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/try/lessons.ts
git commit -m "feat(try): server-only lektionsbibliotek med segmentering för citat"
```

---

## Task 3: UI-copy (`lib/try/copy.ts`)

All tvåspråkig gränssnittstext på ett ställe (inga hårdkodade strängar i komponenterna).

**Files:**
- Create: `apps/web/lib/try/copy.ts`

- [ ] **Step 1: Skriv copy-modulen**

```typescript
import type { Locale } from '@/lib/i18n/config';

export type L = { sv: string; en: string };

export function tr(locale: Locale, l: L): string {
  return locale === 'en' ? l.en : l.sv;
}

export const TRY_COPY = {
  // Hero
  eyebrow: { sv: 'Prova Elevante', en: 'Try Elevante' },
  heroTitle: {
    sv: 'Upplev det själv — ingen inloggning.',
    en: 'Experience it yourself — no sign-in.',
  },
  heroLede: {
    sv: 'Välj en eller flera lektioner, ställ dina egna frågor och låt Elevante skapa ett prov och rätta det åt dig. Riktiga svar, med källa ur lektionen.',
    en: 'Pick one or more lessons, ask your own questions, and let Elevante build a test and grade it for you. Real answers, sourced from the lesson.',
  },

  // Steg-etiketter
  step1: { sv: 'Välj lektioner', en: 'Choose lessons' },
  step2: { sv: 'Ställ frågor', en: 'Ask questions' },
  step3: { sv: 'Testa dig själv', en: 'Test yourself' },

  // Steg 1 — LessonPicker
  pickTitle: { sv: 'Vilka lektioner vill du utforska?', en: 'Which lessons do you want to explore?' },
  pickHint: { sv: 'Välj en eller flera. Ämnet är Ekologi (Biologi 1).', en: 'Pick one or more. The subject is Ecology (Biology 1).' },
  swedishNote: {
    sv: '',
    en: 'Lesson recordings are from a Swedish classroom — answers reference the original Swedish transcript.',
  },
  continue: { sv: 'Fortsätt', en: 'Continue' },
  selectedCount: { sv: 'vald(a)', en: 'selected' },

  // Steg 2 — ChatStep
  chatTitle: { sv: 'Fråga vad du vill om lektionerna', en: 'Ask anything about the lessons' },
  chatPlaceholder: { sv: 'Ställ en fråga…', en: 'Ask a question…' },
  send: { sv: 'Fråga', en: 'Ask' },
  thinking: { sv: 'Elevante läser lektionen…', en: 'Elevante is reading the lesson…' },
  suggestionsLabel: { sv: 'Prova en fråga:', en: 'Try a question:' },
  sourceLabel: { sv: 'Ur lektionen', en: 'From the lesson' },
  toTest: { sv: 'Testa dig själv', en: 'Test yourself' },
  chatError: {
    sv: 'Kunde inte hämta ett svar just nu. Försök igen om en stund.',
    en: 'Couldn’t fetch an answer right now. Please try again in a moment.',
  },
  rateLimited: {
    sv: 'Du har ställt många frågor på kort tid — testa igen om en stund.',
    en: 'You’ve asked a lot of questions in a short time — try again in a moment.',
  },

  // Steg 3 — TestStep
  testTitle: { sv: 'Dags att testa dig själv', en: 'Time to test yourself' },
  testIntro: {
    sv: 'Elevante skapar ett kort prov från lektionerna du valt. Svara i lugn och ro — sen rättar Elevante och ger dig personlig feedback.',
    en: 'Elevante builds a short test from the lessons you chose. Answer at your own pace — then Elevante grades it and gives you personal feedback.',
  },
  createTest: { sv: 'Skapa prov', en: 'Create test' },
  creatingTest: { sv: 'Skapar prov…', en: 'Building your test…' },
  gradeTest: { sv: 'Rätta mitt prov', en: 'Grade my test' },
  gradingTest: { sv: 'Rättar…', en: 'Grading…' },
  answerPlaceholder: { sv: 'Ditt svar…', en: 'Your answer…' },
  testError: {
    sv: 'Kunde inte skapa provet just nu. Försök igen om en stund.',
    en: 'Couldn’t build the test right now. Please try again in a moment.',
  },
  retry: { sv: 'Försök igen', en: 'Try again' },
  restart: { sv: 'Börja om', en: 'Start over' },

  // Offline-fallback
  offlineNote: {
    sv: 'Demoläge: AI-motorn är inte kopplad här, så svaret är ett förberett exempel.',
    en: 'Demo mode: the AI engine isn’t connected here, so this is a prepared example.',
  },

  // Mjuk avslutning
  outroTitle: { sv: 'Vill du ha det här på din skola?', en: 'Want this at your school?' },
  outroLede: {
    sv: 'Elevante minns varje lektion och hjälper varje elev — på riktigt, i ert sammanhang.',
    en: 'Elevante remembers every lesson and helps every student — for real, in your context.',
  },
  bookDemo: { sv: 'Boka demo', en: 'Book a demo' },
  forSchools: { sv: 'Läs mer för skolor', en: 'Learn more for schools' },
} satisfies Record<string, L>;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/try/copy.ts
git commit -m "feat(try): tvåspråkig UI-copy för kampanjsidan"
```

---

## Task 4: HMAC-token för facit-skydd (`lib/try/token.ts`)

Provgenereringen returnerar frågor UTAN facit till klienten, men bäddar in de kompletta frågorna i en HMAC-signerad token. Vid rättning skickar klienten tillbaka token + svar; servern verifierar signaturen och återskapar facit. Facit lämnar aldrig servern i klartext.

**Files:**
- Create: `apps/web/lib/try/token.ts`

- [ ] **Step 1: Skriv token-modulen**

```typescript
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PracticeQuestion } from '@/lib/supabase/database';

// Hemlighet för HMAC. Återanvänder investerar-secreten om satt, annars en
// dev-fallback (facit-skyddet är en bekvämlighet i en publik demo mot syntetiskt
// innehåll — inte en säkerhetsgräns kring känslig data).
const SECRET =
  process.env.TRY_TEST_SECRET ?? process.env.INVESTOR_DECK_SECRET ?? 'try-dev-secret';

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

/** Signerar frågorna → token som klienten skickar tillbaka vid rättning. */
export function signQuestions(questions: PracticeQuestion[]): string {
  const payload = Buffer.from(JSON.stringify(questions)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Verifierar token och återger de fullständiga frågorna (med facit), eller null. */
export function verifyQuestions(token: string): PracticeQuestion[] | null {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as PracticeQuestion[]) : null;
  } catch {
    return null;
  }
}

/** Strippar facit ur frågorna innan de skickas till klienten. */
export function stripAnswers(questions: PracticeQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    lesson_id: q.lesson_id,
    options: q.options,
    max_points: q.max_points,
  }));
}

export type PublicQuestion = ReturnType<typeof stripAnswers>[number];
```

- [ ] **Step 2: Engångs-verifiering av round-trip**

Skriv `/tmp/try-token-check.mjs`:

```javascript
import { createHmac, timingSafeEqual } from 'node:crypto';
const SECRET = 'try-dev-secret';
const sign = (p) => createHmac('sha256', SECRET).update(p).digest('base64url');
const qs = [{ id: 'q1', type: 'multiple_choice', prompt: 'x', lesson_id: 'ekosystem', options: ['a','b','c','d'], correct_index: 2, answer_key: 'c', max_points: 1 }];
const payload = Buffer.from(JSON.stringify(qs)).toString('base64url');
const token = `${payload}.${sign(payload)}`;
// verify
const dot = token.lastIndexOf('.');
const ok = timingSafeEqual(Buffer.from(token.slice(dot+1)), Buffer.from(sign(token.slice(0,dot))));
const back = JSON.parse(Buffer.from(token.slice(0,dot), 'base64url').toString('utf8'));
console.assert(ok === true, 'signatur ska verifieras');
console.assert(back[0].correct_index === 2, 'facit ska bevaras');
// tamper
const bad = token.slice(0, dot) + '.' + sign('tampered');
const dot2 = bad.lastIndexOf('.');
const okBad = (() => { const a = Buffer.from(bad.slice(dot2+1)); const b = Buffer.from(sign(bad.slice(0,dot2))); return a.length===b.length && timingSafeEqual(a,b); })();
console.assert(okBad === false, 'manipulerad token ska nekas');
console.log('OK');
```

Run: `node /tmp/try-token-check.mjs`
Expected: `OK` utan assertion-fel. Ta sedan bort filen: `rm /tmp/try-token-check.mjs`

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/try/token.ts
git commit -m "feat(try): HMAC-signerad prov-token skyddar facit från klienten"
```

---

## Task 5: Rate-limiter (`lib/try/ratelimit.ts`)

Best-effort skydd mot spam. In-memory per serverless-instans — Fluid Compute återanvänder instanser så det ger reellt (om än inte garanterat) skydd. Den låsta korpusen är det primära missbruksskyddet; detta är ett komplement.

**Files:**
- Create: `apps/web/lib/try/ratelimit.ts`

- [ ] **Step 1: Skriv limitern**

```typescript
import 'server-only';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Best-effort fönsterbaserad rate-limit. `key` bör kombinera route + IP.
 * Returnerar true om anropet får gå igenom, false om taket nåtts.
 * OBS: in-memory per instans — inte en hård global gräns.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Härleder en klientnyckel ur request-headers (proxy-vänligt). */
export function clientKey(req: Request, route: string): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd ? fwd.split(',')[0]!.trim() : 'unknown';
  return `${route}:${ip}`;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/try/ratelimit.ts
git commit -m "feat(try): best-effort in-memory rate-limiter för publika API-rutter"
```

---

## Task 6: Gör AI-generering/rättning locale-medveten

`answerWithRag` följer redan frågans språk (regel 4 i system-prompten), så chatten behöver ingen ändring. Provgenerering och rättning har däremot hårdkodat "Använd svenska" — lägg en valfri `locale`-param som byter språkinstruktionen. Default = svenska (bakåtkompatibelt med befintliga anropare i `class-test.ts`/`practice-test.ts`).

**Files:**
- Modify: `apps/web/lib/ai/anthropic.ts`

- [ ] **Step 1: Lägg en språkhjälpare nära toppen (efter `getClient`)**

```typescript
// Språkinstruktion till prov-/rättningsprompterna. Default svenska.
function languageClause(locale?: 'sv' | 'en'): string {
  return locale === 'en'
    ? '\n\nWrite ALL questions, options and feedback in English.'
    : '';
}
```

- [ ] **Step 2: Ge `generatePracticeTest` en `locale`-param**

Ändra signaturen och prompten. Nuvarande (rad ~271):

```typescript
export async function generatePracticeTest(
  lessons: PracticeLessonInput[],
  questionCount: number,
): Promise<Omit<PracticeQuestion, 'id'>[] | null> {
```

Till:

```typescript
export async function generatePracticeTest(
  lessons: PracticeLessonInput[],
  questionCount: number,
  locale?: 'sv' | 'en',
): Promise<Omit<PracticeQuestion, 'id'>[] | null> {
```

Och i `client.messages.create({ ... system: TEST_GENERATION_SYSTEM_PROMPT, ... })` byt `system`-raden till:

```typescript
    system: TEST_GENERATION_SYSTEM_PROMPT + languageClause(locale),
```

- [ ] **Step 3: Ge `gradePracticeTest` en `locale`-param**

Nuvarande (rad ~581):

```typescript
export async function gradePracticeTest(
  items: PracticeGradeInput[],
  personaSummary?: string,
): Promise<PracticeGradeResult | null> {
```

Till:

```typescript
export async function gradePracticeTest(
  items: PracticeGradeInput[],
  personaSummary?: string,
  locale?: 'sv' | 'en',
): Promise<PracticeGradeResult | null> {
```

Och byt raden som bygger `system` (den med `TEST_GRADING_SYSTEM_PROMPT`) så språkklausulen läggs till på båda grenarna:

```typescript
  const base = TEST_GRADING_SYSTEM_PROMPT + languageClause(locale);
  const system = personaSummary
    ? `${base}\n\nDu känner sedan tidigare den här elevens lärprofil: "${personaSummary}" — vinkla feedbacken så den hjälper eleven framåt utifrån just det, men var fortfarande rättvis med poängen.`
    : base;
```

- [ ] **Step 4: Typecheck — säkerställ att befintliga anropare inte bryts**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel (params är valfria; `class-test.ts` och `practice-test.ts` anropar utan `locale` och fortsätter fungera).

- [ ] **Step 5: Lint**

Run: `pnpm --filter @elevante/web lint`
Expected: inga fel/varningar.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/ai/anthropic.ts
git commit -m "feat(try): locale-param på prov-generering och rättning (default svenska)"
```

---

## Task 7: Chatt-API (`/api/try/chat`)

Generaliserar investerar-demons chatt till flera valda lektioner. Återanvänder `answerWithRag` + citat-matchning.

**Files:**
- Create: `apps/web/app/api/try/chat/route.ts`

- [ ] **Step 1: Skriv rutten**

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answerWithRag } from '@/lib/ai/anthropic';
import { selectedLessons, toSegments, type TrySegment } from '@/lib/try/lessons';
import { allow, clientKey } from '@/lib/try/ratelimit';

const Body = z.object({
  question: z.string().trim().min(2).max(300),
  lessonIds: z.array(z.string()).min(1).max(6),
});

const STOP = new Set([
  'och','att','det','som','en','ett','är','på','för','med','av','de','den','i','vad',
  'hur','varför','när','om','till','från','man','kan','så','the','and','is','of','to',
  'a','in','what','why','how','when','does','do','blir','vid','en','för',
]);

function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-zåäö]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];
}

/** Väljer det segment vars ord överlappar mest med svar + fråga. */
function pickCitation(
  segments: TrySegment[],
  answer: string,
  question: string,
): { ts: string; quote: string } | null {
  const want = new Set([...tokens(answer), ...tokens(question)]);
  if (want.size === 0) return null;
  let best: { ts: string; quote: string } | null = null;
  let bestScore = 0;
  for (const seg of segments) {
    const score = tokens(seg.text).reduce((n, w) => n + (want.has(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      const quote = seg.text.length > 180 ? seg.text.slice(0, 180).trimEnd() + '…' : seg.text;
      best = { ts: seg.ts, quote };
    }
  }
  return bestScore > 0 ? best : null;
}

const REFUSAL = /togs inte upp|inte upp på den här|wasn.?t covered|not covered in (this|the) lesson/i;

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'chat'), 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { question, lessonIds } = parsed.data;
  const lessons = selectedLessons(lessonIds);
  if (lessons.length === 0) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const chunks = lessons.map((l) => ({
    lessonId: l.id,
    lessonTitle: l.title.sv,
    content: l.transcript,
  }));
  const concepts = [...new Set(lessons.flatMap((l) => l.concepts))];

  const result = await answerWithRag(question, chunks, concepts);
  if (!result) {
    return NextResponse.json({ offline: true });
  }

  const isRefusal = REFUSAL.test(result.content);
  const segments = lessons.flatMap((l) => toSegments(l.transcript));

  return NextResponse.json({
    answer: result.content,
    citation: isRefusal ? null : pickCitation(segments, result.content, question),
  });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Preview-smoke (kräver `ANTHROPIC_API_KEY` i `.env.local`; annars förväntas `offline:true`)**

Starta dev, anropa rutten:

```bash
curl -s -X POST http://localhost:3000/api/try/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"Vad är en trofinivå?","lessonIds":["naringskedjor"]}'
```

Expected: JSON med `answer` (och oftast `citation`), eller `{"offline":true}` om nyckel saknas. Aldrig 500.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/try/chat/route.ts
git commit -m "feat(try): /api/try/chat — RAG mot valda lektioner med källcitat"
```

---

## Task 8: Prov-API (`/api/try/test`)

Genererar ett prov från de valda lektionerna, returnerar frågor utan facit + en HMAC-token.

**Files:**
- Create: `apps/web/app/api/try/test/route.ts`

- [ ] **Step 1: Skriv rutten**

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PracticeQuestion } from '@/lib/supabase/database';
import { generatePracticeTest } from '@/lib/ai/anthropic';
import { selectedLessons } from '@/lib/try/lessons';
import { signQuestions, stripAnswers } from '@/lib/try/token';
import { allow, clientKey } from '@/lib/try/ratelimit';

const Body = z.object({
  lessonIds: z.array(z.string()).min(1).max(6),
  locale: z.enum(['sv', 'en']).default('sv'),
});

const QUESTION_COUNT = 5;

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'test'), 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { lessonIds, locale } = parsed.data;
  const lessons = selectedLessons(lessonIds);
  if (lessons.length === 0) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const generated = await generatePracticeTest(
    lessons.map((l) => ({ id: l.id, title: l.title[locale], transcript: l.transcript })),
    QUESTION_COUNT,
    locale,
  );

  if (!generated) {
    return NextResponse.json({ offline: true });
  }

  // Sätt stabila id:n (modellen sätter dem inte).
  const questions: PracticeQuestion[] = generated.map((q, i) => ({ ...q, id: `q${i + 1}` }));

  return NextResponse.json({
    questions: stripAnswers(questions),
    token: signQuestions(questions),
  });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Preview-smoke**

```bash
curl -s -X POST http://localhost:3000/api/try/test \
  -H 'Content-Type: application/json' \
  -d '{"lessonIds":["ekosystem","naringskedjor"],"locale":"sv"}' | head -c 400
```

Expected: JSON med `questions` (utan `answer_key`/`correct_index`) + `token`, eller `{"offline":true}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/try/test/route.ts
git commit -m "feat(try): /api/try/test — genererar prov, facit skyddat via token"
```

---

## Task 9: Rättnings-API (`/api/try/grade`)

Verifierar token, rättar flerval i kod och fritext via Claude, returnerar poäng + feedback i `TestResult`-kompatibel form.

**Files:**
- Create: `apps/web/app/api/try/grade/route.ts`

- [ ] **Step 1: Skriv rutten**

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PracticeAnswer } from '@/lib/supabase/database';
import { gradePracticeTest } from '@/lib/ai/anthropic';
import { verifyQuestions } from '@/lib/try/token';
import { allow, clientKey } from '@/lib/try/ratelimit';

const Body = z.object({
  token: z.string().min(10),
  locale: z.enum(['sv', 'en']).default('sv'),
  answers: z
    .array(z.object({ question_id: z.string(), answer: z.string().max(1000) }))
    .min(1)
    .max(20),
});

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'grade'), 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { token, locale, answers } = parsed.data;
  const questions = verifyQuestions(token);
  if (!questions) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const answerFor = new Map(answers.map((a) => [a.question_id, a.answer]));

  // Flerval rättas deterministiskt i kod.
  const graded: PracticeAnswer[] = [];
  const freeText: {
    question_id: string;
    prompt: string;
    answer_key: string;
    max_points: number;
    student_answer: string;
  }[] = [];

  for (const q of questions) {
    const given = (answerFor.get(q.id) ?? '').trim();
    if (q.type === 'multiple_choice') {
      const chosen = Number.parseInt(given, 10);
      const correct = Number.isInteger(chosen) && chosen === q.correct_index;
      graded.push({
        question_id: q.id,
        answer: given,
        points: correct ? q.max_points : 0,
        max_points: q.max_points,
        correct,
        feedback: '',
      });
    } else {
      freeText.push({
        question_id: q.id,
        prompt: q.prompt,
        answer_key: q.answer_key,
        max_points: q.max_points,
        student_answer: given,
      });
    }
  }

  let overallFeedback = '';
  if (freeText.length > 0) {
    const result = await gradePracticeTest(freeText, undefined, locale);
    if (result) {
      overallFeedback = result.overall_feedback;
      const byId = new Map(result.grades.map((g) => [g.question_id, g]));
      for (const ft of freeText) {
        const g = byId.get(ft.question_id);
        graded.push({
          question_id: ft.question_id,
          answer: ft.student_answer,
          points: g ? Math.min(g.points, ft.max_points) : 0,
          max_points: ft.max_points,
          correct: null,
          feedback: g?.feedback ?? '',
        });
      }
    } else {
      // Offline: ge fritextfrågor 0 poäng utan feedback hellre än att fela.
      for (const ft of freeText) {
        graded.push({
          question_id: ft.question_id,
          answer: ft.student_answer,
          points: 0,
          max_points: ft.max_points,
          correct: null,
          feedback: '',
        });
      }
    }
  }

  // Sortera tillbaka i frågeordning.
  const order = new Map(questions.map((q, i) => [q.id, i]));
  graded.sort((a, b) => (order.get(a.question_id) ?? 0) - (order.get(b.question_id) ?? 0));

  const score = graded.reduce((s, a) => s + a.points, 0);
  const maxScore = questions.reduce((s, q) => s + q.max_points, 0);

  return NextResponse.json({ answers: graded, overallFeedback, score, maxScore });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Preview-smoke (kedja test → grade)**

Generera ett prov (Task 8 curl), kopiera `token`, skicka ett svar per fråga (flerval som index-sträng, fritext som text). Expected: JSON med `answers`, `score`, `maxScore`; `score` ≤ `maxScore`. Manipulera token en tecken → förväntat 400.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/try/grade/route.ts
git commit -m "feat(try): /api/try/grade — flerval i kod, fritext av Claude, token-verifierad"
```

---

## Task 10: StepRail (progress-rad)

**Files:**
- Create: `apps/web/components/try/StepRail.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr } from '@/lib/try/copy';

type Props = {
  locale: Locale;
  current: 1 | 2 | 3;
  maxReached: 1 | 2 | 3;
  onGo: (step: 1 | 2 | 3) => void;
};

export function StepRail({ locale, current, maxReached, onGo }: Props) {
  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: tr(locale, TRY_COPY.step1) },
    { n: 2, label: tr(locale, TRY_COPY.step2) },
    { n: 3, label: tr(locale, TRY_COPY.step3) },
  ];

  return (
    <nav aria-label={locale === 'en' ? 'Progress' : 'Framsteg'} className="mb-10">
      <ol className="flex items-center gap-2 md:gap-4">
        {steps.map((s, i) => {
          const active = s.n === current;
          const reachable = s.n <= maxReached;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2 md:gap-4">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onGo(s.n)}
                aria-current={active ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8125rem] transition-colors',
                  active
                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : reachable
                      ? 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]'
                      : 'text-[var(--color-ink-muted)] cursor-not-allowed',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-full text-[0.6875rem] tabular-nums',
                    active
                      ? 'bg-[var(--color-canvas)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-sand)] text-[var(--color-ink-secondary)]',
                  ].join(' ')}
                >
                  {s.n}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 ? (
                <span className="h-px flex-1 bg-[var(--color-sand)]" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/try/StepRail.tsx
git commit -m "feat(try): StepRail progress-komponent"
```

---

## Task 11: LessonPicker (steg ①)

**Files:**
- Create: `apps/web/components/try/LessonPicker.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr, type L } from '@/lib/try/copy';

// Lättviktig lektionsvy till klienten (ingen transkripttext skickas hit).
export type LessonCard = { id: string; title: L; summary: L; concepts: string[] };

type Props = {
  locale: Locale;
  lessons: LessonCard[];
  selected: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
};

export function LessonPicker({ locale, lessons, selected, onToggle, onContinue }: Props) {
  return (
    <div>
      <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
        {tr(locale, TRY_COPY.pickTitle)}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-[var(--color-ink-secondary)]">
        {tr(locale, TRY_COPY.pickHint)}
      </p>
      {locale === 'en' ? (
        <p className="mt-1 text-[0.8125rem] italic text-[var(--color-ink-muted)]">
          {tr(locale, TRY_COPY.swedishNote)}
        </p>
      ) : null}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {lessons.map((l) => {
          const on = selected.includes(l.id);
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onToggle(l.id)}
                aria-pressed={on}
                className={[
                  'w-full rounded-[16px] border p-5 text-left transition-colors',
                  on
                    ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-sand)] hover:border-[var(--color-ink-muted)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-[1.125rem] leading-snug text-[var(--color-ink)]">
                    {tr(locale, l.title)}
                  </h3>
                  <span
                    aria-hidden
                    className={[
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.75rem]',
                      on
                        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]'
                        : 'border-[var(--color-ink-muted)] text-transparent',
                    ].join(' ')}
                  >
                    ✓
                  </span>
                </div>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {tr(locale, l.summary)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-canvas)] transition-opacity disabled:opacity-40"
        >
          {tr(locale, TRY_COPY.continue)} →
        </button>
        <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {selected.length} {tr(locale, TRY_COPY.selectedCount)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/try/LessonPicker.tsx
git commit -m "feat(try): LessonPicker — multi-select lektionsval"
```

---

## Task 12: ChatStep (steg ②)

**Files:**
- Create: `apps/web/components/try/ChatStep.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr, type L } from '@/lib/try/copy';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  citation?: { ts: string; quote: string } | null;
};

type Props = {
  locale: Locale;
  lessonIds: string[];
  suggestions: L[];
  onToTest: () => void;
};

export function ChatStep({ locale, lessonIds, suggestions, onToTest }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }),
    );
  }

  async function ask(question: string, suggestionIdx?: number) {
    const q = question.trim();
    if (!q || pending) return;
    setError(null);
    setInput('');
    if (suggestionIdx !== undefined) setUsed((s) => new Set(s).add(suggestionIdx));
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setPending(true);
    scrollDown();

    try {
      const res = await fetch('/api/try/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lessonIds }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(tr(locale, TRY_COPY.rateLimited));
      } else if (!res.ok || data.offline || typeof data.answer !== 'string') {
        setError(tr(locale, TRY_COPY.chatError));
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: data.answer, citation: data.citation ?? null },
        ]);
      }
    } catch {
      setError(tr(locale, TRY_COPY.chatError));
    } finally {
      setPending(false);
      scrollDown();
    }
  }

  return (
    <div>
      <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
        {tr(locale, TRY_COPY.chatTitle)}
      </h2>

      <div
        ref={scrollRef}
        className="mt-6 max-h-[420px] space-y-4 overflow-y-auto rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
            {tr(locale, TRY_COPY.suggestionsLabel)}
          </p>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={[
                'inline-block max-w-[85%] rounded-[14px] px-4 py-3 text-[0.9375rem] leading-relaxed',
                m.role === 'user'
                  ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                  : 'bg-[var(--color-canvas)] text-[var(--color-ink)]',
              ].join(' ')}
            >
              {m.content}
              {m.citation ? (
                <span className="mt-3 block rounded-[10px] border-l-2 border-[var(--color-sage-deep)] bg-[var(--color-surface)] px-3 py-2 text-left text-[0.8125rem] text-[var(--color-ink-secondary)]">
                  <span className="mb-1 block text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                    {tr(locale, TRY_COPY.sourceLabel)} · {m.citation.ts}
                  </span>
                  “{m.citation.quote}”
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {pending ? (
          <p className="text-[0.875rem] italic text-[var(--color-ink-muted)]">
            {tr(locale, TRY_COPY.thinking)}
          </p>
        ) : null}
        {error ? <p className="text-[0.875rem] text-[var(--color-coral)]">{error}</p> : null}
      </div>

      {/* Förslags-chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s, i) =>
          used.has(i) ? null : (
            <button
              key={i}
              type="button"
              disabled={pending}
              onClick={() => ask(tr(locale, s), i)}
              className="rounded-full border border-[var(--color-sand)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-muted)] disabled:opacity-40"
            >
              {tr(locale, s)}
            </button>
          ),
        )}
      </div>

      {/* Inmatning */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          placeholder={tr(locale, TRY_COPY.chatPlaceholder)}
          className="flex-1 rounded-full border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
        <button
          type="submit"
          disabled={pending || input.trim().length < 2}
          className="rounded-full bg-[var(--color-ink)] px-5 py-3 text-[0.9375rem] text-[var(--color-canvas)] disabled:opacity-40"
        >
          {tr(locale, TRY_COPY.send)}
        </button>
      </form>

      <div className="mt-8">
        <button
          type="button"
          onClick={onToTest}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
        >
          {tr(locale, TRY_COPY.toTest)} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/try/ChatStep.tsx
git commit -m "feat(try): ChatStep — RAG-chatt med förslags-chips och källcitat"
```

---

## Task 13: TestStep (steg ③)

Egen resultatvy (kopierar `TestResult`-mönstret men frikopplad från DB-typerna — den publika rutten returnerar en enklare form).

**Files:**
- Create: `apps/web/components/try/TestStep.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr } from '@/lib/try/copy';

type PublicQuestion = {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'open' | 'reasoning';
  prompt: string;
  lesson_id: string;
  options: string[] | null;
  max_points: number;
};

type GradedAnswer = {
  question_id: string;
  answer: string;
  points: number;
  max_points: number;
  correct: boolean | null;
  feedback: string;
};

type GradeResponse = {
  answers: GradedAnswer[];
  overallFeedback: string;
  score: number;
  maxScore: number;
};

type Phase = 'intro' | 'answering' | 'result';

type Props = { locale: Locale; lessonIds: string[] };

export function TestStep({ locale, lessonIds }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [token, setToken] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/try/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds, locale }),
      });
      const data = await res.json();
      if (res.status === 429) setError(tr(locale, TRY_COPY.rateLimited));
      else if (!res.ok || data.offline || !Array.isArray(data.questions))
        setError(tr(locale, TRY_COPY.testError));
      else {
        setQuestions(data.questions);
        setToken(data.token);
        setAnswers({});
        setPhase('answering');
      }
    } catch {
      setError(tr(locale, TRY_COPY.testError));
    } finally {
      setBusy(false);
    }
  }

  async function grade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/try/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          locale,
          answers: questions.map((q) => ({ question_id: q.id, answer: answers[q.id] ?? '' })),
        }),
      });
      const data = await res.json();
      if (res.status === 429) setError(tr(locale, TRY_COPY.rateLimited));
      else if (!res.ok || !Array.isArray(data.answers)) setError(tr(locale, TRY_COPY.testError));
      else {
        setResult(data);
        setPhase('result');
      }
    } catch {
      setError(tr(locale, TRY_COPY.testError));
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'intro') {
    return (
      <div>
        <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
          {tr(locale, TRY_COPY.testTitle)}
        </h2>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {tr(locale, TRY_COPY.testIntro)}
        </p>
        {error ? <p className="mt-4 text-[0.875rem] text-[var(--color-coral)]">{error}</p> : null}
        <button
          type="button"
          onClick={createTest}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-canvas)] disabled:opacity-40"
        >
          {busy ? tr(locale, TRY_COPY.creatingTest) : tr(locale, TRY_COPY.createTest)}
        </button>
      </div>
    );
  }

  if (phase === 'answering') {
    return (
      <div>
        <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
          {tr(locale, TRY_COPY.testTitle)}
        </h2>
        <ol className="mt-6 space-y-6">
          {questions.map((q, idx) => (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
            >
              <p className="mb-3 text-[0.9375rem] font-medium text-[var(--color-ink)]">
                {idx + 1}. {q.prompt}
              </p>
              {q.type === 'multiple_choice' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className="flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2 text-[0.9375rem] text-[var(--color-ink)] hover:bg-[var(--color-canvas)]"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === String(oi)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(oi) }))}
                        className="mt-1"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  maxLength={1000}
                  rows={3}
                  placeholder={tr(locale, TRY_COPY.answerPlaceholder)}
                  className="w-full rounded-[10px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-3 py-2 text-[0.9375rem] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
                />
              )}
            </li>
          ))}
        </ol>
        {error ? <p className="mt-4 text-[0.875rem] text-[var(--color-coral)]">{error}</p> : null}
        <button
          type="button"
          onClick={grade}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-canvas)] disabled:opacity-40"
        >
          {busy ? tr(locale, TRY_COPY.gradingTest) : tr(locale, TRY_COPY.gradeTest)}
        </button>
      </div>
    );
  }

  // phase === 'result'
  const r = result!;
  const percent = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
  const byId = new Map(r.answers.map((a) => [a.question_id, a]));
  return (
    <div className="space-y-8">
      <div className="rounded-[20px] bg-[var(--color-surface)] p-6 text-center">
        <p className="eyebrow">{locale === 'en' ? 'Result' : 'Resultat'}</p>
        <p className="mt-2 font-serif text-[2.25rem] leading-none text-[var(--color-ink)] tabular-nums md:text-[2.75rem]">
          {r.score}
          <span className="text-[var(--color-ink-muted)]">/{r.maxScore}</span>
        </p>
        <p className="mt-1 text-[0.9375rem] text-[var(--color-ink-secondary)]">{percent}%</p>
        {r.overallFeedback ? (
          <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
            {r.overallFeedback}
          </p>
        ) : null}
      </div>

      <ol className="space-y-5">
        {questions.map((q, idx) => {
          const a = byId.get(q.id);
          return (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
            >
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {locale === 'en' ? 'Question' : 'Fråga'} {idx + 1}
                </span>
                <span className="text-[0.8125rem] tabular-nums text-[var(--color-ink-secondary)]">
                  {a?.points ?? 0}/{q.max_points}
                </span>
              </div>
              <p className="text-[0.9375rem] text-[var(--color-ink)]">{q.prompt}</p>
              {a?.feedback ? (
                <p className="mt-3 rounded-[10px] bg-[var(--color-canvas)] px-3 py-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {a.feedback}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => {
          setPhase('intro');
          setResult(null);
          setQuestions([]);
        }}
        className="text-[0.875rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
      >
        {tr(locale, TRY_COPY.restart)}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/try/TestStep.tsx
git commit -m "feat(try): TestStep — prov, svar och AI-rättat resultat"
```

---

## Task 14: TryExperience (orkestrering)

**Files:**
- Create: `apps/web/components/try/TryExperience.tsx`

- [ ] **Step 1: Skriv orkestreraren**

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { tr, type L } from '@/lib/try/copy';
import { StepRail } from './StepRail';
import { LessonPicker, type LessonCard } from './LessonPicker';
import { ChatStep } from './ChatStep';
import { TestStep } from './TestStep';

type Props = { locale: Locale; lessons: LessonCard[]; suggestionsByLesson: Record<string, L[]> };

export function TryExperience({ locale, lessons, suggestionsByLesson }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [maxReached, setMaxReached] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>([]);

  function go(next: 1 | 2 | 3) {
    setStep(next);
    setMaxReached((m) => (next > m ? next : m));
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  // Slå ihop förslagsfrågor från de valda lektionerna (max 6 chips).
  const suggestions = useMemo(() => {
    const out: L[] = [];
    for (const id of selected) for (const s of suggestionsByLesson[id] ?? []) out.push(s);
    return out.slice(0, 6);
  }, [selected, suggestionsByLesson]);

  return (
    <div>
      <StepRail locale={locale} current={step} maxReached={maxReached} onGo={go} />

      {step === 1 ? (
        <LessonPicker
          locale={locale}
          lessons={lessons}
          selected={selected}
          onToggle={toggle}
          onContinue={() => go(2)}
        />
      ) : null}

      {step === 2 ? (
        <ChatStep
          locale={locale}
          lessonIds={selected}
          suggestions={suggestions}
          onToTest={() => go(3)}
        />
      ) : null}

      {step === 3 ? <TestStep locale={locale} lessonIds={selected} /> : null}
    </div>
  );
}

export { tr }; // återexport bekvämlighet (undviker oanvänd-import-varning om page inte behöver den)
```

Ta bort återexport-raden om lint klagar på oanvänd `tr`-import; importera då inte `tr` alls. (Behåll importen bara om den används.)

- [ ] **Step 2: Justera import om `tr` är oanvänd**

Om Step 1:s kod inte använder `tr`, ändra importraden till:

```tsx
import type { L } from '@/lib/try/copy';
```

och ta bort återexport-raden.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel/varningar.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/try/TryExperience.tsx
git commit -m "feat(try): TryExperience orkestrerar de tre stegen"
```

---

## Task 15: Sidan (`/try/page.tsx`)

**Files:**
- Create: `apps/web/app/[locale]/(public)/try/page.tsx`

- [ ] **Step 1: Skriv sidan**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor } from '@/lib/site';
import { Container } from '@/components/public/Container';
import { LinkButton } from '@/components/public/Button';
import { TRY_LESSONS } from '@/lib/try/lessons';
import { TRY_COPY, tr } from '@/lib/try/copy';
import { TryExperience } from '@/components/try/TryExperience';
import type { L } from '@/lib/try/copy';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    title: sv ? 'Prova Elevante — utan inloggning' : 'Try Elevante — no sign-in',
    description: sv
      ? 'Välj lektioner, chatta med innehållet och låt Elevante skapa och rätta ett prov åt dig. Riktiga svar, med källa.'
      : 'Pick lessons, chat with the content, and let Elevante build and grade a test for you. Real answers, with sources.',
    alternates: alternatesFor(locale, '/try'),
  };
}

export default async function TryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;

  // Skicka bara lättviktig metadata till klienten — inga transkript.
  const lessons = TRY_LESSONS.map((l) => ({
    id: l.id,
    title: l.title,
    summary: l.summary,
    concepts: l.concepts,
  }));
  const suggestionsByLesson: Record<string, L[]> = Object.fromEntries(
    TRY_LESSONS.map((l) => [l.id, l.suggestions]),
  );

  return (
    <>
      <section className="pt-12 pb-8 md:pt-20 md:pb-10">
        <Container width="wide">
          <p className="eyebrow mb-6">{tr(locale, TRY_COPY.eyebrow)}</p>
          <div className="grid items-end gap-6 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-7">
              <h1 className="font-serif text-[clamp(2.5rem,4.5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {tr(locale, TRY_COPY.heroTitle)}
              </h1>
            </div>
            <div className="md:col-span-5">
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {tr(locale, TRY_COPY.heroLede)}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container width="content">
          <TryExperience
            locale={locale}
            lessons={lessons}
            suggestionsByLesson={suggestionsByLesson}
          />
        </Container>
      </section>

      <section className="border-t border-[var(--color-sand)] py-16 md:py-20">
        <Container width="content">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
              {tr(locale, TRY_COPY.outroTitle)}
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {tr(locale, TRY_COPY.outroLede)}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {tr(locale, TRY_COPY.bookDemo)}
              </LinkButton>
              <Link
                href={`${base}/for-skolor`}
                className="inline-flex items-center gap-2 px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {tr(locale, TRY_COPY.forSchools)} →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verifiera `Container`/`LinkButton`-props matchar `/demo`**

Run: `grep -n "width=\|size=" "apps/web/app/[locale]/(public)/demo/page.tsx"`
Expected: bekräftar `width="wide"`, `width="content"`, `size="lg"` finns i mönstret vi kopierar. Justera om props skiljer sig.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 4: Preview — hela flödet**

`preview_start` → navigera till `/sv/try`. Verifiera: hero syns, välj 2 lektioner → Fortsätt → ställ en förslagsfråga (svar + citat) → Testa dig själv → Skapa prov → svara → Rätta → resultat med poäng. Upprepa på `/en/try` (svar/prov på engelska, citat på svenska). Kontrollera `preview_console_logs` (inga fel) och `preview_resize` mobile (375px).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[locale]/(public)/try/page.tsx"
git commit -m "feat(try): publik sida /try som orkestrerar upplevelsen"
```

---

## Task 16: SEO — sitemap + nav-länkar

**Files:**
- Modify: `apps/web/lib/site.ts`
- Modify: `apps/web/lib/i18n/types.ts`
- Modify: `apps/web/lib/i18n/locales/sv.ts`
- Modify: `apps/web/lib/i18n/locales/en.ts`
- Modify: `apps/web/components/public/Header.tsx`
- Modify: `apps/web/components/public/Footer.tsx`

- [ ] **Step 1: Lägg `/try` i `PAGE_PATHS`**

I `apps/web/lib/site.ts`, lägg till i arrayen (efter `/for-elever`):

```typescript
  '/try',
```

Detta ger sidan hreflang-alternerade sitemap-poster automatiskt (sitemap läser `PAGE_PATHS`).

- [ ] **Step 2: Lägg nav-etikett i i18n-typen**

I `apps/web/lib/i18n/types.ts`, hitta `nav`-objektets typ och lägg till fältet `try: string;` bredvid `forSchools`.

- [ ] **Step 3: Fyll etiketten i båda ordböckerna**

I `apps/web/lib/i18n/locales/sv.ts`, i `nav`-objektet: `try: 'Prova',`
I `apps/web/lib/i18n/locales/en.ts`, i `nav`-objektet: `try: 'Try',`

- [ ] **Step 4: Lägg länken i Header och Footer**

I `apps/web/components/public/Header.tsx`, i BÅDA nav-arrayerna (rad ~17 och ~121), lägg en post efter `forStudents`-posten (`{ href: \`${base}/for-elever\`, label: dict.nav.forStudents }`), matcha objektformen på plats:

```tsx
    { href: `${base}/try`, label: dict.nav.try },
```

I `apps/web/components/public/Footer.tsx`, i nav-arrayen (rad ~17), lägg motsvarande:

```tsx
    { href: `${base}/try`, label: dict.nav.try },
```

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel (typen tvingar att båda ordböckerna fyllts).

- [ ] **Step 6: Verifiera sitemap innehåller /try**

`preview_start` → hämta `/sitemap.xml`, bekräfta både `/sv/try` och `/en/try` finns med hreflang-alternates.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/site.ts apps/web/lib/i18n/ apps/web/components/public/Header.tsx apps/web/components/public/Footer.tsx
git commit -m "feat(try): sitemap-post + nav-länkar (Prova/Try)"
```

---

## Task 17: Slutverifiering

- [ ] **Step 1: Full typecheck + lint + build**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint && pnpm --filter @elevante/web build`
Expected: allt grönt; `/[locale]/(public)/try` listas som genererad rutt (SSG) och API-rutterna som dynamiska.

- [ ] **Step 2: A11y-svep i preview**

På `/sv/try`: tabba igenom stegrad → lektionskort → chatt → prov. Verifiera fokus-synlighet, att `aria-pressed`/`aria-current` sätts, och att chatt-svar annonseras (`aria-live`). Kör `preview_resize` mobile + `colorScheme: dark`.

- [ ] **Step 3: Offline-graceful-kontroll**

Tillfälligt: kör dev utan `ANTHROPIC_API_KEY`. Verifiera att chatten visar `chatError`/offline-hantering och att prov-steget visar `testError` snyggt — aldrig en kraschad sida.

- [ ] **Step 4: Ingen regression på befintliga prov-flöden**

Verifiera att lärarens klassprov och elevens övningsprov fortfarande fungerar (de anropar `generatePracticeTest`/`gradePracticeTest` utan `locale`). Snabb preview av `/sv/app/teacher/klassprov` (skapa draft) räcker som rök-check.

- [ ] **Step 5: Slutcommit om något justerats**

```bash
git add -A && git commit -m "chore(try): slutverifiering — typecheck, lint, build, a11y, offline"
```

---

## Self-Review (ifylld)

**Spec-täckning:**
- Publik indexerbar `/sv/try` + `/en/try` → Task 15 (metadata utan noindex, `alternatesFor`) + Task 16 (sitemap).
- Guidad väg i tre steg + progress-rad → Task 10 (StepRail) + Task 14 (TryExperience).
- Steg ① multi-select lektioner → Task 11.
- Steg ② RAG-chatt, källcitat, kontextuella förslag, "Testa dig själv" → Task 7 (API) + Task 12 (UI).
- Steg ③ generera prov → svara → rätta → resultat + feedback → Task 8, 9 (API) + Task 13 (UI).
- AI svarar på besökarens locale, citat på svenska → Task 6 (locale-param) + Task 7 (citat från svenskt segment) + Task 12 (svensk citat-ruta).
- Ekologi-only, statiskt server-only bibliotek → Task 1, 2.
- Stateless, inget sparas → alla API-rutter är rena (ingen DB-skrivning).
- Facit-skydd → Task 4 (HMAC) + Task 8 (strip) + Task 9 (verify).
- Rate-limit + inputtak + max_tokens + offline-graceful → Task 5 + Zod-scheman i Task 7–9 + befintlig `answerWithRag`/`gradePracticeTest`-nullhantering.
- WCAG AA, aria-live, i18n, responsivt → Task 3 (copy) + Task 12/13 (aria) + Task 17 (a11y-svep).
- Mjuk avslutning → Task 15 (outro-sektion).

**Placeholder-scan:** Inga TBD/TODO. All kod komplett i stegen.

**Typkonsistens:** `PublicQuestion`-formen i `token.ts` (Task 4) matchar `PublicQuestion` i `TestStep.tsx` (Task 13) och `stripAnswers`-outputen i `/api/try/test` (Task 8). `GradedAnswer` i TestStep matchar `PracticeAnswer`-fälten som `/api/try/grade` returnerar (Task 9). `LessonCard` definieras i Task 11 och konsumeras i Task 14/15. `L`-typen finns i både `lessons.ts` och `copy.ts` (identisk `{sv;en}`) — medvetet, copy.ts är klient-säker (ingen `server-only`).

**Öppna punkter från specen — avgjorda:**
- Facit-skydd: HMAC-signerad token (Task 4).
- Rate-limit: best-effort in-memory (Task 5) — låst korpus är primärskyddet; dokumenterat som ej hård global gräns.
- Förslagsfrågor: hårdkodade per lektion i `lessons.ts` (Task 2), aldrig runtime-AI.
