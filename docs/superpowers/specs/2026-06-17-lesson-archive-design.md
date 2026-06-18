# Spec: Radera (arkivera) en hel lektion

**Datum:** 2026-06-17
**Status:** Godkänd design, redo för implementationsplan

## Mål

Låta en lärare radera en hel lektion från lärarvyn. Radering är **mjuk (arkiv)**: inget tas bort permanent, och åtgärden går att ångra direkt efteråt. Detta skiljer sig från den befintliga `clearTranscript` (som bara tömmer transkriptet men behåller lektionen).

## Problem / kontext

Idag kan en lärare bara tömma transkriptet (`clearTranscript` på branch `feature/teacher-transcript-edit`). Det finns inget sätt att ta bort en hel lektion — t.ex. en felaktig testinspelning. En hård radering är riskabel för klassrumsdata, så vi gör en återställbar arkivering.

### FK-konsekvenser vid en eventuell hård radering (bakgrund — görs INTE)
`lesson_chunks`, `lesson_views`, `materials` → CASCADE; `chats.lesson_id` → SET NULL; material-filer i Storage raderas inte automatiskt. Arkivering undviker hela denna problematik genom att inget tas bort.

## Designbeslut

- **Mjuk radering** via `lessons.archived_at timestamptz` (null = aktiv).
- **Återställning** sker via en "Ångra"-toast direkt efter radering. Ingen separat papperskorg-vy.
- **Inget raderas** — material-filer och chunks behålls så återställning blir omedelbar.

## Datamodell

Ny migration: lägg till kolumn
```sql
alter table public.lessons
  add column archived_at timestamptz;
```
Inget index nödvändigt initialt (lektionsvolymen är låg per skola); kan läggas till senare om listfilter blir tunga.

## Server actions

Ny fil `apps/web/app/actions/lesson.ts`:

- `archiveLesson(lessonId: string)` — sätter `archived_at = now()`.
- `restoreLesson(lessonId: string)` — sätter `archived_at = null`.

Båda:
- Zod-validerar `lessonId` (uuid).
- Återanvänder behörighetsmönstret från `clearTranscript`: hämta inloggad profil, kräv `role in (teacher, admin)`, samma `school_id` som lektionen, och för `teacher` även `lesson.teacher_id === profile.id`. Returnera tydligt fel annars.
- `revalidatePath` på berörda lärarvyer.

## Dölj arkiverade lektioner (`archived_at is null`)

Lägg filter i alla queries som listar/hämtar lektioner:

- **Lärare** (`lib/data/teacher.ts`): översiktens senaste lektioner (rad ~42), klassdetaljens lektioner (rad ~164). Lektionsdetaljen (`getLessonDetail`) returnerar null för arkiverade så sidan 404:ar.
- **Elev** (`lib/data/student.ts`): bibliotek, lektionsdetalj, kurschattar, provplugg-urval (rad ~62, ~114, ~176, ~324, ~384). Eleven ska inte se eller kunna chatta mot arkiverade lektioner.
- **Admin** (`lib/data/admin.ts`): statistik räknar inte arkiverade lektioner (rad ~31, ~33, ~161).

## RAG-uteslutning (AI:n)

Ny migration som återskapar båda match-funktionerna med arkiv-filter (chunks behålls, matchas bara inte medan arkiverad):

- `match_course_chunks` joinar redan `lessons l` → lägg `and l.archived_at is null`.
- `match_lesson_chunks` filtrerar på `lesson_id` direkt → lägg en `exists`/join mot `lessons` med `archived_at is null`.

Konsekvens: AI:n slutar svara på arkiverade lektioner, och svarar igen direkt vid återställning.

## UI/UX

På `/teacher/lektioner/[id]`:

- En diskret "Radera lektion"-knapp (nedtonad/röd) längst ner på sidan.
- Klick → `archiveLesson` → redirect till lektionslistan → en toast: **"Lektionen raderad — Ångra"**.
- "Ångra" anropar `restoreLesson` och tar tillbaka lektionen.
- Knapptext: "Radera lektion" (matchar lärarens mentala modell; mekaniken är mjuk under huven, likt Gmail).
- Inga hårdkodade strängar — nya `t()`-nycklar i `sv` och `en`.

## Behörighet

- Lärare: bara sina egna lektioner (`teacher_id`).
- Admin: alla lektioner i sin skola.
- Övriga roller: nekas i server-actionen.

RLS på `lessons` gäller fortsatt; server-actionen gör en extra explicit kontroll (som `clearTranscript`).

## Utanför scope (medvetet)

- Permanent (hård) radering.
- Papperskorg-/arkivvy.
- Städning av material-filer i Storage.
- Auto-purge av gamla arkiverade lektioner.

Dessa kan läggas till i en senare iteration.

## Testbarhet

- Server actions: behörighet (lärare egen vs annan lärares lektion, admin, fel roll), arkivera + återställ ändrar `archived_at`.
- Datalager: arkiverad lektion syns inte i lärar-/elev-/admin-queries.
- RAG: arkiverad lektion ger inga chunk-träffar; återställd ger träffar igen.
