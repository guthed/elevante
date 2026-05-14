# Lärarvyn: insikt-vy med koncept-heatmap och elevprofil

**Status:** Design godkänd (heatmap-stil B, profilkort-stil B), redo för implementation
**Datum:** 2026-05-15
**Berör:** `apps/web/components/app/teacher/`, `apps/web/lib/data/teacher.ts`, `apps/web/lib/ai/anthropic.ts`, `supabase/functions/transcribe-lesson/index.ts`, ny migration

---

## Problem

Lärare har idag två "placeholders" i UI:t men ingen funktionalitet bakom dem:
- Dashboard: "Senaste frågor från elever — När elever frågar Elevante om dina lektioner..."
- Lektionsdetalj: "Frågor från elever — När elever frågar..."

Ingen lärare har idag verktyg som visar:
1. **Vad eleverna fattar och inte fattar** — vilka koncept i en lektion fastnar klassen på?
2. **Vilka enskilda elever är aktiva eller tappade** — vem behöver extra stöd?
3. **Vilka konkreta frågor ställs** — direkt fönster in i elevernas tänkande

Det är den största pedagogiska vinsten Elevante kan ge utöver elevens egen chat — och pitch-mässigt det starkaste argumentet mot rektorer och investerare ("ni får ett verktyg ni aldrig haft").

---

## Vad vi bygger

Sex sammanlänkade pussel-bitar:

### 1. **Material-upload (befintligt, oförändrat i V1)**
`MaterialUploadForm` funkar redan — single-file upload, validering, sanering. Multi-file + drag-drop är V2 och ingår **inte** i denna plan.

### 2. **Lektionslista med status-filter**
Existerande `/teacher/lektioner` får filter-chips: *Alla / Klara / Bearbetas / Misslyckades*. Trivialt — query-param + befintlig data.

### 3. **Koncept-heatmap per lektion (HUVUDET)**
Ersätter "Frågor från elever"-placeholder i `TeacherLessonDetail`.

**Layout:** Rader = elever (namngivna), kolumner = koncept extraherade från lektionen. Celler färgkodade:
- Coral (#C97B5E): 3+ frågor — fastnat
- Sand (#D4A85B): 1-2 frågor — osäker
- Sage (#A8C09A): öppnat lektionen utan att fråga — klart
- Cream (#F3EDE0): inget engagemang
- Border-only (#E8E1D4): ej öppnat lektionen

Förklaringsruta (legend) under heatmapen.

Insight-textbox längst ner: AI-genererat **"Klassen är osäker på X. Y och Z har inte öppnat lektionen."**

### 4. **Elev-profilkort (drilldown)**
Klick på elevens namn (radens vänsterkant i heatmapen) → sidopanel slidar in från höger:

```
Elin Bergström
NA1A · Biologi 1                  ✕

12 FRÅGOR    5 LEKTIONER    8h SENAST AKTIV

KONCEPT-FÖRSTÅELSE
Näringspyramid       ▓▓▓▓▓▓▓░  3 fr  (coral bar)
Biotiska faktorer    ▓▓▓▓▓░░░  2 fr  (sand bar)
Energiflöde          ▓▓░░░░░░  1 fr  (sage bar)
Övergödning          ░░░░░░░░  —     (empty)

SENASTE FRÅGOR
"Förklara skillnaden mellan biotiska..."
"Men hur räknar man trofinivåerna då?"
"Varför just 5 nivåer på land?"

[Insight: Elin är engagerad men osäker på näringspyramid.]
```

### 5. **Koncept-drilldown**
Klick på en kolumn-rubrik (koncept-namn) → enklare modal/sidopanel som listar alla frågor från klassen om det konceptet, med elevernas namn. Sorterade kronologiskt.

### 6. **Dashboard-mini-heatmap**
Lärarens dashboard (`/teacher`) får under "Senaste frågor från elever"-rubriken en kompakt rad-baserad sammanfattning av de 3 senaste lektionernas mest-frågade koncept med antal frågor. Klick → till respektive lektionsdetalj.

---

## Designbeslut

### A. Privacy: Namngivna elever
Demo-pitch använder namngivna elever (Elin, Oskar, Maja...). För **pilot mot riktig skola** krävs:
- Föräldra-samtycke per elev (separat Notion-uppgift — finns redan: "Föräldrasamtycke-flöde för minderåriga")
- Eventuellt opt-in flag på `public.profiles` att lärare får se elevens namn
- Pseudonym-fallback om inte samtyckt

För nu: ingen extra fakta i schema, alla profiler antas vara consent:ade. Flagga i CLAUDE.md att V2 behöver consent-flow innan riktig pilot.

### B. Koncept-extraktion: AI vid lesson-processing
När `transcribe-lesson` Edge Function kör (idag genererar topic/summary/2 frågor), utöka prompten att också returnera **5-8 koncept** (deskriptiva fraser, 1-4 ord vardera, från lärarens egna ord).

Spara i ny kolumn `lessons.concepts` (jsonb array).

Exempel för Ekologi-lektionen:
```json
["Näringspyramid", "Biotiska faktorer", "Abiotiska faktorer", "Energiflöde", "Övergödning", "Sjöekosystem"]
```

### C. Koncept-taggning av frågor: AI vid RAG-svar
När `answerWithRag` körs idag (`lib/ai/anthropic.ts`), be Claude också returnera **1-3 koncept** som frågan tangerar (från lektionens befintliga koncept-lista).

Spara i ny kolumn `chat_messages.concepts` (jsonb array).

System-prompten ges lektionens koncept-lista och instrueras att mappa varje fråga till 1-3 av dem. Om frågan inte passar något: tom array.

### D. Koncept är per lektion, inte global
Varje lektion har sin egen koncept-lista. Vi normaliserar inte över lektioner ännu — det är V2 ("Begrepps-tracker över hela kursen"). För V1 räcker att vi vet att eleven Elin har frågat om "Näringspyramid" i lektion X.

### E. Engagement-data: härleds från befintliga tabeller
Vi behöver inte ny "engagement"-tabell. Räkna ut från:
- **Öppnat lektion:** kommer från... vi behöver lägga till en lättviktstabell `lesson_views` eller en kolumn på `chats`. Beslut: skapa `lesson_views (lesson_id, profile_id, viewed_at)` med composite PK. Triggas av att `getStudentLessonDetail` anropas.
- **Frågat:** `chats` + `chat_messages` finns redan (filter på `scope = 'lesson'`).

### F. Demo-data
För att heatmapen ska vara intressant behövs ~8 elever × 20-30 frågor. Skapas via SQL-script i samma stil som `backfill-lesson-content.mjs`:
- 8 demo-elever med svenska namn (Elin, Oskar, Maja, Lukas, Sara, Mira, Theo, Alma)
- Alla i klassen NA1A
- Varje elev får 0-5 frågor om Ekologi-lektionen (några mer, några mindre, en helt tyst för "tappad"-effekten)
- Frågor pre-genererade så vi vet att de täcker varje koncept minst en gång
- AI-tagging av varje fråga körs som en del av seed-scriptet

---

## Datamodell

Ny migration: `20260515XXXXXX_teacher_insight.sql`

```sql
-- Koncept per lektion (5-8 strängar, AI-extraherade)
alter table public.lessons
  add column if not exists concepts jsonb not null default '[]'::jsonb;

-- Koncept per chat-meddelande (1-3 strängar, AI-taggat vid RAG-svar)
alter table public.chat_messages
  add column if not exists concepts jsonb not null default '[]'::jsonb;

-- Engagemang-spårning: när en elev öppnar en lektion
create table public.lesson_views (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count int not null default 1,
  primary key (lesson_id, profile_id)
);
create index lesson_views_lesson_idx on public.lesson_views(lesson_id);

alter table public.lesson_views enable row level security;

-- Studenten ser sina egna views
create policy lesson_views_self_select on public.lesson_views
  for select using (profile_id = (select auth.uid()));

-- Lärare/admin ser views på lektioner i sin egen skola
create policy lesson_views_school_select on public.lesson_views
  for select using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_views.lesson_id
        and l.school_id = public.current_school_id()
    )
    and public.current_user_role() in ('teacher', 'admin')
  );

-- Eleven kan upserta sin egen view
create policy lesson_views_self_upsert on public.lesson_views
  for insert with check (profile_id = (select auth.uid()));

create policy lesson_views_self_update on public.lesson_views
  for update using (profile_id = (select auth.uid()));
```

---

## Pipeline-uppdateringar

### `transcribe-lesson` Edge Function (steg 6.5)
System-prompten utökas. Returnerar nu fyra fält istället för tre:

```json
{
  "topic": "<kort ämne>",
  "summary": "<3-5 meningar>",
  "questions": ["<fråga 1>", "<fråga 2>"],
  "concepts": ["<koncept 1>", "<koncept 2>", "...", "<koncept 5-8>"]
}
```

Validering: `concepts` ska vara en array av 4-10 strängar, var och en max ~40 tecken. Vid felaktig output: graceful fallback till tom array (insikt-vyn blir då tom).

Lessons-update efter pipeline inkluderar `concepts`.

### `answerWithRag` i `lib/ai/anthropic.ts`
Tar ny argument `lessonConcepts: string[]`. System-prompten utökas:

> Här är de koncept som behandlas i lektionen: [concept1, concept2, ...]. Förutom att svara på frågan, returnera vilka 1-3 av dessa koncept som frågan tangerar mest.

Returnerar `{ content, sources, concepts }`.

`app/actions/chat.ts` hämtar lektionens `concepts` när det skapar/uppdaterar chat, skickar med till RAG-anropet, sparar `concepts` på det inserted `chat_messages`-row.

### `getStudentLessonDetail` i `lib/data/student.ts`
Triggar upsert till `lesson_views` när student öppnar en lektion. Använd Postgres `INSERT ... ON CONFLICT (lesson_id, profile_id) DO UPDATE SET last_viewed_at = now(), view_count = lesson_views.view_count + 1`. Inte critical path — fortsätt rendera även om upsert fallerar (try/catch + log).

---

## Komponentstruktur

### Nya komponenter
- `apps/web/components/app/teacher/InsightHeatmap.tsx` — heatmap med rader = elever, kolumner = koncept
- `apps/web/components/app/teacher/StudentProfileCard.tsx` — sidopanel-innehåll, profilkort med koncept-bars och senaste frågor
- `apps/web/components/app/teacher/ConceptQuestionList.tsx` — modal-innehåll, alla frågor om ett koncept
- `apps/web/components/app/teacher/InsightDrawer.tsx` — client component med `useState`-styrt visible flag, Tailwind `translate-x-full → translate-x-0` transition (150ms). Backdrop med click-to-close. Pick: inte native `<dialog>` p.g.a. trickig animation, ja vi accepterar minimal custom state.
- `apps/web/components/app/teacher/MiniHeatmap.tsx` — dashboard-version, kompakt rad-vy
- `apps/web/components/app/teacher/LessonStatusFilter.tsx` — chips för lektion-status-filter

### Modifierade komponenter
- `apps/web/components/app/teacher/TeacherDashboard.tsx` — placeholder ersätts med `<MiniHeatmap />`
- `apps/web/components/app/teacher/TeacherLessonDetail.tsx` — placeholder ersätts med `<InsightHeatmap />` + tillhörande drawer
- `apps/web/app/[locale]/app/[role]/lektioner/page.tsx` — lektionslistan får filter-chips

### Ny data-layer-funktion
- `getLessonInsight(lessonId)` i `lib/data/teacher.ts` — returnerar:
  ```ts
  {
    concepts: string[];                              // från lessons.concepts
    students: Array<{
      id: string;
      fullName: string;
      hasViewed: boolean;
      viewCount: number;
      lastViewedAt: string | null;
      conceptQuestionCounts: Record<string, number>; // {concept: count}
      totalQuestions: number;
      questions: Array<{ id: string; content: string; concepts: string[]; createdAt: string }>;
    }>;
    aiInsight: string | null;                        // pre-genererat eller on-the-fly
  }
  ```

---

## AI-insight-textbox

För både heatmap och student-profilkort finns en bottensekt med en AI-formulerad insikt. Generering:

**Heatmap-insight** (per lektion): på serversidan vid `getLessonInsight`-anrop, anropa Claude med klassens engagemang-data och be om en mening:
> *"Klassen är osäker på [topp-1 coral koncept]. [Tappade elevers förnamn] har inte öppnat lektionen — överväg att kolla med dem."*

V1: ingen cache, regenereras vid varje page-load. Anropet är litet (~200 input tokens, ~50 output tokens) → ~100ms latency, acceptabelt. Cache läggs på i V2 om det blir kostnadsproblem.

**Student-profilkort-insight:** genereras on-the-fly när drilldown öppnas (samma princip).

---

## Demo-data seed

Nytt script: `scripts/seed-teacher-demo-data.mjs`. Körs en gång.

Logik:
1. Skapa 8 elev-profiler i `auth.users` + `public.profiles` (samma SQL-bcrypt-pattern som `john@guthed.se`-seed):
   - elin@demo.elevante.se (befintlig) + 7 nya
   - Namn: Oskar Lindberg, Maja Karlsson, Lukas Persson, Sara Svensson, Mira Holm, Theo Eriksson, Alma Nyström
2. Alla i klassen NA1A (`class_members`)
3. Pre-definierade frågor (~28 st) med kända koncept-taggar — t.ex. några om näringspyramid, några om abiotiska faktorer
4. För varje fråga: gör ett vanligt RAG-anrop (via `startChat`-action eller direkt mot Anthropic) som genererar ett svar + sparar i `chat_messages` med korrekt `concepts`-tagging
5. För några elever: skapa endast `lesson_views`-entry, inga frågor (visar "öppnat men inte frågat" — sage-färgade celler)
6. För Sara: inget alls (tappad-elev-effekten)
7. Lossa data jämnt över tid (inte alla på samma minut)

Lösenord för demo: alla får `ElevanteDemo2026!` (samma som Elin).

---

## Out of scope (V2)

- Tabs för olika tidsperioder ("denna vecka", "denna månad")
- Cross-lesson begrepps-tracker (samma koncept i flera lektioner)
- Engagemangs-trend över tid (GitHub-stil heatmap från drilldown-stil C)
- Export av elevprofil till PDF (för utvecklingssamtal)
- Föräldra-rapport
- Notifieringar till lärare ("Sara har inte öppnat på 3 dagar")
- AI-thumbs på koncepten ("AI tror koncept är 'näringspyramid', stämmer det?")
- Manuell justering av koncept-listan
- Lärar-egen reflektion-journal (separat feature)

---

## Acceptanskriterier

1. ✅ Nya kolumner `lessons.concepts`, `chat_messages.concepts` och tabell `lesson_views` existerar i DB med rätt RLS
2. ✅ `transcribe-lesson` Edge Function returnerar och sparar koncept för Ekologi-lektionen
3. ✅ Backfill-script kör en gång på existerande lektion (eller via nytt seed-script)
4. ✅ Demo-data seedat: 8 elever, ~28 chat-meddelanden, ~5-6 koncept på Ekologi-lektionen
5. ✅ Lärar-lektionsdetalj visar heatmap med 8 elev-rader × ~5-6 koncept-kolumner
6. ✅ Klick på elev-namn öppnar sidopanel med profilkort (stats, koncept-bars, frågor)
7. ✅ Klick på koncept-rubrik öppnar lista med alla frågor om det konceptet
8. ✅ Lärar-dashboard visar mini-heatmap som länkar till lektionsdetaljer
9. ✅ Lektionslistan har status-filter-chips
10. ✅ Materialupload-formen funkar fortfarande som idag (regression-check)
11. ✅ Elev-vy (Elin) ser oförändrat resultat (inga student-side changes)
12. ✅ Logga in som Anna på preview-URL → demo-flöde funkar end-to-end

---

## Testflöde

1. Backfill: kör seed-scriptet → verifiera 8 nya användare + ~28 chats i DB
2. Som Anna: logga in → `/sv/app/teacher` → se mini-heatmap med Ekologi-lektion i topp
3. Klicka på Ekologi-lektionen → lektionsdetalj öppnas → heatmap synlig
4. Klicka på Elin → sidopanel slidar in → profilkort med koncept-bars
5. Stäng panelen → klicka på "Näringspyramid"-rubriken → modal med alla frågor om det konceptet
6. Som Elin: logga in → bekräfta att hennes vy är oförändrad
