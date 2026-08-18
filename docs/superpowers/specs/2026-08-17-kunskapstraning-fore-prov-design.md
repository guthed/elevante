# Kunskapsträning före prov — Foundation (Repetera + Träna)

Källa: Notion "Kunskapsträning före prov" (https://www.notion.so/e4f15b54736c4839a1f2c5388f0351a4)

## Bakgrund

Elevappen har idag efterhandsverktyg (chat, provplugg, övningsprov) men inget som
låter eleven öva aktivt på lektionsinnehåll *innan* det provas. Positionering:
"Ta reda på vad du faktiskt kan — innan det räknas."

Notion-sidan beskriver fem tänkta träningslägen (Repetera, Träna, Förstå, Testa,
Förhör mig). Det är för stort för en enda spec/plan. Detta dokument täcker bara
**Foundation**: träningsunderlag-generering (Lager 1) + Repetera (flashcards) och
Träna (kunskapskollar) som ren applogik ovanpå det underlaget (Lager 2). Förhör
mig och Förklara med egna ord (Lager 3, riktade LLM-anrop per elevsvar) blir egna
specar efter detta, informerade av vad vi lär oss här.

## Kärnprincip

Träningsmaterial genereras **en gång per lektion**, inte per elev/klick. Tre lager:

- **Lager 1** — ett LLM-anrop per lektion extraherar strukturerat träningsunderlag,
  lagras i Supabase.
- **Lager 2** (detta dokuments huvudscope) — flashcards/kunskapskollar serveras
  och schemaläggs (spaced repetition) från Lager 1-underlaget. Ren applogik,
  inga nya AI-anrop vid elevens klick.
- **Lager 3** (senare specar) — riktade, lätta LLM-anrop för Förhör mig och
  Förklara med egna ord, aldrig mot hela transkriptet igen.

## Beslut från brainstorming

1. **Pipeline-hook:** separat Claude-anrop (`generateTrainingMaterial`) direkt
   efter det befintliga `generateLessonContent`-anropet i
   `supabase/functions/transcribe-lesson/index.ts`, med eget try/catch så ett
   fel där aldrig blockerar transcript/summary/chat.
2. **Spaced repetition:** SM-2 (ease factor + interval + repetitions), egen
   ~50-radersimplementation utan extern dependency. Internal state exponeras
   aldrig för eleven.
3. **AI-providerabstraktion (Claude vs. Berget):** avvakta till Lager 3-specen.
   Foundations `generateTrainingMaterial` anropar Claude direkt, samma mönster
   som befintliga `generateLessonContent`.
4. **exam_prediction** (provnära frågor från Notion-sidans Lager 1-schema)
   ingår INTE i Foundation — ingen konsument i v1 (Testa-läget som skulle
   använda det är explicit ute ur scope). Läggs till när Testa-läget byggs.
5. **Urval:** flerlektionsväljare (kurs → checkbox-lista lektioner), samma
   mönster som `ExamPrepPicker` i `/student/provplugg`, inte bara en lektion åt
   gången — matchar "innan det räknas"-positioneringen inför ett riktigt prov.
6. **Entrypoint:** ny toppnivå-nav-post i elevappen (t.ex. "Öva"), inte
   ingnestlad i lektionssidan.
7. **Self-diagnosis:** ingen separat `self_diagnosis`-tabell/fält. SM-2-
   betygsättningen (Vet inte/Osäker/Kan det) *är* self-diagnosis-signalen;
   koncept-bemästring härleds vid läsning från flashcard-SM2-state +
   kunskapskoll-träffsäkerhet, inte en tredje parallell datastruktur.
8. **Facit-synlighet i kunskapskollar:** serveras direkt via RLS-scopad select
   (ingen answer-hiding RPC likt `class_tests`) — detta är lågstakes
   självträning, inte ett bedömt prov. `correct_index`/`explanation` avslöjas
   klientsidan bara efter att eleven svarat.

## Datamodell

Migration `training_materials` (jsonb-på-föräldrarad, samma konvention som
`class_tests.questions`):

```sql
create table public.training_materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  concepts jsonb not null default '[]'::jsonb,
  -- [{id, name, definition, example, misconception}]
  flashcards jsonb not null default '[]'::jsonb,
  -- [{id, concept_id, front, back}]
  knowledge_checks jsonb not null default '[]'::jsonb,
  -- [{id, concept_id, question, choices: string[], correct_index, explanation}]
  model_version text,
  generated_at timestamptz not null default now()
);
```

RLS: samma mönster som `lessons`/`materials` — elev får SELECT om lektionen
tillhör en klass eleven är medlem i (join via `class_members`); lärare/admin i
samma skola får SELECT; ingen elev-INSERT/UPDATE (bara service-role, från
Edge Function eller Server Action-backfill).

Progress-tabeller (RLS: bara `student_id = auth.uid()` för både select/insert/update):

```sql
create table public.flashcard_review_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  flashcard_id uuid not null, -- id inuti training_materials.flashcards, ej FK (jsonb)
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  last_grade text check (last_grade in ('again','hard','good')),
  unique (student_id, flashcard_id)
);

create table public.knowledge_check_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  knowledge_check_id uuid not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);
```

Ingen rad skapas förrän eleven faktiskt granskat ett kort/svarat på en fråga
första gången — nya flashcards/kunskapskollar (från nytranskriberade lektioner)
kräver alltså ingen backfill av progress-tabellerna.

## Lager 1 — generering

Ny funktion `generateTrainingMaterial(transcript, teacherName)`
+ eget systemprompt, strukturellt likt `LESSON_CONTENT_SYSTEM_PROMPT` men fokuserat
på: 4-8 koncept (namn/definition/exempel/vanligt missförstånd), ~2 flashcards per
koncept, ~1-2 kunskapskollar (flerval, 4 alternativ) per koncept. JSON-svar,
samma fence-strip + validering som befintlig kod.

`transcribe-lesson/index.ts`: kallas direkt efter `generateLessonContent` (steg
6.5b), egen try/catch — misslyckande loggas men blockerar aldrig
transcript/summary/chat-uppdateringen. Vid lyckat anrop: insert i
`training_materials` (upsert på `lesson_id` för omkörningsfall).

**Backfill för befintliga lektioner:** triggas lat när en träningssession byggs
för en lektion som saknar `training_materials`-rad — inget separat batch-skript.
Funktionen bor bara i Edge-funktionen (ett `training_material_only`-läge som
Next.js anropar via `functions.invoke`), så pipelinen och backfillen delar en
enda prompt och validering i stället för två implementationer som kan glida isär.

## Lager 2 — servering & schemaläggning

`lib/training/sm2.ts` — ren funktion, ingen dependency:
```
sm2(state: {ease, interval, repetitions}, grade: 'again'|'hard'|'good')
  → {ease, interval, repetitions, dueAt}
```
Standard SM-2 med tre-gradig indata istället för 0-5 (again≈quality 1,
hard≈quality 3, good≈quality 5) — enklare UI, samma algoritm.

`lib/data/training.ts` (mönster som `lib/data/student.ts`):
- `getOvaCourses(studentId)` — kurser + lektioner med `training_materials`-status,
  återanvänder samma join som `ProvpluggCourse`.
- `buildFlashcardSession(studentId, lessonIds)` — trigger backfill vid behov,
  hämta flashcards för lektionerna, joina `flashcard_review_state`, filtrera
  `due_at <= now()` (fallback: alla, om inga är due — "träna ändå"), cap ~20,
  spara som `training_sessions`-rad (se nedan) för stabilt urval vid refresh.
- `buildKnowledgeCheckSession(studentId, lessonIds)` — samma, viktat mot koncept
  med lägre nyligen-träffsäkerhet (från `knowledge_check_attempts`), cap ~10.
- `recordFlashcardGrade(studentId, flashcardId, grade)` — kör `sm2()`, upsert
  `flashcard_review_state`.
- `recordKnowledgeCheckAnswer(studentId, knowledgeCheckId, correct)` — insert
  `knowledge_check_attempts`.

`training_sessions`-tabell (ephemeral, men persisted så refresh inte blandar om
urvalet mitt i en session — samma resonemang som `chats`):
```sql
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  mode text not null check (mode in ('flashcards','knowledge_checks')),
  lesson_ids uuid[] not null,
  item_ids uuid[] not null,
  created_at timestamptz not null default now()
);
```
RLS: `student_id = auth.uid()`.

## UI/UX

Ny nav-post **Öva** i `SidebarNav` (elevrollen), route `/student/ova`.

- `/student/ova` — `OvaPicker.tsx`, kopia av `ExamPrepPicker`s kurs→lektion-
  checkbox-flöde (steg 1-2 identiska), steg 3 blir två lägeskort:
  **Flashcards** och **Kunskapskoll** (istället för Test/Chat). Submit →
  Server Action bygger session → redirect.
- `/student/ova/repetera/[sessionId]` — ett flashcard i taget, tryck för att
  vända, tre betygsknappar (Vet inte/Osäker/Kan det), progressindikator,
  slutar med sammanfattning.
- `/student/ova/trana/[sessionId]` — en flervalsfråga i taget, välj svar,
  omedelbar reveal + förklaring, nästa, slutar med poängsammanfattning.

Ingen delning med lärare i v1 (explicit ute ur scope enligt Notion-sidan).

## Explicit ute ur scope (denna spec)

- Förhör mig, Förklara med egna ord (Lager 3) — egna specar.
- Förstås övriga format (begreppskarta, "lär ut det") — v2.
- Testa-läget, exam_prediction — senare, kopplat till befintligt provsystem.
- Delning av träningsresultat med lärare.
- Modellval Claude/Berget-konfiguration — Lager 3-spec.

## Avvikelser från specen vid implementation (2026-08-18)

Specen ovan står kvar som den godkändes. Detta hände i verkligheten:

1. **AI-anropet flyttades till Edge-funktionen.** Specen la
   `generateTrainingMaterial` i `lib/ai/anthropic.ts`. Det hade krävt TVÅ
   implementationer — en i Deno för pipelinen, en i Next.js för backfill — med
   två prompts som kan glida isär. Ligger nu bara i Edge-funktionen, med ett
   `training_material_only`-läge som Next.js anropar via `functions.invoke`.
2. **Backfill capad och parallelliserad.** Sekventiella anrop hade timeoutat.
   `MAX_BACKFILL_PER_REQUEST = 5`, `Promise.allSettled`, fel loggas. Taket
   skyddar dock INTE mot timeout — se punkt 4.
3. **Svarsalternativen slumpas i två lager.** Claude lade aldrig facit först
   eller sist (mätt 8/8). Fisher-Yates vid generering + seedad blandning per
   `session:fråga` vid visning, så återkommande frågor inte kan memoreras på
   position.
4. **`maxDuration` höjd 60 → 300.** Mätt: ~70 s för EN lektion, inte de 10–30 s
   som antogs. Plåster; rätt lösning är att inte vänta in genereringen i
   requesten (egen uppgift).
5. **`MIN_TRANSCRIPT_CHARS = 1000`** i både `generateTrainingMaterial` och
   `generateLessonContent` — en 91 teckens mikrofontest gav annars ett påhittat
   koncept om Orwells *1984*, i strid med hela strikt-RAG-principen.
6. **Progressindikator tillkom** (fanns inte i specen): pollad räkning av
   färdiga `training_materials` + roterande texter under genereringen.
7. **Namnbyte:** `/ova` heter **Plugga**, `/provplugg` heter **Testa dina
   kunskaper**. Rutterna är oförändrade.

## Testning

- `sm2()` — ren funktion, unit-testbar utan Supabase (grade-sekvenser →
  förväntade ease/interval-progressioner, edge case: 'again' nollställer
  repetitions).
- `generateTrainingMaterial` — samma manuella verifieringsmönster som
  `generateLessonContent` användes med (körning mot en riktig/syntetisk
  lektion, granska JSON-validering och gracefulla fallback vid fel).
- Session-byggning: verifiera att `due_at`-filtrering + "träna ändå"-fallback
  och lat backfill fungerar mot en lektion utan `training_materials`-rad.
- Manuell browser-verifiering av båda sessionsflödena (flip/grade,
  answer/reveal) mot dev-servern, inkl. tom-state (inga kort due, inga
  lektioner med färdigt material).
