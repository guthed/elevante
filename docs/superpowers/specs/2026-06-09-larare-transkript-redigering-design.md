# Lärare: sök, redigera och radera transkript — Design

> Datum: 2026-06-09
> Status: Godkänd (brainstorming) — redo för implementationsplan
> Branch: `feature/teacher-transcript-edit`

## Mål

Ge läraren ett tydligt sätt att **söka i**, **redigera** och **radera** den
transkriberade texten på en lektion — direkt i den befintliga
lektionsdetaljvyn, utan ny route.

## Bakgrund och central begränsning

Transkriptet (`lessons.transcript_text`) är **källan för RAG**:
`transcribe-lesson`-edge-funktionen chunkar texten, embeddar varje chunk till
`lesson_chunks`, och genererar `summary` / `suggested_questions` / `concepts` /
`ai_generated_topic` som eleverna ser. Om läraren ändrar transkriptet blir alla
dessa härledda data inaktuella om de inte regenereras.

Viktiga fakta som styr designen:

- Edge-funktionen accepterar redan `{ lesson_id, transcript_text }` och hoppar
  då över ljud/Whisper. Re-indexering fungerar alltså **även efter att råljudet
  raderats** (GDPR) — vi skickar bara in den nya texten.
- Edge-funktionen **insertar `lesson_chunks` utan att radera gamla** → en naiv
  re-körning duplicerar chunks. Re-indexvägen måste radera gamla chunks först;
  vi gör dessutom edge-funktionen idempotent defensivt.
- Befintligt mönster: Server Actions gör `auth → verifiera ägarskap → mutera →
  revalidatePath` (se `app/actions/materials.ts`). Service-role-klient finns i
  `lib/supabase/service-role.ts`.

## Beslut (från brainstorming)

| Fråga | Val |
|-------|-----|
| Redigering & RAG | **Auto-omindexera** vid sparande |
| Radera | **Båda**: inline-redigering + knapp som tömmer hela transkriptet |
| Sök | **Inom lektionen** (ingen global söksida) |
| Re-indexeringskörning | **Synkront** — save-action inväntar edge-funktionen, sedan revalidate |

## Arkitektur

### 1. UI — `components/app/teacher/TranscriptEditor.tsx` (ny klientkomponent)

Ersätter det skrivskyddade `<pre>`-blocket i `TeacherLessonDetail.tsx`. Renderas
endast för teacher/admin (komponenten är redan lärarspecifik) när
`status==='ready'` och text finns. Tomt/processing-läge behåller befintlig
placeholder.

**Läsläge (default):** transkriptet renderas som idag, med en verktygsrad ovanför:

- **Sökfält** — input med live-träffräknare `n/m` + ↑/↓ för att hoppa mellan
  träffar. Träffar markeras med `<mark>` (coral), aktiv träff scrollas in i vyn.
  Opererar på läslägestexten.
- **Redigera**-knapp.
- **Töm transkript**-knapp som öppnar en bekräftelse-`Modal`.

**Redigeringsläge:** `<pre>` byts mot en mono `<textarea>` (samma JetBrains
Mono-styling) med **Spara** + **Avbryt**. Inline-radering = markera/redigera text
i textarean. Vid sparande visas spinner ("Sparar och uppdaterar AI…") medan
re-indexering körs.

WCAG AA: knappar och fält har labels/aria, fokusordning bevaras,
`prefers-reduced-motion` respekteras för scroll-till-träff.

### 2. Server Actions — `app/actions/transcript.ts` (ny)

Följer `materials.ts`-mönstret. Båda gatar **alltid** bakom explicit
ägarskapskontroll innan service-role-klienten används.

**`updateTranscript(lessonId, text)`**
1. `getCurrentProfile()`; kräver `teacher` (äger lektionen) eller `admin`
   (samma skola). Verifiera att lektionen tillhör `profile.school_id`.
2. Zod-validera `text` (icke-tom efter trim, max ~200 000 tecken).
3. Service-role: `update lessons set transcript_text=text,
   transcript_status='processing'`.
4. `delete from lesson_chunks where lesson_id=…` (rensa inaktuella embeddings).
5. `await functions.invoke('transcribe-lesson', { body: { lesson_id,
   transcript_text: text } })` → re-chunk, re-embed, regenererar
   summary/suggested_questions/concepts/topic, sätter `status='ready'`.
6. `revalidatePath` för båda locales (lärar- + elevlektionsvyer).
7. Returnerar typad `{ status: 'success' | 'error', code }`.

**`clearTranscript(lessonId)`** ("Töm transkript")
- Samma auth/ägarskapskontroll.
- `delete from lesson_chunks where lesson_id=…`.
- `update lessons set transcript_text=null, summary=null,
  suggested_questions=null, concepts=null, ai_generated_topic=null,
  transcript_status='pending'`.
- Revalidate. Destruktivt och icke-återställbart (ljudet är borta) → bekräftas
  via Modal i UI:t.

Felhantering: typade returkoder (`unauthorized`, `invalid`, `reindex-failed`,
`generic`) → toast i klienten. Om edge-invoke misslyckar i `updateTranscript`
lämnas `transcript_status='failed'` så vyn visar fel-läget.

### 3. Edge-funktion — `supabase/functions/transcribe-lesson/index.ts`

Lägg till en defensiv rad före chunk-insert (steg 6): `delete from
lesson_chunks where lesson_id=…`. Gör varje re-körning idempotent oavsett
anropare. Ingen annan ändring.

### 4. Data-lager — `lib/data/teacher.ts`

`getLessonDetail` returnerar redan `transcriptText`. Ingen ändring. Editorn får
texten som prop.

### 5. i18n — `lib/i18n/locales/{sv,en}.ts` + `types.ts`

Nya nycklar under `dict.app.pages.teacher.lessonDetail`: `editTranscript`,
`clearTranscript`, `save`, `cancel`, `saving`, `savingReindex`,
`searchPlaceholder`, `matchCount` (`{current}/{total}`), `noMatches`,
`clearConfirmTitle`, `clearConfirmBody`, `clearConfirmAction`, samt
fel-/lyckat-toaststrängar. Inga hårdkodade strängar.

## Filer

**Nya:**
- `apps/web/components/app/teacher/TranscriptEditor.tsx`
- `apps/web/app/actions/transcript.ts`

**Ändrade:**
- `apps/web/components/app/teacher/TeacherLessonDetail.tsx` (byt `<pre>` mot editor)
- `supabase/functions/transcribe-lesson/index.ts` (idempotent chunk-insert)
- `apps/web/lib/i18n/locales/sv.ts`, `en.ts`, `apps/web/lib/i18n/types.ts`

## QA / verifiering före "klar"

- [ ] Typecheck: inga `any` utan kommentar.
- [ ] Bygg: alla rutter (~92) genereras utan fel.
- [ ] Zod-validering på båda Server Actions.
- [ ] WCAG AA på editor + sökfält + modal.
- [ ] Inga hårdkodade strängar (t('key')).
- [ ] Manuellt: redigera → spara → `lesson_chunks` regenereras (antal ändras),
      `summary` uppdateras, och en elevchatt återspeglar den rättade texten.
- [ ] Manuellt: "Töm transkript" nollställer text + chunks + härledda fält.
- [ ] Endast teacher/admin i samma skola kan anropa actions (RLS + explicit check).

## Avgränsat (YAGNI)

- Ingen global sökning över alla lektioner (separat framtida bygge).
- Ingen versionshistorik/ångra för transkript.
- Ingen diff-baserad partiell re-embedding — vi re-indexerar hela lektionen
  (enkelt och korrekt; lektioner är små nog).
