# Elevens lektionsvy: sammanfattning + startfrågor

**Status:** Design godkänd, redo för implementation
**Datum:** 2026-05-14
**Berör:** `apps/web/components/app/student/StudentLessonDetail.tsx`, `apps/web/lib/data/student.ts`, `apps/web/lib/ai/anthropic.ts`, `supabase/functions/transcribe-lesson/index.ts`, ny migration på `public.lessons`

---

## Problem

Nuvarande lektionsvy för elev visar hela råtranskriptet (30 000+ tecken i `<pre>`-tagg). Det är overwhelming. Eleven behöver:

1. **En snabb idé om vad lektionen handlade om** — så de vet om de ska klicka in
2. **En startpunkt för att fråga** — många elever vet inte vad de ska fråga om innan de börjat
3. **Tilliten att AI:n bygger på riktig data** — råtexten behöver fortfarande vara tillgänglig (transparens) men inte vara i vägen

Lektionens nuvarande titel (`Ekologins grunder — ekosystem och näringsvävar`) är dessutom ad hoc och inte skanbar i en lista.

---

## Vad vi bygger

Eleven öppnar en lektion. Möter:

```
Bibliotek / Biologi 1 / 11 maj — ...
● KLAR
11 maj — Ekosystem och näringsvävar
Biologi 1 · Anna Andersson

┌────────────────────────────────┬──────────────┐
│ SAMMANFATTNING                  │ MATERIAL     │
│ Idag handlade lektionen om      │ (0 filer)    │
│ hur organismer i ett ekosystem  │              │
│ hänger ihop. Anna gick igenom...│ Visa hela    │
│                                 │ transkriptet │
│ KOM IGÅNG                       │              │
│ [→ Vad är skillnaden mellan...] │              │
│ [→ Förklara näringsvävar med...]│              │
│                                 │              │
│ ┌────────────────────────────┐  │              │
│ │ Eller skriv din egen fråga │  │              │
│ └────────────────────────────┘  │              │
└────────────────────────────────┴──────────────┘
```

---

## Designbeslut

### 1. Namnkonvention

Lessons-titel formateras: **`<DD månad> — <ämne>`**

Exempel: `11 maj — Ekosystem och näringsvävar`

- Datum dras från `lessons.recorded_at`
- Ämnesdelen genereras av AI:n efter transkribering (samma Claude-anrop som genererar sammanfattningen)
- Fallback: om AI-anropet misslyckas, titel = `<datum> — <kursnamn>` (t.ex. `11 maj — Biologi 1`)
- Edge case: om `recorded_at` är NULL används `created_at` istället

### 2. Layout (StudentLessonDetail)

7/5 grid på desktop, stack på mobil:

- **Vänster (7 col):**
  - Breadcrumb + status-dot + titel + meta (oförändrat)
  - **Card 1:** "SAMMANFATTNING" eyebrow + sammanfattning i Newsreader italic, ~16px
  - **Card 2:** "KOM IGÅNG" eyebrow + 2 startfråga-knappar (sand-färgade)
  - **Card 3:** Chat-input ("Eller skriv din egen fråga…")
- **Höger (5 col):**
  - Material-card (oförändrat)
  - "Visa hela transkriptet →" som textlänk längst ner (klick → modal eller separat route)

Inga ändringar i breadcrumb, status-row, header eller materialcards.

### 3. AI:ns röst — lärarlik, varm mentor

System-prompt för sammanfattning + frågor får tonalitet:

- **Sammanfattning:**
  - Skriv som en mentor som var med på lektionen
  - Använd ord som "Idag", "Anna gick igenom", "Hon visade"
  - 3-5 meningar (~250-400 tecken)
  - Citera lärarens egna konkreta exempel där möjligt (vetenskaplig grund: RAG-feature)
  - Aldrig hitta på fakta som inte fanns i lektionen
- **Startfrågor:** Exakt 2 st.
  - Pedagogisk ton ("Förklara skillnaden mellan…", "Beskriv hur…", "Vad innebär…")
  - Måste vara besvarbara enbart från transkriptet (testar RAG-promiset)
  - Refererar gärna lärarens exempel ("Förklara näringsvävar med exemplet från sjön")

### 4. Generering — auto i pipeline

`transcribe-lesson` Edge Function utökas. Efter chunking + embedding (steg 5-6 i nuvarande pipeline) läggs ett nytt steg in:

**Steg 6.5: Generera lessoninnehåll**
1. Skicka transcript till Claude med en strukturerad prompt
2. Begär JSON-svar: `{ topic: string, summary: string, questions: [string, string] }`
3. Spara på `lessons`-raden i samma transaktion som `transcript_text`
4. Vid fel: logga, fortsätt med `transcript_status = 'ready'` ändå (sammanfattning kan fyllas på senare via backfill-script)

Backfill för befintlig Ekologi-lektion: separat SQL-uppdatering där jag manuellt anropar Claude med befintlig `transcript_text` och uppdaterar raden.

---

## Datamodell

Ny migration: `20260514XXXXXX_lesson_summary_and_questions.sql`

```sql
alter table public.lessons
  add column summary text,
  add column suggested_questions jsonb default '[]'::jsonb,
  add column ai_generated_topic text;
```

- `summary`: 3-5 meningar, samma språk som transcript (svenska)
- `suggested_questions`: JSON-array, exakt 2 strängar (validerat på applikationsnivå)
- `ai_generated_topic`: kort ämnesfras AI:n extraherade — används som titel-ingrediens

Inga RLS-ändringar behövs — kolumnerna ärver befintliga `lessons`-policies.

---

## Komponentstruktur

### `apps/web/lib/ai/anthropic.ts`

Ny funktion: `generateLessonContent(transcript: string): Promise<{ topic, summary, questions }>`

- Använder samma Anthropic-klient som RAG-svar
- Tydlig system-prompt: warm mentor voice, anchored to transcript content
- Returnerar strukturerad JSON (använder Claude's structured output feature)

### `apps/web/lib/data/student.ts`

`getStudentLessonDetail()` returnerar utökat objekt:
- `summary: string | null`
- `suggestedQuestions: string[]`
- `aiGeneratedTopic: string | null`

### `apps/web/components/app/student/StudentLessonDetail.tsx`

Uppdateras enligt layout-spec ovan:
- Ersätt nuvarande LEFT-kolumn (mono-pre transcript) med Summary + Suggested questions + Chat input
- Behåll RIGHT-kolumn (materials) men lägg till transcript-toggle
- Transcript flyttas till dedicated route (`/student/lektioner/[id]/transkript`) — enklare än modal, ärver layout-shell, fungerar med browser-back

### `apps/web/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm.tsx`

Utökas: ta emot startfrågor som "prefill"-knappar bredvid input-fältet. Klick → fyller input + submittar direkt.

### `supabase/functions/transcribe-lesson/index.ts`

Lägger till steg 6.5 efter `lesson_chunks` är inserted, före `lessons.transcript_status = 'ready'`.

```ts
// 6.5. Generera AI-innehåll (topic, summary, questions)
try {
  const { topic, summary, questions } = await generateLessonContent(transcript);
  await supabase.from('lessons').update({
    summary,
    suggested_questions: questions,
    ai_generated_topic: topic,
    title: `${formatDate(recordedAt)} — ${topic}`,
  }).eq('id', lessonId);
} catch (err) {
  console.error('Lesson content generation failed:', err);
  // Inte fatalt — pipelinen fortsätter
}
```

---

## Out of scope (V2)

- **Engelsk variant** av sammanfattning/frågor (vi har bara svenska transcripts)
- **Dynamisk regenerering** av frågor baserat på elevens chat-historik
- **Tagging/keywords** för lektioner (kan komma som chips i bibliotek senare)
- **Lärar-version** av sammanfattning (annan ton/innehåll) — lärare ser fortfarande råtranscript i sin vy
- **Inställning för sammanfattningslängd** — fast 3-5 meningar för nu

---

## Acceptanskriterier

1. ✅ När `transcribe-lesson` körs på en lektion sätts `summary`, `suggested_questions` (2 st), `ai_generated_topic` och `title` automatiskt
2. ✅ Befintliga Ekologi-lektionen har full data efter backfill
3. ✅ Student-lektionsvyn visar sammanfattningen som hero-text (ingen `<pre>`-transcript synlig som default)
4. ✅ Två startfråge-knappar visas och fungerar (klick fyller chat-input och submittar)
5. ✅ "Visa hela transkriptet"-länken leder till `/student/lektioner/<id>/transkript`
6. ✅ Teacher- och admin-vyer är oförändrade (de ser fortfarande råtransscript)
7. ✅ Tonen i sammanfattning matchar spec: "Idag handlade lektionen om…" / "Anna gick igenom…"
8. ✅ Om AI-generering misslyckas markeras lektionen som `ready` ändå (graceful degradation)

---

## Testflöde

1. Backfill Ekologi-lektionen → öppna `/student/lektioner/<id>` som Elin → se sammanfattning + 2 frågor
2. Klicka första startfrågan → ska skapa en chat med den frågan som första prompt
3. Klicka "Visa hela transkriptet" → transcript visas
4. Logga in som Anna (lärare) → samma lektion, gamla vyn (full transcript) ska visas
5. *Senare när transcribe-lesson kör på ny lektion:* verifiera att summary genereras utan manuell ingripande
