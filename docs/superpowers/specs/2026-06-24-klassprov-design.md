# Klassprov — lärar-författade prov tilldelade en klass

**Datum:** 2026-06-24
**Status:** Godkänd design, redo för implementationsplan

---

## Bakgrund & syfte

Lärare ska kunna skapa prov utifrån sina egna lektioner och tilldela dem en
klass. Provet ska utgå från **vad som sagts** (lektionernas transkript) och, i
ett senare steg, **vad läraren laddat upp** (material). Läraren styr provets
sammansättning med reglage: totalt antal frågor samt andel *stängda*, *öppna*
och *resonerande* frågor.

Systemet förrättar inlämningarna automatiskt, men **läraren äger den slutliga
feedbacken**: inget resultat når eleven förrän läraren granskat, eventuellt
justerat poäng/kommentarer, och aktivt släppt provet.

### Avgränsning mot befintliga prov-koncept

Namnet "prov" är redan upptaget i kodbasen. Den nya featuren heter **Klassprov**
för att hållas isär från:

- **Provplugg / Övningsprov** (`practice_tests`) — elev-genererat, elev-ägt,
  AI-rättat, kan delas med läraren.
- **`/teacher/prov` "Delade prov"** — lärarvy av elevers *delade* övningsprov.

Klassprov är en ny, fristående datamodell. `practice_tests` rörs inte.

---

## Beslut (från brainstorming)

1. **Släppflöde:** AI förrättar direkt vid inlämning, men resultatet är dolt för
   eleven tills läraren granskat och **släppt** provet.
2. **Reglage-mappning:** tre reglage — *Stängda* → `multiple_choice`,
   *Öppna* → `short_answer` + `open`, *Resonerande* → `reasoning`.
3. **Källmaterial:** V1 genererar från lektionernas transkript. Textextraktion ur
   uppladdat material är ett tydligt avgränsat nästa steg (ej i V1).
4. **Frågegranskning:** AI genererar ett **utkast** → läraren redigerar
   text/facit/poäng, tar bort eller regenererar enskilda frågor → **publicerar**
   först då till klassen.

Övrigt: inga deadlines i V1 (manuellt `closed`-läge räcker). YAGNI.

---

## Vald arkitektur

**Nya tabeller `class_tests` + `class_test_submissions`.** Provdefinitionen ägs
av läraren (en rad); varje elevs inlämning är en egen rad. Återanvänder de
befintliga `PracticeQuestion`/`PracticeAnswer`-typerna och AI-funktionerna.
Elevläsning går genom security-definer-RPC:er som både gömmer facit och håller
resultatet dolt tills läraren släpper.

Förkastade alternativ:
- **Bygga ut `practice_tests`** — blandar två olika ägarmodeller (elev-ägd vs
  lärar-ägd) → rörig RLS och status-logik.
- **Allt i en tabell, inlämningar som JSON-array** — spräcker per-elev-RLS och
  samtidiga skrivningar.

---

## Datamodell

```
class_tests                         (lärar-ägd provdefinition)
  id            uuid pk
  school_id     uuid -> schools
  class_id      uuid -> classes
  created_by    uuid -> profiles    (läraren)
  title         text
  lesson_ids    uuid[]              -- vilka lektioner provet bygger på
  composition   jsonb               -- {closed, open, reasoning} (önskade antal)
  questions     jsonb               -- PracticeQuestion[] (inkl. facit)
  max_score     int
  status        text                -- 'draft' | 'published' | 'closed'
  created_at    timestamptz
  published_at  timestamptz

class_test_submissions              (en rad per elev)
  id            uuid pk
  class_test_id uuid -> class_tests on delete cascade
  school_id     uuid -> schools
  student_id    uuid -> profiles
  answers       jsonb               -- elevsvar + ai_points/ai_feedback + lärar-justerad feedback
  score         int
  max_score     int
  overall_feedback text             -- lärar-ägd (AI föreslår)
  status        text                -- 'graded' | 'released'
  submitted_at  timestamptz
  graded_at     timestamptz
  released_at   timestamptz
  unique (class_test_id, student_id)
```

- Inlämningsrader skapas **lazily vid inlämning** (en student = som mest en rad
  per prov, enforce:at av unique-constraint).
- "Inte börjat" beräknas från `class_members` minus befintliga inlämningar.
- `answers` återbrukar `PracticeAnswer` men utökas med `ai_points` och
  `ai_feedback` så att AI:ns ursprungsbedömning bevaras när läraren skriver om.

### Typer (`lib/supabase/database.ts`)

- Återanvänd `PracticeQuestion`, `PracticeQuestionType` oförändrade.
- Ny `ClassTestAnswer = PracticeAnswer & { ai_points: number; ai_feedback: string }`.
- Nya `ClassTest`, `ClassTestSubmission` row-typer + insert-typer.
- `TestComposition = { closed: number; open: number; reasoning: number }`.

---

## Livscykel & flöden

### Lärare skapar provet
1. `/teacher/klassprov/nytt` → väljer **klass** → väljer **lektioner** i klassen
   (med `transcript_status='ready'` och icke-tomt transkript) → ställer
   **reglagen**: totalt antal frågor + andelar *stängda / öppna / resonerande*
   (summerar till 100 %, räknas om till heltal per typ).
2. AI genererar **utkast** (`status='draft'`) → redirect till editorn.
3. **Editor** `/teacher/klassprov/[id]` (draft): läraren ser varje fråga,
   redigerar text/facit/poäng, tar bort eller **regenererar enskild fråga**.
4. **Publicera** → `status='published'`; eleverna i klassen ser provet.

### Elev gör provet
5. `/student/klassprov` listar tilldelade prov (*att göra / inlämnat / resultat klart*).
6. `/student/klassprov/[id]` → fyller i (återanvänder `TestRunner`) → **lämnar in**.
7. Vid inlämning skapas submission-raden, **AI förrättar direkt** (flerval i kod,
   övriga via Claude) → `status='graded'`. Eleven ser *"inlämnat — väntar på
   lärarens granskning"*.

### Lärare granskar & släpper
8. `/teacher/klassprov/[id]` visar alla inlämningar + *"X väntar på granskning"*.
9. `/teacher/klassprov/[id]/[submissionId]`: elevsvar + AI:ns förslag på
   poäng/feedback per fråga; läraren **justerar poäng**, **skriver om feedbacken**,
   sätter **helhetskommentar**.
10. **Släpp till elev** → `status='released'`; eleven ser resultatet med lärarens
    feedback.

`closed` är ett valfritt manuellt läge (stäng för fler inlämningar).

---

## RLS & säkerhet

RLS är radnivå, inte kolumnnivå, och facit ligger i `questions`-JSON. All
elevläsning går därför genom **security-definer-RPC:er** (samma mönster som
`match_lesson_chunks`):

- **`class_tests`** — direkt åtkomst bara för lärare/admin i samma skola (full
  CRUD på egna rader via `created_by`/`school_id`). Elever har **ingen** direkt
  SELECT.
- **`get_published_class_test(test_id)`** (RPC, security definer): returnerar
  provet till en elev i klassen *bara* om `status='published'`, och **strippar
  `answer_key` + `correct_index`** ur frågorna.
- **`class_test_submissions`** — eleven får INSERT/SELECT/UPDATE på sin **egen**
  rad (`student_id = auth.uid()`); lärare/admin i samma skola ser alla rader för
  sina prov.
- **`get_my_submission_result(submission_id)`** (RPC): returnerar poäng + feedback
  till eleven *bara* när `status='released'`. Före släpp läcker varken AI-poäng
  eller feedback.
- Inlämning och rättning sker i en **Server Action** server-side — eleven sätter
  aldrig sina egna poäng via rå tabellskrivning.

---

## AI (`lib/ai/anthropic.ts`)

- **`generateClassTest(lessons, composition)`** — tunn variant av
  `generatePracticeTest` som tar *antal per typ*
  (`{ multiple_choice, open, reasoning }`, där `open` täcker `short_answer`/`open`)
  och håller fördelningen.
- **`regenerateClassTestQuestion(lessons, type)`** — en ersättningsfråga av samma
  typ.
- **Rättning** återanvänder `gradePracticeTest` oförändrad. Lärarens justeringar
  skriver över AI:ns förslag; AI:ns ursprung sparas i `ai_points`/`ai_feedback`.
- Tyst fallback om AI-nycklar saknas (som idag): tydligt meddelande, ingen krasch.

---

## Server Actions (`app/actions/class-test.ts`)

Alla med Zod-validering.

- `createClassTestDraft(classId, lessonIds, composition)` → generera → insert
  draft → redirect till editorn.
- `updateClassTestQuestions(testId, questions)` → spara lärarens redigeringar.
- `regenerateClassTestQuestion(testId, questionId)` → ersätt en fråga.
- `publishClassTest(testId)` → `status='published'`, sätt `published_at`.
- `closeClassTest(testId)` → `status='closed'`.
- `submitClassTest(testId, answers)` → skapa submission, AI-rätta, `status='graded'`.
- `updateSubmissionGrade(submissionId, answers, overallFeedback)` → lärarens
  justeringar.
- `releaseSubmission(submissionId)` → `status='released'`, sätt `released_at`.

---

## UI, nav & i18n

- **Nav** (`lib/app/nav.ts` + `sv.ts`/`en.ts`): ny post **"Klassprov"** för lärare
  och elev.
- **Nya vyer:**
  - Lärare: `/teacher/klassprov` (lista), `/teacher/klassprov/nytt` (skapa),
    `/teacher/klassprov/[id]` (editor + inlämnings-översikt),
    `/teacher/klassprov/[id]/[submissionId]` (granska & släpp).
  - Elev: `/student/klassprov` (lista), `/student/klassprov/[id]`
    (provtagning / släppt resultat).
- **Återbrukar:** `TestRunner`, fråge-rendering, `Card`/`Badge`/`Button`/`Field`.
- **Nya komponenter:** kompositions-reglage (3 sliders + antalsfält),
  frågeeditor, granskningsvy med poäng/feedback-fält.
- Alla strängar i `sv` + `en`. Noindex på `/app/*` (befintligt).

---

## QA-krav (utöver projektets standard)

- [ ] Facit (`answer_key`, `correct_index`) når aldrig eleven (verifieras mot RPC-svar).
- [ ] Resultat dolt för eleven tills `status='released'` (verifieras mot RPC + direkt API).
- [ ] Eleven kan inte sätta egna poäng (rättning server-side).
- [ ] Reglagen summerar till totalantalet; heltalsavrundning hanterad.
- [ ] WCAG AA på reglage, editor och granskningsvy.
- [ ] Inga hårdkodade strängar; sv + en kompletta.
- [ ] Zod på alla nya Server Actions.
- [ ] Responsivt 375 → 1440px.

---

## Inte i V1 (uppföljning)

- Textextraktion ur uppladdat material (PDF/text → prompt).
- Deadlines / tidsfönster för inlämning.
- Återanvändning av klassprov mellan klasser/terminer.
