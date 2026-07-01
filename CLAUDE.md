# CLAUDE.md — Elevante

> Agenternas kollektiva minne. Uppdatera efter varje godkänd fas.
> Notion är Single Source of Truth. Alla beslut loggas dit via MCP.

---

## Vad vi bygger

**Elevante** — AI-driven EdTech-plattform som spelar in klassrumsundervisning, transkriberar automatiskt och låter elever ställa frågor om innehållet via textbaserad AI.

Tagline: *"Elevante minns allt du lär dig i skolan"*

Pilot: Nacka Gymnasium, 2 000 elever.

---

## Scope

### Fas 0 — Publik sajt (elevante.se)
Marknadsföringssajt som säljer och berättar om Elevante. Byggs först — ger något att visa investerare och skolor omedelbart.

- Svenska (/sv) och engelska (/en)
- Supersnabb: Core Web Vitals grönt, SSG
- SEO-optimerad: JSON-LD, sitemap, robots.txt, semantisk HTML
- AI-agent-optimerad: llms.txt, ingen JavaScript-wall
- Sidor: startsida, om oss, för skolor, för elever, priser, kontakt

### Webb-app — tre roller
**Lärare:** Lektionsöversikt, materialuppladdning, transkriberingsvisning
**Elev:** Chat-gränssnitt (strikt RAG), lektionsbibliotek, provplugg, AI-övningsprov, lärprofil
**Admin:** Schemauppladdning, statistik, användarhantering

### Mobilapp — lärare only
Schema-sync → automatiskt lektionsförslag → REC → STOP → auto-upload. Max 2 tryck.

### Inte i V1
Röst (V2), video/avatar (V3), hybrid RAG (V2+), föräldraapp (V2)

---

## Design

**Läs alltid DESIGN-sidan i Notion innan du bygger UI:**
`https://www.notion.so/33e84c8f289e81ec869fe7e6a91585f9`

Nyckelprinciper (Editorial Calm — designreboot 2026-05-13):
- Känsla i ett ord: "Andningsbart". Rent, generöst, modernt — motsatsen till röriga, föråldrade skolverktyg.
- Inspiration: Linear, Arc, Claude.ai, Are.na, Notion. INTE hedvig.com (för corporate-kallt), INTE Duolingo (för gamified).
- Färger: ivory canvas #FAF7F2 (ALDRIG pure white), ink #1A1A2E, accent #4F7FFF (sparsamt), coral #FF7A6B, sage #B8C5A6, sand #E8DCC4.
- Typografi: Newsreader (rubriker, editorial serif) + Geist (brödtext/UI) + JetBrains Mono (transkript). Ersätter DM Serif Display + Inter.
- Ton: Varm och direkt. Aldrig formell, aldrig påklistrat ungdomlig. Tilltal: du.
- Motion: Subtila, cubic-bezier(0.22, 1, 0.36, 1), 240–320ms. `prefers-reduced-motion` respekteras.

---

## Teknisk stack

| Lager | Val |
|-------|-----|
| Monorepo | Turborepo |
| Frontend (webb + publik sajt) | Next.js 16 (App Router, React 19, `proxy.ts`) + Tailwind CSS v4 |
| Mobilapp | React Native + Expo |
| Backend | Next.js Server Actions + Supabase Edge Functions (FastAPI planerad V2) |
| Databas | Supabase (PostgreSQL + pgvector + Storage + Auth) |
| AI — ALL generering | **Claude API (Anthropic) — enda AI-leverantören** |
| Transkribering | KB-Whisper via Berget AI (svenska, GDPR) |
| Hosting (webb) | Vercel (auto-deploy från GitHub) |
| Hosting (backend/AI) | Vercel Functions (arn1, Stockholm) + Supabase Edge Functions + Berget AI (EU, GDPR) |
| Versionshantering | GitHub |
| Projekthantering | Notion via MCP |

**Regel:** Ingen annan AI-leverantör än Anthropic används någonstans i kodbasen.

---

## Notion

- **Uppgifter:** `collection://3a234622-3ccb-46da-8266-46ae6fb78f4c`
- **CHANGELOG:** `https://www.notion.so/33e84c8f289e81dba880f4dd6e781792`
- **ARCHITECTURE:** `https://www.notion.so/33e84c8f289e8191b9b1d2e35309da3f`
- **DESIGN:** `https://www.notion.so/33e84c8f289e81ec869fe7e6a91585f9`
- **Root:** `https://www.notion.so/19884c8f289e80cb9fbccf86dc860aef`

Uppgifts-schema: Uppgift (title), Status (Att göra/Pågår/Klar), Kategori (Produkt/Tech/Marknad/Juridik & GDPR/Investering/Övrigt), Prioritet (Hög/Medium/Låg), Deadline (date)

---

## Arkitekturprinciper

- **GDPR-first:** Inget persondata utanför EU
- **Claude only:** All AI via Anthropic API
- **Strikt RAG:** AI svarar bara på lektionsinnehåll, aldrig påhittat
- **Schema-driven app:** Läraren trycker REC, appen vet resten
- **Minimal datalagring:** Råljud raderas efter transkribering
- **i18n från dag ett:** Inga hårdkodade strängar
- **Responsivt:** 375px → 1440px+

---

## Datamodell

```
School → Classes → Courses → Lessons
  Lessons: Transcript, Materials, Embeddings
User: elev / lärare / admin
Schedule → Timeslots
```

---

## Projektstruktur

```
elevante/
├── apps/
│   ├── web/          # Next.js — publik sajt + app (elev, lärare, admin)
│   └── mobile/       # React Native + Expo — lärare
├── supabase/
│   └── functions/    # Edge Functions (transcribe-lesson pipeline)
├── packages/         # Delade paket (extraheras vid behov)
├── CLAUDE.md
└── turbo.json
```

---

## QA-krav

- [ ] WCAG AA på alla UI-komponenter
- [ ] Inga hårdkodade strängar (t('key'))
- [ ] Zod-validering på alla Server Actions (Pydantic om FastAPI läggs till i V2)
- [ ] Inga TypeScript `any` utan kommentar
- [ ] Responsivt: 375px, 768px, 1280px, 1440px
- [ ] Inga TODO-kommentarer
- [ ] Core Web Vitals grönt på publik sajt
- [ ] RAG svarar aldrig utan källhänvisning
- [ ] Ingen annan AI än Anthropic i kodbasen

---

## Fasminne

### Fas 0 — Publik sajt: KLAR (2026-04-11)
Next.js 16 + Tailwind v4 i `apps/web/`. Svenska + engelska via `[locale]` och `proxy.ts`. 6 sidor × 2 locales = 12 SSG-rutter. Resend Server Action (graceful fallback). JSON-LD, sitemap, robots, llms.txt, dynamiska OG/favicon via `next/og`. Push till `guthed/elevante`. Vercel-länkning + domänkoppling ligger som separata uppgifter.
### Fas 1 — Design System & Skelett: KLAR (2026-04-11)
Baskomponenter i `apps/web/components/ui/` (Button, Input, Textarea, Select, Field, Card, Badge, Avatar, Spinner, Divider, Modal, Toast, EmptyState, LoadingScreen). Layoutkomponenter i `apps/web/components/app/` (AppShell, Sidebar, Topbar, PageWrapper). Publika sajten flyttad till route group `(public)/` så appen kan ha egen layout. `/app/[role]/` med dynamic role-segment (student/teacher/admin) och mockad auth. 26/26 sidor statiskt genererade. Noindex på alla /app/-rutter.
### Fas 2 — Auth & Schemahantering: KLAR (2026-04-11)
Supabase Auth via @supabase/ssr i `apps/web/lib/supabase/`. Tabeller bor i `public`-schemat i ett dedikerat Supabase-projekt (`msqfuywpbrteyrzjggsw`, eu-central-2/Zurich). RLS på alla tabeller, helpers via security definer (`public.current_school_id()`, `public.current_user_role()` — sistnämnda undviker kollision med Postgres-inbyggd `current_role()`). Login/signup/signOut Server Actions. `proxy.ts` refreshar session + skyddar `/app/*`. Role-baserad redirect i `/app/page.tsx`. Admin CSV-upload för timeslots + `GET /api/schedule`.
### Fas 3 — Lärarens webbvy: KLAR (2026-04-11)
`materials`-tabell + `lessons.transcript_text/transcript_updated_at` + privat Storage-bucket `elevante-materials` (500 MB, RLS per skola). Data-layer i `lib/data/teacher.ts` för översikt, klasser, lektioner och detaljvyer. Server Actions: `uploadMaterial` (validering + sanering + signed URL), `getMaterialDownloadUrl`. Vyer: `/teacher` översikt med stat-tiles, `/teacher/klasser[/id]`, `/teacher/lektioner[/id]` med transkript-placeholder + materials-card. `LessonStatusBadge`, `MaterialUploadForm`, `MaterialList`.
### Fas 4 — Elevens chattgränssnitt: KLAR (2026-04-11)
`chats` + `chat_messages`-tabeller med strikt RLS-privacy (lärare och admin kan ej läsa elevchats). Data-layer i `lib/data/student.ts`. Mockad RAG i `app/actions/chat.ts` (riktig pipeline aktiverad i Fas 6). Vyer: `/student` översikt, `/student/bibliotek` med kurs-filter, `/student/chat` landning + history, `/student/chat/[id]` full tråd. Lektionsdetaljen branchad på role: student ser sammanfattning + chat-CTA, lärare ser upload-form. Komponenter: `ChatThread`, `LessonChatForm`, `CourseChatStarter`.
### Fas 5 — Mobilapp: KLAR (2026-04-11)
`apps/mobile/` med Expo SDK 52 + Expo Router 4 + RN 0.76 + React 19. Privat audio-bucket `elevante-audio` (RLS bara teacher/admin). Supabase-klient med SecureStore-adapter (Keychain/Keystore). AsyncStorage upload-queue med base64 → Storage. Skärmar: login (KeyboardAvoidingView), schedule (dagens lektioner från timeslots, pull-to-refresh, pending-banner), record (mörk bakgrund, REC/STOP, expo-audio HIGH_QUALITY, mm:ss timer). pnpm.overrides på @types/react för att hålla webb och mobil i sync. Manuell test i Expo Go ligger som separat uppgift.
### Fas 6 — Transkription & RAG: KLAR (2026-05-14)
`lesson_chunks` med pgvector (1024-dim, IVFFLAT-index) + RPC `match_lesson_chunks` / `match_course_chunks` (security invoker — RLS skyddar). `transcribe-lesson` Edge Function (Deno) kör hela pipelinen: download audio → KB-Whisper transkribering (Berget AI) → chunking (~500 tecken, 80 overlap) → embeddings (Berget AI `intfloat/multilingual-e5-large`) → insert i `lesson_chunks` → AI-genererad summary/frågor/topic via Claude → uppdaterar `lessons` → raderar audio (GDPR). AI-adaptrar i `lib/ai/`: `anthropic.ts` med strikt RAG-system-prompt + chat-svar med källcitat, `berget.ts` OpenAI-kompatibelt embeddings-API. `app/actions/chat.ts` använder riktig RAG som primär väg, faller tillbaka till `mockedAnswer` om keys saknas.
### Fas 7 — Admin & Statistik: KLAR (2026-04-11)
Data-layer i `lib/data/admin.ts` (overview, users, schools, stats med 7-dagars-bucket). Server Actions: `updateUserRole`, `createSchool`. Vyer: `/admin` översikt med 5 stat-tiles, `/admin/anvandare` med inline `UserRoleForm`, `/admin/skolor` med `CreateSchoolForm`, `/admin/statistik` med weekly bar chart (div-bars utan dep) + status-breakdown + activity-totals. 92 rutter byggda.
### Polering — Edge Function-deploy + UX + A11y: KLAR (2026-04-11)
`supabase/functions/transcribe-lesson` deployad (Deno, ACTIVE). Mobilens upload-queue triggar `functions.invoke('transcribe-lesson')` fire-and-forget. `loading.tsx`/`error.tsx`/`not-found.tsx` på båda route groups. Lokaliserad skip-to-content-länk i båda layouterna.
### Designreboot — Editorial Calm: KLAR (2026-05-13)
Designsystemet bytt till "Editorial Calm" baserat på 18 Stitch-screens. Tokens i `globals.css`: ivory canvas #FAF7F2, coral/sage/sand-accenter, mjuka varma skuggor. Fonts Newsreader + Geist (ersätter DM Serif Display + Inter). 5 publika sidor + auth + kontakt omskrivna; AppShell/Sidebar/Topbar + alla app-vyer per roll i `components/app/{role}/`. Ny `/lararappen` med klickbar mobil-demo (`MobileAppDemo`) — säljarverktyg. Nacka Gymnasium-referenser borttagna från publika sajten (hellre tomt än ljuga om kund). Live på `elevante-web.vercel.app`.
### Fas 8 — Dedikerat Supabase + skarp AI-pipeline + lärar-insikt: KLAR (2026-05-14)
Dedikerat Supabase-projekt (`msqfuywpbrteyrzjggsw`), tabeller i `public`-schemat, konsoliderade migrationer i `supabase/migrations/`. AI-pipelinen skarp end-to-end — `transcribe-lesson` v4 verifierad på riktig inspelad lektion. Demo-konton seedade (loggade i Notion "Nycklar"). Student-lektionsvy med AI-`summary`/`suggested_questions`/`ai_generated_topic`. Lärar-insiktsvy: `concepts` på `lessons` + `chat_messages`, `lesson_views`-tabell, `InsightHeatmap` (förståelse-karta koncept × elev). RLS-policy låter lärare/admin i samma skola läsa elevchats för insikt-vyn.
### Demo-iteration — Provplugg, syntetiska lektioner, citat-kort: KLAR (2026-05-15)
Provplugg: chat-scope `selection` + `chats.lesson_ids` — eleven chattar mot ett urval lektioner inför prov (`/student/provplugg`, `ExamPrepPicker`). 6 syntetiska Ekologi-lektioner seedade (`lessons.is_synthetic`); Edge Function tar valfri `transcript_text` och hoppar då över audio/Whisper. Döda källpillar ersatta med citat-kort som visar faktiska transcript-utdrag. `SidebarNav` markerar aktiv route via `usePathname()`. `CHANGELOG.md` + `ARCHITECTURE.md` tillagda i repot, speglar Notion.
### Övningsprov & lärprofil: KLAR (2026-05-15)
AI-genererat övningsprov från Provplugg-urval (`practice_tests`; flerval rättas deterministiskt i kod, fritext av Claude). "Dela med läraren" → lärarvy `/teacher/prov[/id]`. Lärprofil (`learner_profiles`, RLS bara eleven själv) destillerar styrkor/utvecklingsområden ur rättade prov och matas in i provrättning + chattsvar. Persona-loop: prov rättas → profil byggs om → nästa rättning anpassas. Elevsidor `/student/prov`, `/student/profil`.
### Klassprov — lärar-författade prov: KLAR (2026-06-24)
Nya tabeller `class_tests` + `class_test_submissions` (RLS skolscopat). Läraren väljer klass, lektionsurval, antal frågor och fördelning stängda/öppna/resonerande via reglage; largest-remainder-algoritm garanterar exakt antal. `generateClassTest` anropar Claude mot transkript → frågor sparas som jsonb i `class_tests.questions`. Flöde: draft → publicera → elev gör provet (`ClassTestRunner`) → AI-rättar (`gradePracticeTest`, flerval i kod, fritext/resonerande av Claude) → lärare granskar/justerar i `GradeReview` → släpper per elev. Security-definer-RPC:er: `get_published_class_test` (strippar facit), `get_my_submission_result` (release-gate — null tills `released_at` satt), `get_class_test_for_grading`, `list_student_class_tests`. Routes `/teacher/klassprov[/id[/submissionId]]` + `/student/klassprov[/id]`. Återanvänder `TestResult`-komponenten och `typeLabel`-hjälparen. Zod infört på de nya Server Actions.
### Rektor- & lärarsidor (interaktiv webb): KLAR (2026-06-25)
Delat showcase-bibliotek i `components/showcase/` (`Reveal`, `ZoomableShot`, `ChatDemo` flyttade från `app/skolan/`; `LoopVisuals` med REC/ljudvåg/chatt-visualerna extraherade ur startsidan — återanvänds på startsidan, `/rektor`, `/larare`). `/rektor` ombyggd från bildspel till scroll-sida (Editorial Calm) med godkänd skollingo-copy; bildspelet bevarat på `/rektor/deck` (länk "Presentationsläge →"). Ny `/larare` på lärarens planhalva (tolkningsföreträde, "du bestämmer när", studiero, extra anpassningar). **Roller i scope: bara elev + lärare — ingen rektors-/skoladmin-vy.** Förståelse-kartan är en lärarvy; rektorssidan säljer "det du kan erbjuda dina lärare" (§09 "Dina lärare ser…", aldrig en granskningspanel). Aktuella, ramfria appskärmdumpar i `public/rektor/` (beskurna via `scripts/crop-app-shots.py` — auto-detektion av ivory-canvas). `--color-sage-deep` (#566b47) definierad i `globals.css` (saknades; sage-accenter föll till ink). `/skolan` redirectar till `/rektor` (307). Båda sidorna `noindex`, svenska only (utanför `[locale]`). Spec + plan i `docs/superpowers/`.
### Skol-CRM — Notion som CRM + Skolverket-sync: KLAR (2026-07-01)
Evolverade det befintliga inbound-kampanjsystemet till ett enat CRM. Nytt server-only dataset `lib/data/school-units.json` (6 652 enheter, alla skolformer) via `scripts/fetch-school-units.ts`; publika `schools.json` (gymnasium) orörd. `school_prospects` fick `skolform/created_via/last_synced_at/sync_status/sync_error`; ny `school_sync_log` (migration `20260701120000_school_crm.sql`, applicerad mot prod `msqfuywpbrteyrzjggsw`). `lib/skolverket.ts`: `searchSchoolUnits` (server-side filtrering), `fetchPupilCount(code, skolform)`, fetch-retry med timeout. Icke-destruktiv Notion-sync i `lib/notion.ts`: maskin-props skrivs alltid, CRM-props (återanvänder befintliga `Status`-pipelinen Ny→Kontaktuppgift lämnad→Kontaktad→Kvalificerad→Vunnen→Tappad, samt Owner/Anteckningar/Nästa steg/Senast kontaktad/Kontaktväg) rörs ALDRIG av synken; dedup via `queryNotionProspectByCode` (>1 → Synkstatus "Behöver kollas"); `queryPrioritizedProspects` re-synkar Status ∉ {Ny, Tappad}. Delad `lib/prospects.ts` `syncProspect` används av inbound (`app/actions/campaign.ts`), admin (`app/actions/crm.ts`, Zod+admin-guard) och cron. Admin CRM-vy `app/[locale]/app/[role]/crm/` (`/sv/app/admin/crm`) + `components/app/admin/{CrmSearch,CrmProspectList,ResyncButton}.tsx`, nav/i18n-wiring. Nattlig cron `app/api/cron/sync-prospects/route.ts` (`0 3 * * *`, arn1, MAX_PER_RUN 20, CRON_SECRET-gate). Notion-properties skapade i leads-DB (📋 Intresseanmälningar, återanvänder `Status`). Enda kvarvarande aktiveringssteg: `CRON_SECRET` i Vercel.

---

## Ekonomi

- 500 SEK/elev/år | ~141 SEK driftskostnad | ~71,7% marginal
- Pilot: 2 000 elever → 1 MSEK intäkt / 283 KSEK kostnad
- Skala till 440 000 nordiska elever
