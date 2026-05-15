# CHANGELOG — Elevante

> Detta dokument speglar Notion-sidan **CHANGELOG** (`33e84c8f289e81dba880f4dd6e781792`). Uppdateras efter varje godkänd fas.

Format per entry:

```markdown
## [Fas X] — YYYY-MM-DD
### Byggt
- ...
### QA-fynd
- ...
### Tekniska beslut
- ...
```

---

## [Övningsprov & lärprofil] — 2026-05-15

### Byggt
- **AI-genererat testprov** (PR #13): eleven genererar ett övningsprov från sitt lektionsurval i Provplugg — ~2 frågor per vald lektion (klampat 4–12), blandat flerval / kortsvar / öppna / resonerande, nivå Biologi 1 gymnasiet. Ny tabell `practice_tests` (frågor + inlämning som jsonb), RLS owner-only. `createPracticeTest` / `submitPracticeTest` Server Actions: flerval rättas deterministiskt i kod, fritextsvar av Claude mot facit. `TestRunner`-komponent + resultatvy med poäng, procent och per-fråga-feedback. `maxDuration=60` på provplugg-sidorna.
- **Dela prov med läraren** (PR #15): `practice_tests.shared_with_teacher` + RLS-policy — lärare/admin i samma skola ser ett prov först när eleven aktivt delat det. "Dela med din lärare"-knapp i resultatvyn. Ny lärarvy `/teacher/prov` (lista) + `/teacher/prov/[id]` (helt rättat prov). `TestResult` bröts ut till en delad komponent.
- **Lärprofil** (PR #16): `learner_profiles`-tabell, RLS — bara eleven själv. `buildLearnerProfile` analyserar elevens rättade prov (frågetyp, poäng, mönster i feedbacken) och destillerar styrkor, utvecklingsområden och en sammanfattning. Byggs om efter varje inlämnat prov. Matas in i test-rättning (`gradePracticeTest`) och chattsvar (`answerWithRag`) → personanpassad feedback. Elevsida `/student/profil`.

### QA-fynd
- PR #14 (dela prov) stängdes automatiskt av GitHub när dess bas-branch mergades — fick återskapas som PR #15 efter rebase på main.

### Tekniska beslut
- **Testet som en jsonb-rad** (frågor + inlämning), inte normaliserade tabeller — ett prov är en självständig enhet, inga joins.
- **Eleven äger sina prov och sin profil**: prov delas bara aktivt, lärprofilen är osynlig för läraren. En profil över en minderårigs styrkor/svagheter är känslig persondata — GDPR-uppgift skapad i Notion inför riktig pilot.
- **Persona-loopen**: prov rättas → mönster destilleras → nästa provs rättning + chattsvar anpassas. submitPracticeTest gör två AI-anrop (rättning + profilbygge), ryms inom maxDuration=60.

---

## [Demo-iteration — Provplugg, syntetiska lektioner, chat-källor] — 2026-05-15

### Byggt
- **Provplugg** (PR #12): ny chat-scope `selection` + `chats.lesson_ids`. Eleven kan välja ett urval av lektioner i en kurs och chatta riktat mot dem — t.ex. inför ett prov. Dedikerad sida `/app/student/provplugg` med `ExamPrepPicker` (kurs-pills → lektions-kryssrutor med "markera alla" → första fråga). `startExamPrepChat` Server Action. `match_course_chunks` fick ett valfritt `lesson_ids_filter` så vector-sökningen begränsas till urvalet. Chat-tråden visar "Provplugg · N lektioner". Ny nav-post i elevens sidebar.
- **6 syntetiska Ekologi-lektioner** (PR #11): Ekologi-kursen är nu en fylld 8-lektioners kurs (2/vecka × 4 veckor) — 6 AI-genererade transkript + 2 äkta inspelningar sist (vecka 4). Migration `lessons.is_synthetic` märker demo-genererade lektioner. `transcribe-lesson` Edge Function tar nu valfritt `transcript_text` i body → hoppar över audio/Whisper, kör chunk → embed → AI-insikter. Transcript-källor versionshanterade i `scripts/synthetic-ekologi/`.
- **Chat-citat-kort** (PR #10): de döda källpillarna (5 identiska lektionstitlar utan funktion, bara hover-tooltip) ersatta med citat-kort som visar faktiska transcript-utdrag (~180 tecken) som AI:n grundade svaret på. 2 kort default, "Visa fler källor (N)" expanderar resten.
- **Sidebar aktiv-markering** (PR #9): nav-listan bröts ut till klient-komponenten `SidebarNav` som läser `usePathname()`. Tidigare fick Sidebar `currentPath` hårdkodat från role-layouten så bara Översikt kunde markeras aktiv.
- **CHANGELOG.md + ARCHITECTURE.md** lades till i repot (PR #8) som speglar Notion-sidorna.

### QA-fynd
- zsh-arrayer är 1-indexerade → första seed-loopen lade fel transkript i fel lektionsrad. Fixat genom att nollställa raderna och köra om med en `while read`-loop över explicita fil↔id-par.
- `ALTER TYPE ... ADD VALUE` kan inte användas i samma transaktion som värdet läggs till → enum-tillägget bröts ut till en egen migration separat från användningen.

### Tekniska beslut
- **`selection`-scope via `lesson_ids`-kolumn**, inte en join-tabell. Räcker för pilotskala, färre joins, ingen ny RLS-policy.
- **`transcript_text`-läge i Edge Function** för demo-seedning — återanvänder chunk → embed → AI-insikter. Ingen GDPR-radering körs när ingen ljudfil finns.
- **`is_synthetic`** märker demo-lektioner internt så de kan filtreras bort innan en riktig pilotskola. Hellre tydligt syntetiskt än låtsas-äkta — samma princip som Nacka-rensningen.
- **Citat-kort visar transcript-utdrag**, inte lektionstitlar — källans värde är *var i materialet* svaret kom ifrån, inte vilken lektion (särskilt nu när en provplugg-chat spänner flera).

---

## [Fas 8 — Dedikerat Supabase + skarp AI-pipeline + demo] — 2026-05-14

### Byggt
- **Dedikerat Supabase-projekt** `msqfuywpbrteyrzjggsw` (eu-central-2 / Zurich) ersätter det delade Bokmässan-projektet. Alla tabeller bor nu i `public`-schemat — inget eget `elevante`-schema längre. RLS-helpers omdöpta till `public.current_school_id()` och `public.current_user_role()` (sistnämnda för att inte kollidera med Postgres inbyggda `current_role()`).
- **Konsoliderade migrationer** i `supabase/migrations/`: `init_schema`, `rls_policies`, `materials_and_storage`, `audio_recordings`, `chat_history`, `lesson_chunks_pgvector` applicerade på det nya projektet. Storage-buckets `elevante-materials` (500 MB) och `elevante-audio` (2 GB) återskapade med samma RLS-mönster (school_id/lesson_id/file namespace).
- **AI-pipelinen skarp end-to-end**: Berget AI-key + Anthropic-key i Vercel (Production + Preview + Development). `transcribe-lesson` Edge Function v4 kör hela kedjan: download audio → KB-Whisper transkribering → chunking → embeddings (intfloat/multilingual-e5-large, 1024 dim) → insert `lesson_chunks` → Claude genererar `summary` / `suggested_questions` / `ai_generated_topic` → uppdaterar `lessons` → raderar audio. Verifierat på riktig Ekologi-lektion (24 MB m4a, trimmad i QuickTime från originalets 154 MB).
- **Demo-konton** seedade via SQL med `auth.users` + `auth.identities` (CTE + `crypt('password', gen_salt('bf'))`): `john@guthed.se` (admin), `anna@demo.elevante.se` (teacher), `elin@demo.elevante.se` (student). Loggade i Notion-sidan **Nycklar** tillsammans med preview-URL:er.
- **Student-lektionsvy** (PR #6): `summary`, `suggested_questions[]`, `ai_generated_topic` på `lessons`. Komponenten `StudentLessonDetail` visar AI-genererad sammanfattning + två starter-frågor som öppnar förifylld chat (`LessonChatForm`). React-markdown + remark-gfm renderar chat-svar.
- **Lärar-insiktsvy** (PR #7): `concepts jsonb` på både `lessons` och `chat_messages`. Edge Function v4 extraherar 5–8 koncept per lektion via Claude. Chat-Server Action taggar varje fråga med relevant koncept. Ny tabell `lesson_views` (RLS: bara teacher/admin i samma skola, RPC `track_lesson_view` upsertar via security definer). Data-layer `getLessonInsight`, `getRecentLessonInsightRows`, `getLessonStatusCounts` i `lib/data/teacher.ts`. UI-komponenter i `components/app/teacher/`: `InsightHeatmap` (förståelse-karta med koncept × elev, siffror i celler, total-rad + total-kolumn), `InsightDrawer`, `StudentProfileCard`, `ConceptQuestionList`, `MiniHeatmap`, `LessonStatusFilter`. Heatmap placerad direkt under lektions-header för max value.
- **RLS-fix för insikt-vyn**: `chats_teacher_admin_school_select` + `chat_messages_teacher_admin_school_select` policies (migration `20260515090200`) låter lärare/admin i samma skola läsa elevchats. Tidigare strikt `chats_self_select` blockerade Anna från att se elevers frågor i heatmapen → alla celler visade 0.
- **AI-adaptrar utökade**: `answerWithRag` i `lib/ai/anthropic.ts` accepterar nu `lessonConcepts: string[]` och returnerar `{ content, sources, concepts }`. Nya helpers `generateLessonInsight()` (klass-nivå) och `generateStudentInsight()` (individ).
- **Editorial Calm fortsatt**: nya sidor /om-oss, /kontakt, /login, /signup uppdaterade enligt design-systemet (commit `34a1cf5`).

### QA-fynd
- **`NEXT_PUBLIC_*` baked at build time**: Vercel-deploys använde stale Bokmässan-URL trots att miljövariabler var uppdaterade — krävde full rebuild utan cache.
- **Sensitive-flaggade env vars låser Development-kryssrutan**: lösningen var att radera + lägga till på nytt utan Sensitive-flagga så ALL environments kunde markeras.
- **Audio-fil 154 MB sprängde både dashboard-limit (60 MB) och Whisper-limit (60 min)** — trimmad till 24 MB m4a via QuickTime.
- **Claude wrappade JSON i markdown-fences** trots `ENDAST JSON`-instruktion → `.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')` i både Edge Function och backfill-script.
- **PostgREST `PGRST201` ambiguous embed**: efter att `lesson_views` la till FK mot `profiles` blev `lessons.select('... profiles ( id, full_name )')` tvetydig → fixat med `profiles!lessons_teacher_id_fkey ( ... )` i `lib/data/teacher.ts` och `lib/data/student.ts`. Symptom: 404 "Den sidan finns inte" på lektionsdetaljen.
- **Heatmap visade 0 för alla elever** trots seedad data → orsak: strikt `chats_self_select` blockerade teacher-läsning. Fix: ovan nämnda migration.
- **Auth-användare skapade via SQL behövde proper `auth.identities`-rader** för att login skulle fungera — annars accepterade Supabase password men retournerade ingen session.

### Tekniska beslut
- **Dedikerat projekt istället för delat schema**: Bokmässan free-tier-orsaken som motiverade `elevante`-schemat i Fas 2 är borta. Eget projekt ger oss egen quota, oberoende advisors, och rena migrationsfiler.
- **`public.current_user_role()` (inte `current_role`)**: Postgres har inbyggd `current_role()` som returnerar PostgreSQL-rollen, inte vår app-roll. Kollision orsakade subtila bugs vid policy-evaluation.
- **Privacy-trade-off på chat-RLS dokumenterad i migrations-headern**: lärare kan nu läsa elevchats för insikt-vyn. För pilot mot riktig skola krävs explicit föräldra-/elev-samtycke (separat Notion-task finns). För demo med synthetic test-konton är detta säkert.
- **`react-markdown` + `remark-gfm` framför custom-parser**: ~5 kB extra bundle, men tabeller, listor och kodsnuttar i chat-svar kräver det och elev-användare uppskattar det visuellt.
- **Heatmap-design**: koncept × elev matris med Editorial Calm-färger (coral för 3+ frågor, sand-strong för 1–2, sage för "öppnat utan att fråga", surface för noll engagemang, sand-dashed för "ej öppnat"). Siffror i celler ger snabb skanning. Total-rad nederst + total-kolumn höger för aggregerade summor. Drilldowns via `InsightDrawer` (Esc + backdrop-close, translate-x-transitions).
- **Heatmap-positionen**: ovan 2-col transcript-layout. Tester visade att lärare missade insikten om den låg under transcripten.
- **Concept-extraktion happens i Edge Function** (en gång per lektion vid transkribering), inte runtime — eliminerar latency och gör konceptlistan deterministisk för samma transcript. Kostnad: en extra Claude-anrop per lektion (~2k tokens).
- **`track_lesson_view` RPC**: security definer + set search_path = '' (Supabase advisor-rekommendation). Frontend kallar den fire-and-forget från `getStudentLessonDetail` så transcripten inte blockerar på telemetry-skrivning.

### Live på
- Production: huvuddomän (Vercel auto-deploy från main)
- Demo: `https://elevante-web-git-claude-t-298637-john-gutheds-projects-e5810019.vercel.app` (preview, men har samma data som production efter merge)

---

## [Designreboot — Editorial Calm] — 2026-05-13

### Byggt
- **Tokens + fonts** (apps/web/app/globals.css, layout.tsx): Canvas bytt från `#FFFFFF` → varm ivory `#FAF7F2`. Nya accenter coral `#FF7A6B`, sage `#B8C5A6`, sand `#E8DCC4`. Fonts: DM Serif Display + Inter → **Newsreader + Geist**. Radier mjukare (12/20 px). Varma soft shadows.
- **Header + Footer + Button** (components/public/): Newsreader wordmark, sand bottom border, ink-pill primary (12 px radius, ej rund). Footer 4 kolumner med GDPR-badge. Button-variant `text` tillagd.
- **5 publika sidor omskrivna** enligt respektive Stitch screen: Landing, För skolor, För elever, Priser, Om oss.
- **AppShell + Sidebar + Topbar** uppdaterade: ivory canvas, Newsreader wordmark + Geist subtitle, sand-tint på aktiv nav-link, sign-out flyttat till Sidebar bottom.
- **Elev-app** (4 sidor + ny StudentHome/StudentLessonDetail), **Lärar-app** (TeacherDashboard + TeacherLessonDetail), **Admin** (AdminOverview + statistik + användare).
- **/sv/lararappen** (klickbar iPhone-mockup med Stitch 16/17/18).
- **Auth-sidor + /kontakt** omskrivna.
- **Nacka Gymnasium-referenser borttagna** (12 träffar) — hellre tomt än ljuga om kunder.

### QA-fynd
- Tom foto-placeholder (gradient) på landing efter Nacka-städning → hela sektionen togs bort.
- Hero-rubrik reviderades till "Elevante kommer ihåg allt du missade på lektionen."
- Copy-fix på för-elever: "Lovat." → "Lovar."

### Tekniska beslut
- 18 Stitch screens som design-källa (HTML-export funkade bara delvis pga signerade CDN-URL:er).
- Komponenter per role i `components/app/{role}/`. Root `page.tsx` delegerar bara.
- Stitch screen 12 (dedicerad upload-sida) skapades inte — upload sker inline i `TeacherLessonDetail`.
- Mobil-Expo-app sköt sig — webb-demo i `/lararappen` ersätter behovet för demo.
- i18n bibehållet via `locale === 'sv' ? ... : ...` istället för att utöka dict — mindre boilerplate för designreboot.
- Mergat till main via PR #1, #2, #3.

---

## [Fas 7 — Admin & Statistik] — 2026-04-11

### Byggt
- Data-layer `lib/data/admin.ts`: `getAdminOverview` (parallella queries), `getAdminUsers`, `getAdminSchools`, `getAdminStats` (7-dagars-bucket, status-breakdown, totals).
- Server Actions `app/actions/admin.ts`: `updateUserRole`, `createSchool` (slug-validering, 23505-duplikat).
- `/[role]/page.tsx` utökad med admin-overview (5 stat-tiles + quick-actions).
- `/[role]/anvandare`, `/[role]/skolor`, `/[role]/statistik` (weekly bar chart med rena div-bars + status-breakdown + aktiva användare per roll).
- `UserRoleForm` + `CreateSchoolForm` med `useActionState`.
- i18n utökad med `admin.*` (sv + en).
- 92 rutter.

### Tekniska beslut
- 7-dagars-bucket byggs i klienten (inte `date_trunc`) — flyttbart och lättare att testa.
- Bar chart med div-bars istället för chart-bibliotek — sparar ~80 kB.
- Inline `UserRoleForm` i tabellrad istället för modal — färre klick.
- Slug-validering på client + server.
- Dubbel skydd: redirect i `page.tsx` UTÖVER RLS.

---

## [Fas 6 — Transkription & RAG] — 2026-04-11 (delvis klar, slutförd i Fas 8)

### Byggt
- Migration `elevante_lesson_chunks_pgvector`: vector-extension i `extensions`-schema, `lesson_chunks` med 1024-dim embedding, IVFFLAT-index på cosine, RPC `match_lesson_chunks` och `match_course_chunks`.
- `lib/ai/berget.ts`: `transcribeAudio`, `embedTexts`. OpenAI-kompatibelt API. Default `KBLab/kb-whisper-large` + `intfloat/multilingual-e5-large`.
- `lib/ai/anthropic.ts`: `answerWithRag` med strikt RAG-system-prompt på svenska. `@anthropic-ai/sdk` direkt — INTE Vercel AI Gateway.
- `app/actions/chat.ts`: `ragAnswer` (embed → vector-search → Claude). Faller tillbaka till `mockedAnswer` om keys saknas.
- `env.example` utökad.

### Blockerat (löst i Fas 8)
- Audio→transcript-pipeline.
- Embeddings-leverantör inom EU.
- Anthropic API-key + GDPR-DPA.
- End-to-end manuell test.

### Tekniska beslut
- `@anthropic-ai/sdk` direkt — `CLAUDE.md` kräver Anthropic som enda AI-leverantör.
- Behåller `mockedAnswer` som fallback i kodbasen.
- IVFFLAT istället för HNSW: lägre minne, snabbare bygg.
- 1024 dim — multilingual-e5-large + Cohere multilingual + BGE-multilingual matchar samma storlek.
- `match_*_chunks` RPC:er med security definer + locked search_path.

---

## [Fas 5 — Mobilapp för lärare] — 2026-04-11

### Byggt
- Migration `elevante_audio_recordings`: bucket `elevante-audio` (2 GB), RLS strikt — bara teacher/admin. `lessons.audio_path` + `audio_duration_seconds`.
- `apps/mobile/` med Expo SDK 52 + Expo Router 4 + RN 0.76 + React 19.
- `lib/supabase.ts` med SecureStore-adapter.
- `lib/auth.ts`, `lib/lessons.ts`, `lib/queue.ts` (AsyncStorage upload-queue, base64).
- `lib/theme.ts` speglar webbens tokens.
- Skärmar: login, schedule (dagens lektioner + pending-banner), record (REC/STOP + timer).
- `pnpm.overrides` för `@types/react@19.0.14`.

### QA-fynd
- Webb-bygget bröts pga `@types/react@19.2.14` hoistad → `pnpm.overrides`.
- Supabase joins → `pickOne`-helper.

### Tekniska beslut
- Ingen `Database`-typ till mobilen.
- Audio-storage extra strikt: bara teacher/admin.
- Egen AsyncStorage upload-queue istället för `react-native-background-fetch`.
- `expo-audio` (inte deprecated `expo-av`). HIGH_QUALITY → m4a.
- Egen base64-decoder.

---

## [Fas 4 — Elevens chattgränssnitt] — 2026-04-11

### Byggt
- Migration `elevante_chat_history`: `chats` + `chat_messages` med `chat_role` och `chat_scope` enums. CHECK constraint för `lesson_id`/`course_id` per scope.
- RLS strikt privacy (lärare/admin kan ej läsa elevers chats — uppdaterat i Fas 8 för insikt-vyn).
- Data-layer `lib/data/student.ts`.
- Mockad RAG i `app/actions/chat.ts`.
- `/[role]/page.tsx` utökad med student-overview.
- `/[role]/bibliotek`, `/[role]/chat`, `/[role]/chat/[id]`.
- `ChatThread`, `LessonChatForm`, `CourseChatStarter`.
- i18n utökad med `student.*`.
- 62 rutter.

### Tekniska beslut
- Mockad RAG tills Fas 6 — UI byggs och testas innan pipeline.
- Strikt RLS-privacy på chats (modifierad i Fas 8).
- Lektionsdetaljen branchas på role i samma fil.
- Inga AI SDK / Gateway-bibliotek — Anthropic direkt.

---

## [Fas 3 — Lärarens webbvy] — 2026-04-11

### Byggt
- Migration `elevante_materials_and_storage`: `materials`, `lessons.transcript_text`, bucket `elevante-materials` (500 MB, privat).
- Data-layer `lib/data/teacher.ts`.
- Server Actions: `uploadMaterial`, `getMaterialDownloadUrl` (signed URL, 1 h TTL).
- Vyer: `/[role]/page.tsx` (3 stat-tiles + klass-grid), `/[role]/klasser`, `/[role]/klasser/[id]`, `/[role]/lektioner`, `/[role]/lektioner/[id]`.
- `LessonStatusBadge`, `MaterialUploadForm`, `MaterialList`.
- 50 rutter.

### Tekniska beslut
- Material-upload bor inom en lektion.
- Storage fil-namespace `school_id/lesson_id/file`.
- Signed URL via Server Action.
- Transcript-vy med statustext-placeholder.

---

## [Fas 2 — Auth & Schemahantering] — 2026-04-11

### Byggt
- Supabase-databas i `elevante`-schema (delade Bokmässan-projektet — migrerat till eget projekt i Fas 8).
- Tabeller `schools`, `profiles`, `courses`, `classes`, `class_members`, `course_teachers`, `timeslots`, `lessons`.
- RLS via `elevante.current_school_id()` + `elevante.current_role()` (omdöpt till `current_user_role` i Fas 8).
- `@supabase/ssr` server/browser-klient.
- Auth: `/login`, `/signup`, `/api/auth/callback`, Server Actions.
- `proxy.ts` refresh + skydd för `/app/*`.
- Role-baserad routing.
- Admin schema-upload med CSV-parser. `GET /api/schedule`.
- 30 rutter.

### Tekniska beslut
- Delar databas via eget schema (free-tier-orsak — borttaget i Fas 8).
- `@supabase/ssr` framför deprecated helpers.
- RLS via security definer-helpers.

---

## [Fas 1 — Design System & App-skelett] — 2026-04-11

### Byggt
- Baskomponenter i `components/ui/` (Button, Input, Field, Card, Modal, Toast, etc.).
- Layout: `AppShell`, `Sidebar`, `Topbar`, `PageWrapper`.
- Route group `(public)/` separerar publika layouten.
- `/app/[role]/` med dynamic role-segment + `generateStaticParams`.
- 26 rutter.

### Tekniska beslut
- Route groups istället för URL-prefix.
- Mockad auth (byts i Fas 2).
- Komponenter i `apps/web/components/`, inte `packages/ui/`.
- Inget shadcn — Hedvig-inspirerad minimalism.

---

## [Fas 0 — Publik sajt] — 2026-04-11

### Byggt
- Turborepo + Next.js 16 (App Router, React 19) + Tailwind v4.
- i18n sv/en via `[locale]` + `proxy.ts`.
- 6 sidor × 2 locales = 12 SSG-rutter.
- Resend Server Action med graceful fallback.
- JSON-LD, sitemap, robots.txt, llms.txt.
- Dynamiskt favicon + OG-bild via `next/og`.

### Tekniska beslut
- Next.js 16 från start (inte 14).
- Tailwind v4 CSS-first config.
- Full SSG.
- Egen i18n utan externa paket.
- MobileMenu utan JS (peer-checked-trick).
