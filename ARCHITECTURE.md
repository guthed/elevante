# ARCHITECTURE — Elevante

Senast uppdaterad: 2026-05-15

> Detta dokument speglar Notion-sidan **ARCHITECTURE** (`33e84c8f289e8191b9b1d2e35309da3f`).

---

## Översikt

Elevante är en monorepo-baserad plattform med tre deployment-targets:

1. **Web** (Next.js 16) — publik sajt + elev/lärare/admin-app, deployas till Vercel (arn1, Stockholm).
2. **Mobil** (Expo SDK 52) — lärar-app för inspelning, distribueras via Expo Go / EAS.
3. **Pipeline** (Supabase Edge Function) — transkribering + embeddings + AI-summary, körs i Supabase (eu-central-2 / Zurich).

All data lagras i Supabase PostgreSQL (eu-central-2) med pgvector. All AI-generering via Anthropic Claude. All transkribering via KB-Whisper på Berget AI (EU, GDPR). All embedding via `intfloat/multilingual-e5-large` på Berget AI. Ingen data lämnar EU förutom vid Anthropic API-anrop (DPA under utredning, V2-blockerare för full pilot).

---

## Databas (Supabase, dedikerat projekt)

Projekt: `msqfuywpbrteyrzjggsw` (eu-central-2, Zurich) — separat från Bokmässan från och med Fas 8 (2026-05-14).

Allt bor i `public`-schemat. Migrationer i `supabase/migrations/`.

### Tabeller

| Tabell | Innehåll |
|---|---|
| `schools` | Skolnamn + slug |
| `profiles` | FK `auth.users`, full_name, role (student / teacher / admin), school_id. Auto-trigger på signup |
| `courses` | Skol-kurser |
| `classes` | Elevgrupper |
| `class_members` | Elev × klass |
| `course_teachers` | Lärare × kurs |
| `timeslots` | Schema-rader (day_of_week + start/slut) |
| `lessons` | recording-metadata, `transcript_status`, `audio_path`, `transcript_text`, `summary`, `suggested_questions`, `ai_generated_topic`, `concepts`, `is_synthetic` |
| `materials` | Filer per lektion (lagras i Storage) |
| `lesson_chunks` | pgvector 1024-dim embeddings för RAG |
| `chats` | Chat-tråd-metadata, `scope` (lesson/course/selection), `lesson_id`/`course_id`/`lesson_ids` |
| `chat_messages` | Role (user/assistant), content, `sources jsonb`, `concepts jsonb` |
| `lesson_views` | Telemetry per elev × lektion (view_count, first_viewed_at, last_viewed_at) |

### RLS

Alla tabeller har RLS på. Helper-funktioner:

- `public.current_school_id()` — security definer, returnerar profilens school_id.
- `public.current_user_role()` — security definer. Omdöpt från `current_role` för att inte kollidera med Postgres inbyggd `current_role()`.

**Policy-mönster:**
- Alla ser bara sin egen skolas data.
- Admin skriver, lärare skriver sina egna lektioner.
- `chats`/`chat_messages`: ägaren ser sina egna OCH lärare/admin i samma skola ser elev-chats (för insikt-vyn). Privacy-trade-off — kräver explicit samtycke vid pilot mot riktig skola (`20260515090200_teacher_chat_read_for_insight.sql`).

`is_synthetic` på `lessons` märker demo-genererade lektioner (AI-skrivna transkript) så de kan filtreras bort innan en riktig pilotskola. `lesson_ids` på `chats` håller lektionsurvalet för en `selection`-chat (Provplugg).

### RPC

- `match_lesson_chunks(query_embedding, lesson_id, top_k)` — cosine vector-search för chat på en lektion.
- `match_course_chunks(query_embedding, course_id, top_k, lesson_ids_filter)` — cosine vector-search över en kurs. `lesson_ids_filter` (valfri, default null) begränsar sökningen till ett urval lektioner — används av Provplugg.
- `track_lesson_view(lesson_id_arg)` — security definer, upsertar `lesson_views` (för heatmap-telemetry).

### Storage-buckets

- `elevante-materials` (500 MB, privat) — PDF/PNG/JPG/WEBP/TXT/DOCX/PPTX/XLSX. RLS: lärare/admin skriver per `school_id/lesson_id/file`.
- `elevante-audio` (2 GB, privat) — m4a/wav från mobil. RLS strikt — bara lärare/admin. Raderas efter transkribering (GDPR).

---

## Auth-flöde

Supabase Auth med `@supabase/ssr`. Sessions i HTTP-only cookies (webb) eller SecureStore (mobil).

```
Signup → e-postverifiering → /api/auth/callback → exchangeCodeForSession → redirect /app
Login → signInWithPassword → session-cookie → redirect /app
/app/page.tsx → läser profil → redirect till /app/[role]
[role]/layout.tsx → validerar URL-roll = profilroll
proxy.ts → refreshar session per request + skyddar /app/* → redirect /login
```

---

## AI-pipeline (skarp end-to-end från Fas 8)

### Mobil → Supabase

```
REC → STOP → upload (m4a) → elevante-audio bucket
     → updaterar lessons.audio_path
     → triggar supabase.functions.invoke('transcribe-lesson')
```

### Edge Function `transcribe-lesson` (Deno)

```
1. download audio från storage (service-role)
2. Berget AI /audio/transcriptions (KB-Whisper) → svensk text
3. chunkText(text, ~500 tecken, 80 overlap)
4. Berget AI /embeddings (intfloat/multilingual-e5-large, 1024 dim)
5. insert lesson_chunks (med embedding-vector)
6. Anthropic Claude → genererar summary + suggested_questions[] + ai_generated_topic + concepts[]
7. update lessons (transcript_text, transcript_status='ready', + AI-fälten ovan)
8. delete audio från storage (GDPR)
```

Claude returnerar JSON som ibland wrapped i markdown-fences → strippas med regex innan parse.

Om request-body innehåller `transcript_text` används det direkt — steg 1–2 (audio-download + Whisper) hoppas över och ingen GDPR-radering körs (ingen ljudfil finns). Används för att seeda demo-lektioner med färdiga transkript.

### Webb-chat (RAG) — scopes

En chat har ett `scope`: `lesson` (en lektion, `match_lesson_chunks`), `course` (hela kursen, `match_course_chunks`) eller `selection` (Provplugg — ett urval lektioner, `match_course_chunks` med `lesson_ids_filter`).

### Webb-chat (RAG)

```
användarfråga → embed (Berget) → match_lesson_chunks RPC → topp-K chunks
              → answerWithRag (Claude) med lessonConcepts + chunks som kontext
              → svar (med källcitat) + concepts (taggar för insikt-vyn)
              → spara user-msg och assistant-msg med concepts i chat_messages
```

Fallback: `mockedAnswer` om keys saknas (lokal dev).

### Insikt-vyn (lärare)

Lärare → `/teacher/lektioner/[id]` → `getLessonInsight(lessonId)`:

```
SELECT alla elever i lektionens klass
JOIN chat_messages där chat.lesson_id = lessonId AND role='user'
AGGREGERA per elev: total_questions, concept_question_counts {concept → count}
SELECT lesson_views för att visa "har öppnat" vs "ej öppnat"
RENDER InsightHeatmap: matris elev × koncept med siffror i celler
```

---

## Deploy

| Komponent | Hur |
|---|---|
| Web | GitHub push till `main` → Vercel auto-deploy (arn1 Stockholm) |
| Mobil | Manuell via Expo Go / EAS Build |
| Edge Function | Supabase MCP `deploy_edge_function` |
| Migrationer | Supabase MCP `apply_migration` + lokal fil i `supabase/migrations/` |

Vercel env vars (Production + Preview + Development, ej Sensitive-flaggade så ALL environments funkar):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `BERGET_AI_API_KEY`
- `RESEND_API_KEY` (graceful fallback om saknas)

---

## GDPR

- **Databas**: eu-central-2 (Zurich).
- **Vercel Functions**: arn1 (Stockholm).
- **Storage**: eu-central-2.
- **Audio**: raderas efter transkribering.
- **Chat-privacy**: ägaren + lärare/admin i samma skola. Vid pilot mot skola krävs explicit föräldra-/elev-samtycke (separat Notion-task).
- **Embeddings + transcribering**: Berget AI (EU, GDPR).
- **Kvarstående risk**: Anthropic Claude API (USA) — DPA / AWS Bedrock-EU-granskning krävs innan production-pilot.

---

## Projektstruktur

```
elevante/
├── apps/
│   ├── web/                # Next.js 16
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── (public)/   # publika sajten
│   │   │   │   └── app/[role]/ # student/teacher/admin
│   │   │   └── actions/
│   │   ├── components/
│   │   │   ├── ui/             # baskomponenter
│   │   │   ├── public/         # Header, Footer, etc.
│   │   │   └── app/{role}/     # role-specifika komponenter
│   │   └── lib/
│   │       ├── ai/             # anthropic.ts, berget.ts
│   │       ├── data/           # teacher.ts, student.ts, admin.ts
│   │       ├── supabase/       # ssr + browser-klienter
│   │       └── i18n/
│   └── mobile/             # Expo SDK 52
├── supabase/
│   ├── migrations/
│   └── functions/transcribe-lesson/
├── packages/               # delade paket (extraheras vid behov)
├── CHANGELOG.md
├── ARCHITECTURE.md
├── CLAUDE.md
└── turbo.json
```
