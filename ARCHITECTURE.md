# ARCHITECTURE — Elevante

Senast uppdaterad: 2026-08-04 (klassprov, arkivering, säljytor /rektor + /larare + /investerare, /try, Loops, strömmande chatt, avatarer)

> Detta dokument speglar Notion-sidan **ARCHITECTURE** (`33e84c8f289e8191b9b1d2e35309da3f`).

---

## Översikt

Elevante är en monorepo-baserad plattform med tre deployment-targets:

1. **Web** (Next.js 16) — publik sajt + säljytor + elev/lärare/admin-app, deployas till Vercel (arn1, Stockholm).
2. **Mobil** (Expo SDK 52 på `main`; SDK 54-uppgradering ligger på branch `chore/expo-sdk-54-upgrade`) — lärar-app för inspelning, distribueras via Expo Go / EAS.
3. **Pipeline** (Supabase Edge Function) — transkribering + embeddings + AI-summary, körs i Supabase (eu-central-2 / Zurich).

All data lagras i Supabase PostgreSQL (eu-central-2) med pgvector. All AI-generering via Anthropic Claude. All transkribering via KB-Whisper på Berget AI (EU, GDPR). All embedding via `intfloat/multilingual-e5-large` på Berget AI. Ingen data lämnar EU förutom vid Anthropic API-anrop (DPA under utredning, V2-blockerare för full pilot) och vid utgående mejl via Loops (US).

### Ytor i webb-appen

| Yta | Rutt | Publik? |
|---|---|---|
| Publik sajt | `/[locale]/(public)/*` | Ja, indexerad, SSG |
| Kampanjsida "Prova" | `/[locale]/try` | Ja, indexerad, inloggningsfri |
| Skriptad demo | `/[locale]/demo` | Noindex |
| Säljsida rektor | `/rektor` (+ `/rektor/deck`) | Noindex, sv only, utanför `[locale]` |
| Säljsida lärare | `/larare` | Noindex, sv only, utanför `[locale]` |
| Investerardeck | `/investerare` (+ `/investerare/en`) | Lösenordsgrindad, noindex |
| App | `/[locale]/app/[role]/*` | Auth krävs, noindex |

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
| `lessons` | recording-metadata, `transcript_status`, `audio_path`, `transcript_text`, `summary`, `suggested_questions`, `ai_generated_topic`, `concepts`, `is_synthetic`, `archived_at` (mjuk radering — `null` = aktiv) |
| `materials` | Filer per lektion (lagras i Storage) |
| `lesson_chunks` | pgvector 1024-dim embeddings för RAG |
| `chats` | Chat-tråd-metadata, `scope` (lesson/course/selection), `lesson_id`/`course_id`/`lesson_ids` |
| `chat_messages` | Role (user/assistant), content, `sources jsonb`, `concepts jsonb` |
| `lesson_views` | Telemetry per elev × lektion (view_count, first_viewed_at, last_viewed_at) |
| `practice_tests` | AI-genererade övningsprov — `questions`/`submission` jsonb, score, `shared_with_teacher` |
| `learner_profiles` | Elevens lärprofil — `strengths`/`growth_areas` jsonb, `summary`. En rad per elev |
| `class_tests` | Lärar-författade klassprov — titel, klass, lektionsurval, `questions` jsonb, status draft/published/closed |
| `class_test_submissions` | Elevinlämning — svar jsonb, poäng, AI-feedback, `released_at` (release-gate) |
| `school_lookups` | Kampanj: rå logg per prisförfrågan (skolkod, elevantal, pris, lead-mail). Global tabell |
| `school_prospects` | CRM: anrikat skol-prospekt, en rad per skola (`school_unit_code` unik), kontakt + `ai_brief` + `contact_email_draft` + `enrichment_status` + `notion_page_id` + `skolform`/`created_via`/`last_synced_at`/`sync_status`/`sync_error`. Global tabell |
| `school_sync_log` | CRM: ops-logg per synkkörning (inbound/admin/cron). Global tabell |
| `investor_invites` | Investerardeck: en kod per investerare (`label`, `code` unik, `active`, `notion_page_id`) |
| `investor_deck_views` | Investerardeck: läs-spårning per session (`max_scroll_pct`, `seconds`, `reached_ask`, notis-flaggor) |
| `try_shares` | `/try`-delningar: avsändare, mottagare, meddelande, locale, ip. Global tabell |

### RLS

Alla tabeller har RLS på. Helper-funktioner:

- `public.current_school_id()` — security definer, returnerar profilens school_id.
- `public.current_user_role()` — security definer. Omdöpt från `current_role` för att inte kollidera med Postgres inbyggd `current_role()`.

**Policy-mönster:**
- Alla ser bara sin egen skolas data.
- Admin skriver, lärare skriver sina egna lektioner.
- `chats`/`chat_messages`/`lesson_views`: ägaren ser sina egna, OCH **bara den lärare som äger lektionen** (`lessons.teacher_id`) ser elev-datan för den lektionen — för insikt-heatmapen. Admin och kollegor har ingen åtkomst (`20260517170000_teacher_private_insight.sql` ersatte den bredare Fas 8-policyn `20260515090200`). Heatmapen använder bara lesson-scope-chattar. Privacy-trade-off kvarstår — kräver explicit samtycke vid pilot mot riktig skola.
- `school_lookups`/`school_prospects`/`school_sync_log`/`try_shares` (kampanj, CRM, delning): globala tabeller, ingen skol-scoping. Bara admin läser (`current_user_role() = 'admin'`); service-role-klienten skriver och kringgår RLS — inga insert/update-policys finns.
- `class_tests`: bara lärare i samma skola (select/insert/update/delete). `class_test_submissions`: eleven läser och skriver sin egen, läraren läser och rättar klassens.
- `investor_invites`/`investor_deck_views`: RLS på men **helt utan policys** — ingen anon- eller authenticated-åtkomst alls. All åtkomst går genom security-definer-RPC:erna, så en investerarkod aldrig kan läsas via PostgREST.

`is_synthetic` på `lessons` märker demo-genererade lektioner (AI-skrivna transkript) så de kan filtreras bort innan en riktig pilotskola. `lesson_ids` på `chats` håller lektionsurvalet för en `selection`-chat (Provplugg).

- `practice_tests`: RLS owner-only — plus en policy som låter lärare/admin i samma skola läsa prov där eleven satt `shared_with_teacher`.
- `learner_profiles`: RLS strikt owner-only — läraren har ingen åtkomst. En profil över en minderårigs styrkor/svagheter är känslig persondata (GDPR-uppgift finns i Notion).

### RPC

**RAG + telemetri**

- `match_lesson_chunks(query_embedding, lesson_id, top_k)` — cosine vector-search för chat på en lektion.
- `match_course_chunks(query_embedding, course_id, top_k, lesson_ids_filter)` — cosine vector-search över en kurs. `lesson_ids_filter` (valfri, default null) begränsar sökningen till ett urval lektioner — används av Provplugg.
- Båda **exkluderar arkiverade lektioner** (`archived_at is not null`) sedan `20260617120100` — en raderad lektion kan aldrig dyka upp som källa.
- `track_lesson_view(lesson_id_arg)` — security definer, upsertar `lesson_views` (för heatmap-telemetry).

**Klassprov** (security definer — facit och resultat får aldrig nå klienten för tidigt)

- `get_published_class_test(...)` — strippar `answer_key`/`correct_index` innan eleven får provet.
- `get_my_submission_result(...)` — release-gate: returnerar null tills läraren satt `released_at`.
- `get_class_test_for_grading(...)` — lärarskyddad full read.
- `list_student_class_tests(...)` — elev-scope med submission-status.

**Investerardeck** (security definer — enda vägen in till de policylösa tabellerna)

- `verify_investor_code(p_code)` → `{invite_id, label}`.
- `record_investor_open(...)` / `record_investor_engagement(...)` — sessionsstart respektive scroll/tid/the-ask.
- `get_investor_rollup(...)` — aggregat som pushas till Notion.
- `mark_investor_notified(...)`, `upsert_investor_invite(...)`, `get_cached_invite_by_code(...)` — notis-dedup och Notion-cache.

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
proxy.ts → refreshar session + skyddar /app/* → redirect /login
```

`proxy.ts` kör Supabase-session (`getUser`) **bara** på `/[locale]/app/*` och `/[locale]/login` — publika rutter slipper Auth-roundtrippen och serveras statiskt (perf, 2026-05-29).

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

### Webb-chat (RAG)

En chat har ett `scope`: `lesson` (en lektion, `match_lesson_chunks`), `course` (hela kursen, `match_course_chunks`) eller `selection` (Provplugg — ett urval lektioner, `match_course_chunks` med `lesson_ids_filter`).

```
användarfråga → embed (Berget) → match_lesson_chunks RPC → topp-K chunks
              → answerWithRag (Claude) med lessonConcepts + chunks som kontext
              → svar (med källcitat) + concepts (taggar för insikt-vyn)
              → spara user-msg och assistant-msg med concepts i chat_messages
```

Fallback: `mockedAnswer` om keys saknas (lokal dev).

### Strömmande svar (2026-08-03)

Chatten blockerade tidigare tills hela Claude-svaret var färdigt (~16 s). Nu strömmas det:

```
startChat → sparar frågan, redirectar direkt (genererar inget svar)
ChatThread → upptäcker obesvarat meddelande → GET /api/chat/stream (SSE)
   rutt: auth + Zod → all cookie-beroende Supabase-åtkomst FÖRE strömmen öppnas
       → lib/rag/retrieve.ts (delad med Server Action → identisk kontext)
       → streamRagRaw (Claude) → delta-event per token
       → decodeAnswerSoFar (lib/ai/stream-json.ts) plockar answer ur växande JSON
       → done-event med källcitat + concepts → spara assistant-msg
```

- `sendMessage` finns kvar som formulärets `action` — utan JavaScript fungerar chatten som förut.
- Resume-läget läser frågan **ur databasen**, inte från klienten, och vägrar om den redan är besvarad.
- `concise` är opt-in (används bara av `/try`); `personaSummary` skickas med så lärprofilen inte tappas i strömmande läge.
- Känd begränsning: sidofältets historik uppdateras först vid navigering — strömningsvägen kan inte `revalidatePath`.

### Insikt-vyn (lärare)

Lärare → `/teacher/lektioner/[id]` → `getLessonInsight(lessonId)`:

```
SELECT alla elever i lektionens klass
JOIN chat_messages där chat.lesson_id = lessonId AND role='user'
AGGREGERA per elev: total_questions, concept_question_counts {concept → count}
SELECT lesson_views för att visa "har öppnat" vs "ej öppnat"
RENDER InsightHeatmap: matris elev × koncept med siffror i celler
```

### Övningsprov & lärprofil

```
Provplugg → createPracticeTest → Claude genererar prov från lektionernas
            transkript → practice_tests (questions jsonb)
Eleven fyller i → submitPracticeTest:
   flerval rättas i kod, fritextsvar av Claude (gradePracticeTest)
   → submission jsonb + score
   → buildLearnerProfile analyserar elevens senaste prov → learner_profiles
Eleven kan dela ett prov (shared_with_teacher) → läraren ser /teacher/prov
```

Lärprofilen (`learner_profiles`) matas in i `gradePracticeTest` och `answerWithRag`
så test-feedback och chattsvar blir personanpassade. Loop: prov → mönster →
bättre feedback nästa gång.

### Klassprov (lärar-författade)

```
läraren väljer klass + lektioner + antal frågor + fördelning (stängda/öppna/resonerande)
   → largest-remainder-algoritm garanterar exakt antal
   → generateClassTest (Claude mot transkript) → class_tests.questions jsonb (draft)
   → publicera
eleven → get_published_class_test (facit strippat) → ClassTestRunner → submit
   → flerval rättas i kod, fritext/resonerande av Claude (gradePracticeTest)
läraren → get_class_test_for_grading → GradeReview (justera poäng/feedback)
   → släpp per elev (released_at)
eleven → get_my_submission_result (null tills släppt)
```

### Porträtt på elever

`lib/avatars.ts` mappar fullständigt namn → `/avatars/<slug>.jpg`. `Avatar` slår upp namnet
automatiskt och faller tillbaka på initialer när porträtt saknas — riktiga skolor påverkas inte.
Bilderna är syntetiska (AI-genererade) demoansikten, inga riktiga personer. Oanvända reserv-
ansikten ligger i `assets/avatar-pool/` (utanför `public/`, publiceras inte).

---

## Publika säljytor

### `/try` — upplev kärnloopen utan konto

Publik, indexerbar, inloggningsfri. Skild från `/demo` (noindex, skriptad).

```
LessonPicker (6 syntetiska Ekologi-lektioner, lib/try/lessons.ts)
   → ChatStep   → POST /api/try/chat  (SSE, answerWithRag med concise=true)
   → TestStep   → POST /api/try/test  (generatePracticeTest)
                → POST /api/try/grade (gradePracticeTest)
   → ShareTeaser → shareTry Server Action
```

- **Stateless rutter** — inget konto, ingen session. Provfrågorna reser i en **AES-256-GCM-krypterad** token (`lib/try/token.ts`, nyckel `INVESTOR_DECK_SECRET`, override `TRY_TEST_SECRET`) så facit aldrig når klienten. Tidigare base64+HMAC läckte facit: kodning är inte kryptering.
- **Chatten leder** — prov-inbjudan och steg ③ döljs tills besökaren fått ett svar.
- AI svarar på besökarens locale, men **källcitaten förblir svenska** (äkta klassrumsmaterial); de hittas även på engelska via svenska koncept-taggar som språkbrygga.
- Best-effort rate-limit i minnet (`lib/try/ratelimit.ts`) + inputtak + graceful offline-fallback.
- Delning loggas i `try_shares` (Supabase = sanningen, fäller vid fel) och best-effort i Notion.

### `/rektor` och `/larare`

Scroll-sidor i Editorial Calm, svenska only, noindex, utanför `[locale]`. Delar showcase-bibliotek
(`components/showcase/`: `Reveal`, `ZoomableShot`, `ChatDemo`, `LoopVisuals`) med startsidan.
Bildspelsversionen finns kvar på `/rektor/deck`. `skolor.`-subdomänen rewritas till `/rektor` i `proxy.ts`.

**Roller i scope är bara elev och lärare** — ingen rektors-/skoladminvy byggs. Förståelse-kartan är en
lärarvy; rektorssidan säljer "det du kan erbjuda dina lärare", aldrig en granskningspanel över dem.

### `/investerare` — lösenordsgrindat deck

```
kod → proxy.ts-grind → /investerare/las-upp → unlock-action
   → findInvestorByCode (Notion = auktoritativt, Aktiv=false stänger av direkt)
   → fallback get_cached_invite_by_code (Supabase) om Notion är nere
   → HMAC-signerad cookie {label, sid, pid}, path '/', Secure bara i prod
DeckTelemetry → /api/investerare/telemetry → record_investor_engagement
   → get_investor_rollup → pushRollup till Notion + notis-mejl vid öppning och the ask
```

Notion är master för investerarlistan (John äger Investerare/Kod/Aktiv; servern skriver Status,
Senast inne, Max scroll %, Nådde the ask, Antal sessioner, aktiv tid). Saknas `INVESTOR_DECK_SECRET`
är gaten **öppen** — dev-läge, måste vara satt i produktion.

---

## E-post (Loops)

All transaktionell mejl går via Loops sedan 2026-07-12 (Resend borttaget). Server-only adapter
`lib/loops.ts` med timeout + retry. `sendLoopsTransactional` returnerar `boolean` och **kastar aldrig**
— anroparen bestämmer om ett misslyckat mejl ska fälla operationen.

| Väg | Mall-env | Vid fel |
|---|---|---|
| Kontaktformulär | `LOOPS_CONTACT_TRANSACTIONAL_ID` | Fäller (`error: 'generic'`) |
| `/try`-delning | `LOOPS_SHARE_TRANSACTIONAL_ID_SV` / `_EN` | Best-effort (Supabase är loggen) |
| Investerarnotis | `LOOPS_INVESTOR_TRANSACTIONAL_ID` | Best-effort |

Copy bor i Loops-mallarna; koden skickar bara variabler. Domänen `elevante.se` är verifierad i Loops.

---

## Kampanj / lead-gen (publik kalkylator → prospekt)

Fristående säljflöde, oberoende av elev/lärar-appen. Sida: `/[locale]/vad-kostar-elevante`.

```
publik kalkylator → sök gymnasieskola (Skolverket planned-educations v3)
   → autofyll elevantal + skolfakta (lib/skolverket.ts)
   → estimateAnnualPrice (lib/pricing.ts, 500 SEK/elev/år, inget rabattpåslag)
   → lead-formulär (e-post + meddelande)
campaign.ts (Server Action, service-role-klient):
   → upsert school_lookups (rå logg) + school_prospects (race-säkert)
   → bakgrundsanrikning: Skolverket-fakta → Claude säljbrief (lib/campaign-brief.ts)
   → upsert till Notion-databas (lib/notion.ts) → enrichment_status='done'
admin → /admin/intresse → läser school_prospects (admin-read RLS)
```

`municipalities.json` (290 kommuner) översätter Skolverkets `geographicalAreaCode` → kommunnamn. `scripts/fetch-schools.ts` snapshottar gymnasieskolor (skolenhetskod rensas ur namnet).

### Skol-CRM (outbound, från 2026-07-01)

Inbound-flödet ovan evolverades till ett enat CRM som också stödjer outbound.

```
admin → /sv/app/admin/crm → searchSchoolUnits (lib/data/school-units.json, 6 652 enheter)
   → syncProspect (lib/prospects.ts, delad väg för inbound + admin + cron)
        → fetchPupilCount + Skolverket-fakta
        → Claude säljbrief + kontaktmejl-utkast (cachas i contact_email_draft)
        → icke-destruktiv Notion-upsert
        → school_sync_log
cron 0 3 * * * → /api/cron/sync-prospects (arn1, MAX_PER_RUN 20, CRON_SECRET-gate)
```

**Notion är SSoT för CRM-data.** Properties är delade i maskin-props (Skola, Kommun, Elevantal,
Skolform, Synkstatus, Senast synkad — skrivs alltid) och CRM-props (Status-pipelinen
Ny→Kontaktuppgift lämnad→Kontaktad→Kvalificerad→Vunnen→Tappad, Owner, Anteckningar, Nästa steg,
Senast kontaktad, Kontaktväg — **rörs aldrig** av synken). Dedup via `queryNotionProspectByCode`;
fler än en träff sätter Synkstatus "Behöver kollas" och skriver ingenting.

`school-units.json` är avsiktligt skilt från den publika `schools.json` (gymnasium, priskalkylatorn)
så adminsöket kan täcka alla skolformer utan att påverka publik bundle-storlek.

---

## Deploy

| Komponent | Hur |
|---|---|
| Web | GitHub push till `main` → Vercel auto-deploy (arn1 Stockholm) |
| Mobil | Manuell via Expo Go / EAS Build |
| Edge Function | Supabase MCP `deploy_edge_function` |
| Migrationer | Supabase MCP `apply_migration` + lokal fil i `supabase/migrations/` |

Cron: `/api/cron/sync-prospects` (`0 3 * * *`, arn1) — CRM-synk mot Notion.

Vercel env vars (Production + Preview + Development, ej Sensitive-flaggade så ALL environments funkar):

**Kärna**
- `NEXT_PUBLIC_SITE_URL`, `CONTACT_TO_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`) — utan den används `mockedAnswer`
- `BERGET_AI_API_KEY` (+ `BERGET_AI_BASE_URL`, `_TRANSCRIBE_MODEL`, `_EMBED_MODEL`)

**E-post (Loops)** — utan `LOOPS_API_KEY` loggas mejlen bara
- `LOOPS_API_KEY`, `LOOPS_CONTACT_TRANSACTIONAL_ID`, `LOOPS_SHARE_TRANSACTIONAL_ID_SV`, `LOOPS_SHARE_TRANSACTIONAL_ID_EN`, `LOOPS_INVESTOR_TRANSACTIONAL_ID`

**Notion** — graceful om de saknas
- `NOTION_TOKEN` (integrationen "Claude sync" — nya databaser måste kopplas manuellt i Notion)
- `NOTION_LEADS_DATABASE_ID` (CRM), `NOTION_SHARES_DATABASE_ID` (`/try`-delningar), `NOTION_INVESTOR_DB_ID` (investerardeck)

**Hemligheter / gates**
- `INVESTOR_DECK_SECRET` — signerar deckets sessions-cookie **och** krypterar `/try`-provtoken. Saknas den är deck-gaten öppen (dev-läge).
- `TRY_TEST_SECRET` (valfri override för provtoken), `INVESTOR_NOTIFY_EMAIL` (default `CONTACT_TO_EMAIL`)
- `CRON_SECRET` — skyddar cron-rutten

---

## GDPR

- **Databas**: eu-central-2 (Zurich).
- **Vercel Functions**: arn1 (Stockholm).
- **Storage**: eu-central-2.
- **Audio**: raderas efter transkribering.
- **Chat-privacy**: ägaren + den lärare som äger lektionen (lärarprivat insikt). Vid pilot mot skola krävs explicit föräldra-/elev-samtycke (separat Notion-task).
- **Embeddings + transcribering**: Berget AI (EU, GDPR).
- **Arkiverade lektioner** (`archived_at`) exkluderas ur RAG-sökningen — en raderad lektion kan aldrig citeras.
- **Kvarstående risker**:
  - Anthropic Claude API (USA) — DPA / AWS Bedrock-EU-granskning krävs innan production-pilot.
  - **Loops (loops.so, USA)** — e-postmotorn sedan 2026-07-12. Samma cross-border-läge som Resend hade, men ska stämmas mot principen "inget persondata utanför EU". Mottagaradresser i `try_shares` och kontaktformuläret passerar Loops.
  - `learner_profiles` — en profil över en minderårigs styrkor och svagheter är känslig persondata. RLS är strikt owner-only, men GDPR-bedömningen ligger som separat Notion-uppgift.

---

## Projektstruktur

```
elevante/
├── apps/
│   ├── web/                # Next.js 16
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── (public)/   # publika sajten + /try + /demo
│   │   │   │   └── app/[role]/ # student/teacher/admin
│   │   │   ├── rektor/         # säljsida (+ /deck), sv only, noindex
│   │   │   ├── larare/         # säljsida, sv only, noindex
│   │   │   ├── investerare/    # lösenordsgrindat deck (sv/en)
│   │   │   ├── api/            # chat/stream, try/*, investerare/*, cron/*, …
│   │   │   └── actions/
│   │   ├── components/
│   │   │   ├── ui/             # baskomponenter (Avatar, Toast, …)
│   │   │   ├── public/         # Header, Footer, etc.
│   │   │   ├── showcase/       # delat mellan startsidan, /rektor, /larare, decket
│   │   │   └── app/{role}/     # role-specifika komponenter
│   │   ├── public/avatars/     # porträtt på demo-elever (publiceras)
│   │   └── lib/
│   │       ├── ai/             # anthropic.ts, berget.ts, stream-json.ts
│   │       ├── rag/            # retrieve.ts (delad av Server Action + SSE-rutt)
│   │       ├── try/            # lessons.ts, copy.ts, token.ts, ratelimit.ts, share-log.ts
│   │       ├── data/           # teacher.ts, student.ts, admin.ts, school-units.json
│   │       ├── supabase/       # ssr + browser + service-role-klienter
│   │       ├── i18n/
│   │       ├── avatars.ts      # namn → porträtt
│   │       ├── loops.ts        # e-postadapter
│   │       ├── skolverket.ts   # CRM: skolfakta + elevantal
│   │       ├── notion.ts       # CRM: prospekt → Notion
│   │       ├── prospects.ts    # CRM: delad syncProspect
│   │       ├── notion-investor.ts + investor-access.ts + investor-notify.ts
│   │       ├── campaign-brief.ts # CRM: Claude säljbrief
│   │       └── pricing.ts      # prisuppskattning + vatBreakdown (bakom flagga)
│   └── mobile/             # Expo SDK 52 (SDK 54 på branch)
├── supabase/
│   ├── migrations/
│   └── functions/transcribe-lesson/
├── assets/avatar-pool/     # reservporträtt, publiceras INTE
├── docs/superpowers/       # specar + implementationsplaner per fas
├── scripts/                # seeds, fetch-schools, crop-app-shots
├── packages/               # delade paket (extraheras vid behov)
├── CHANGELOG.md
├── ARCHITECTURE.md
├── CLAUDE.md
└── turbo.json
```
