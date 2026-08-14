# CLAUDE.md — Elevante

> Agenternas kollektiva minne. Uppdatera efter varje godkänd fas.
> Notion är Single Source of Truth. Alla beslut loggas dit via MCP.

---

## Vad vi bygger

**Elevante** — AI-driven EdTech-plattform som spelar in klassrumsundervisning, transkriberar automatiskt och låter elever ställa frågor om innehållet via textbaserad AI.

Tagline: *"Elevante minns allt du lär dig i skolan"*

Pilot: **Amerikanska Gymnasiet** — LOI påskrivet. Koncernen omfattar 5 skolor / ~2 000 elever; piloten startar hösten 2026 med 2–3 klasser och expanderar efter validering. Nacka Gymnasium är ett parallellt spår — dialog med rektor pågår.

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
### Publik kampanjsida `/try` — upplev utan konto: KLAR (2026-07-07)
Publik, indexerbar, inloggningsfri sida (`app/[locale]/(public)/try/`, sv+en) där vem som helst upplever kärnloopen — skild från `/demo` (noindex, skriptad). Server-only lektionsbibliotek `lib/try/lessons.ts` (6 syntetiska Ekologi-transkript i `lib/try/transcripts/`, styckesegmentering med pseudo-tidsstämplar för citat), tvåspråkig copy `lib/try/copy.ts`. Guidad trestegsväg (`LessonPicker` → `ChatStep` → `TestStep`, orkestrerad av `TryExperience` + `StepRail`) — **chatten leder**: prov-inbjudan och steg ③ i progress-raden döljs tills eleven fått ett svar. Tre stateless-rutter `/api/try/{chat,test,grade}` (Zod) återanvänder `answerWithRag` / `generatePracticeTest` / `gradePracticeTest` (valfri `locale`-param tillagd i `lib/ai/anthropic.ts`, default sv). AI svarar på besökarens locale; **källcitat förblir svenska** (äkta klassrumsmaterial) och hittas även på engelska via svenska koncept-taggar som språkbrygga. **Facit-skydd:** provfrågorna ligger i en **AES-256-GCM-krypterad** token (`lib/try/token.ts`) — base64+HMAC läckte facit (kodning ≠ kryptering); återanvänder `INVESTOR_DECK_SECRET` (`TRY_TEST_SECRET` valfri override). Best-effort rate-limit (`lib/try/ratelimit.ts`), inputtak, graceful offline-fallback. SEO: `/try` i `PAGE_PATHS` (sitemap+hreflang) + nav-länk (Prova/Try). Bugfix på köpet: `LanguageSwitcher` använder nu `usePathname()` — den statiska layouten matade bara `/{locale}`, så språkbyte kastade tillbaka till startsidan på *alla* publika sidor. Live på `www.elevante.se/{sv,en}/try`. Spec+plan i `docs/superpowers/`.
### `/try`-delning — tipsa en kollega: KLAR (2026-07-11)
Delnings-formulär i det säljande avslutet på `/try` (alltid synligt, tvåspråkigt, `ShareTeaser` med `useActionState`). Server Action `shareTry` (`app/actions/try-share.ts`, Zod-liknande manuell validering): honeypot (`website`) → tyst success, kräver namn + två giltiga *olika* mejladresser, IP-rate-limit 5/tim. **Primär logg = Supabase `try_shares`** (migration `20260711120000_try_shares.sql`, RLS, service-role-skrivning som CRM:et — insert fäller delningen vid fel; handskriven typ i `database.ts`). **Mejl via Resend** (`hej@elevante.se`, `replyTo` = avsändaren, graceful fallback utan nyckel). **Notion best-effort** (`lib/try/share-log.ts` → `logShareToNotion` skriver Mottagare- + Avsändare-rad i egen DB "📤 Elevante – Delningar" via `NOTION_TOKEN` + `NOTION_SHARES_DATABASE_ID`; en 404/fel fäller aldrig delningen). Verifierat: Supabase-insert skarp mot prod. **Två prod-setupsteg för Notion-loggning** (blockerar inte delningen): (1) sätt `NOTION_SHARES_DATABASE_ID=ea0d17e0a4e6401ead16b2bba426b57a` i Vercel; (2) koppla Delningar-DB:n till app-integrationen "Claude sync" i Notion (app:en skriver via en annan integration än den MCP:n skapade DB:n med — kan ej ges access via API). Spec+plan i `docs/superpowers/`.
### E-postmotor → Loops (all transaktionell mejl): KLAR (2026-07-12)
Bytte e-postmotor från Resend till **Loops** för all transaktionell mejl. Bakgrund: `/try`-delningens mejl gick aldrig fram — koden inspekterade aldrig `error`-returen från Resend (SDK:t kastar inte vid API-fel), och Resend-domänen var sannolikt aldrig verifierad; **Loops-domänen `elevante.se` är verifierad**. Server-only adapter `lib/loops.ts` (raw `fetch`, timeout + retry, `sendLoopsTransactional` returnerar `boolean`, kastar aldrig; `upsertLoopsContact`/`sendLoopsEvent` följer med okopplade för framtida lifecycle). Tre migreringar: `contact.ts` (leveranskritisk — Loops-miss ⇒ `error: 'generic'`), `try-share.ts` (best-effort — Supabase är loggen), `lib/investor-notify.ts` (best-effort). Copy bor i Loops-mallarna; koden skickar bara data. **Resend borttaget helt** (dep + kod + env); integritetspolicyns biträdesredovisning uppdaterad (Resend → Loops). Loops-mallar: kontakt `cmr2npu5t01i00j2t0g3p6zf5` (variabler `topic/name/school/email/message`, svara via `mailto:{{email}}`), investerar-notis `cmr2npvso01k80j0tktnxoif3` (`headline/investor/locale/maxScroll`), samt två nya delnings-mallar sv+en (duplicerade från skol-kontaktmejlet, copy-i-mall, variabler `senderName/message/url/senderEmail`, reply-to `{{senderEmail}}`). **Prod-env:** `LOOPS_API_KEY` + `LOOPS_CONTACT_TRANSACTIONAL_ID` + `LOOPS_SHARE_TRANSACTIONAL_ID_SV/_EN` + `LOOPS_INVESTOR_TRANSACTIONAL_ID`. Obs GDPR: Loops (loops.so) är US-baserat — samma cross-border-läge som Resend hade, men värt att stämma mot "inget persondata utanför EU". Spec+plan i `docs/superpowers/`.
### Publik copy — priser, hjälterubriker, källbelagda påståenden: KLAR (2026-07-27)
`llms.txt` följer llmstxt.org-specen (Markdown-länkar, inte råa URL:er). Enhetligt coral-accentmönster i alla publika rubriker (lead i ink + poäng-tail i italic coral). Prissidan byggd om två gånger — priskort först, sedan skrotat till ett **editorial prisblock** (hårfina linjer i stället för box; kortet lånade jämför-och-välj-konventionen från ett problem sidan inte har). Oförankrade påståenden ersatta med **källbelagda siffror** på både `/priser` och `/vad-kostar-elevante` (Läromedelsbarometern 2023, SCB, Sveriges Lärare 2024, Skolverket 2024) med synlig källrad. Momsvy kommunal/fristående förberedd i `lib/pricing.ts` (`vatBreakdown`) men **gated på `VAT_BREAKDOWN_ENABLED = false`** tills revisor/Skatteverket verifierat satserna — 6 %-schablonen subtraheras medvetet inte. Hjälterubriker enhetliga via `.hero-title` / `.hero-title-split` i `globals.css` (ersätter sju handtunade `clamp()` på elva sidor). Öppet: GDPR-formuleringen i data-FAQ:n bör juristgranskas; momsvyns rendering är inte ögongranskad.
### Strömmande chatt + investerardeckets grundarbios: KLAR (2026-08-03)
Elevens chatt strömmar nu svaret: ~16 s blank väntan → ~2 s till första ordet. Ny SSE-rutt `/api/chat/stream` (auth + Zod); **all cookie-beroende Supabase-åtkomst sker före strömmen öppnas** annars hamnar `cookies()` utanför request-scopet. `startChat` redirectar direkt utan att generera; `ChatThread` upptäcker det obesvarade meddelandet och strömmar in svaret (resume läser frågan ur DB, inte från klienten). Hämtningen bruten ut till `lib/rag/retrieve.ts` så Server Action och rutt ger identisk kontext; `decodeAnswerSoFar` i `lib/ai/stream-json.ts`. `streamRagRaw` tar `personaSummary` (lärprofilen tappades annars) och `concise` är opt-in (var `/try`-specifik). `sendMessage` kvar som formulärets action → fungerar utan JavaScript. Känd begränsning: sidofältets historik uppdateras först vid navigering. Investerardecket: utbyggda grundarbios + highlights-fält; `DeckNav` från `useEffect`+`setState` till `useSyncExternalStore`.
### Avatarer — porträtt på demo-elever: KLAR (2026-08-04)
Syntetiska (AI-genererade) porträtt på appens 8 demo-elever, demo-läraren Anna och investerardeckets 6 demo-elever — **läraren ska känna igen sin klass**, initialer gör en klasslista svår att scanna. Register `lib/avatars.ts` (namn → `/avatars/<slug>.jpg`); `Avatar` slår upp namnet automatiskt, ny `xs`-storlek, `loading="eager"`, faller tillbaka på initialer så riktiga skolor ser exakt som förut. Inkopplat i förståelse-kartan, elevpanelen, konceptfrågelistan, klassprovsinlämningar och delade övningsprov (klasslista/admin/sidomeny fick det gratis via `Avatar`). Avataren renderas **bara när porträtt finns**, och heatmapens namnkolumn breddas 120→152 px bara då — därför kunde porträtt läggas in utan att röra deckets utseende innan dess elever hade bilder. 12 reservansikten i `assets/avatar-pool/` med README (utanför `public/`, publiceras inte — verifierat 404 i prod). Könsmässigt tvetydiga ansikten används inte. Fallgrop: identifiera bilder **en och en** — attributionen glider när flera returneras i samma svar; och Next dev cachar optimerade bilder både i minnet och i `.next/cache/images`, så verifiera bildinnehåll mot råfilen, inte mot sidrenderingen.
### Skol-provisionering — admin-invite, klasser/kurser, elevimport: KLAR (2026-08-12)
Ersätter manuell SQL-seedning av skolor/admins/klasser/kurser/lärare/elever med riktiga in-app-flöden. **Inbjudan:** `lib/admin/invite-user.ts` (`inviteUserCore`, service-role `auth.admin.generateLink`) delas av enstaka inbjudan (`inviteUser`-action, `InviteUserForm` på `/admin/anvandare`) och bulk-CSV (`importStudents`, `ImportStudentsForm`, tak 40 rader — se nedan). **Säkerhetsfynd under bygget:** `createSchool`/`getAdminSchools` gick mot RLS som strukturellt aldrig kunde lyckas för en ny skola — flyttade till service-role. Det avslöjade att `/admin/skolor` bara gatades på `role==='admin'`, ingen skillnad mellan Elevante-personal och en kunds egen admin — ny `profiles.is_staff`-flagga gatar nu den sidan, `createSchool`, och bootstrap-grenen i `inviteUser`. En efterföljande slutgranskning hittade att `is_staff` själv var self-grantable via den redan befintliga `profiles_update_self`-policyn (vem som helst kunde PATCHa sin egen rad) — ny trigger `protect_is_staff` (BEFORE INSERT OR UPDATE) blockerar alla icke-service-role-ändringar av kolumnen. **`/admin/crm` och `/admin/intresse` är borttagna helt** (2026-08-12, separat produktbeslut) — Notion är enda ytan för försäljning/leads, elevante.se hanterar bara pilot-/betalkunder; `is_staff` gatar numera bara `/admin/skolor`. **Migrationskonflikt:** prod hade redan en egen, ej i repot dokumenterad `provisioned_login`-modell (`profiles.status`, `user_invites`-tabell, domänbaserad OAuth-scaffolding — applicerad 2026-08-07, aldrig kopplad till någon applikationskod, 0 rader i `user_invites`) som bytte ut samma `handle_new_auth_user()`-trigger. Fyra migrationer utan lokal fil backfyllades från `supabase_migrations.schema_migrations.statements`; en ny migration förenar de två avsikterna (admin-inbjudan → `status='active'` direkt, self-signup → `status='pending'`, oförändrat beteende idag eftersom ingen kod läser `status` än). `user_invites`/`identity_domain` rörs inte, ligger kvar oanvända. **Klasser/kurser:** `/admin/klasser` (delad route med lärarvyn) + `/admin/kurser` — RLS tillät redan admin-skrivning skol-scopat. Radering blockeras om klass/kurs har lektioner ELLER schemarader (`timeslots` missades i första versionen — samma tysta cascade-risk som lektioner). **Inloggningslänk är strukturellt implicit flow:** en service-role-genererad länk saknar en klientbrowser med `code_verifier`, så PKCE är uteslutet — `access_token`/`refresh_token` kommer alltid som URL-fragment (`#...`), oläsbart för allt serverkod (route handler, Server Component, middleware). Klientsidan `/[locale]/auth/confirm` (`ConfirmClient.tsx`) läser `window.location.hash`, skrubbar URL:en direkt via `history.replaceState`, och sätter sessionen via `auth.setSession()`. **Bugfix (2026-08-12):** en redan inloggad session i webbläsaren kunde kollidera med `setSession()` (GoTrues bakgrundsuppdatering av den gamla sessionen tävlade med anropet) och hänga sidan för evigt på "Loggar in…" — löst med `signOut({scope:'local'})` (ren cookie-städning utan nätverksanrop) innan den nya sessionen sätts, plus en 8-sekunders timeout som tvingar fram felläget om något ändå hänger. Ett kvarstående, oförklarat fall: hos en specifik lokal Safari-installation exekverade sidans JavaScript aldrig alls (tom konsol, ingen HMR-koppling) — kvarstod även med innehållsblockeraren avstängd, men samma länk fungerade felfritt i Chrome; bedöms vara lokal Safari-/systeminnehållsfiltrering (Skärmtid eller kvarvarande Content Blocker-lista), inte en applikationsbugg. **E-post går via Loops, inte Supabases inbyggda mejl:** Supabases rate limit blockerade riktiga inbjudningstester efter några försök, och Loops var redan appens mejlmotor för allt annat — `inviteUserCore` bygger `actionLink` via `generateLink` (utan att skicka Supabase-mejl) och postar den själv via `sendLoopsTransactional` med variabler `recipientName/roleLabel/schoolAndClass/inviteUrl`. Lyckas `generateLink({type:'invite'})` men Loops-sändningen faller, vägrar GoTrue permanent nya invite-försök för mejladressen (känd uppströms-begränsning) — löst med fallback till `type:'magiclink'` som fungerar oavsett bekräftelsestatus och ger samma hash-token-länkformat. **Två Loops-mallar skapade** (duplicerade från kontaktmallen, samma varumärkesstil): "Inbjudan till Elevante (SV)" `cmspyliya04r80jwtjmwnh1ao`, "Elevante invitation (EN)" `cmspywteo05d20jydp5pifee4`; `LOOPS_INVITE_TRANSACTIONAL_ID_SV`/`_EN` satta både i `.env.local` och i Vercels prod-miljövariabler (verifierat i dashboarden). **Verifierat end-to-end mot prod:** riktig admin-inbjudan → riktigt Loops-mejl (`200 success:true`, bekräftad leverans i Loops metrics-logg) → riktig inloggning via länken → rätt konto/roll/skola renderat i appen — testat i Chrome. **DB-status:** samtliga migrationer (school_provisioning, admin_staff_flag, protect_staff_flag_and_prospect_rls, reconcile_handle_new_auth_user, activate_known_staff) är applicerade mot prod `msqfuywpbrteyrzjggsw`; `john@guthed.se` är enda `is_staff=true`-kontot. De fyra ursprungliga testkontona (`guthed(+alias)@gmail.com`, "Test Testsson"–"Fyra") raderades (cascade via `on delete cascade` från `auth.users`); `guthed@gmail.com` återskapades som rent elev-testkonto på Amerikanska gymnasiet, sedan raderades även det (bara för test, ingen riktig användare). Plan i `docs/superpowers/plans/2026-08-11-school-provisioning.md`.
### Skol-provisionering — efterföljande självgranskning: KLAR (2026-08-12)
En andra granskning ("är vi hemmablinda?") hittade tre kvarvarande luckor, alla åtgärdade och verifierade i webbläsare mot lokal dev-server. **1) Publik självregistrering:** `/signup` stod fortfarande öppen och länkad från login sedan Fas 2 — motsade den nya inbjudningsmodellen och gav orphanade `role='student', school_id=null`-konton utan förklaring. Hela rutten borttagen (Next 404:ar automatiskt), `signUp`-server-action stängd som extra skydd, länken borttagen från `/login`. **2) Ingen borttagning av användare:** `removeUser`-action (`app/actions/admin.ts`) — skol-scopat precis som `updateUserRole`, blockerar självborttagning och borttagning av skolans sista admin, `auth.admin.deleteUser` cascadar till `profiles`. "Ta bort"-länk i `UserRoleForm`, döljs på egen rad. **3) `is_staff` bus factor 1:** ny `setStaffAccess`-action + staff-only kort på `/admin/skolor` (`StaffAccessForm.tsx`, `getStaffAccounts` i `lib/data/admin.ts`) — is_staff-konton kan nu ge/återkalla behörighet till andra via e-post, service-role-skrivning (den avsedda öppningen i `protect_is_staff`-triggern), kan inte återkalla sin egen. Två commits (`2a8a683`, `eca1df1`), inte pushade/mergade än.
### Sökordsinsikter → innehållsutkast + triage-påminnelse: KLAR (2026-08-13)
`/api/cron/sokordsinsikter` (GSC+GA4 veckovis, Google Trender manuellt) får nu en väg till
innehåll: en dokumenterad process (Claude-minne `sokordsinsikter-content-drafts`) skriver
SEO/AEO-anpassade utkast på begäran som `🔸 UTKAST`-undersidor under ✍️ Blogg, grundade i
💡 Argument-databasen (104 argument/34 rapporter) + befintliga inlägg + källbelagda externa
siffror vid behov. Fyra prioriteringshinkar (snabb vinst/riktig lucka/AEO-först/timing) motiverar
varje val. Ett schemalagt veckojobb (`scheduled-tasks`, måndagar 08:00 lokal tid — kräver att
Claude Code-appen är öppen, kör annars vid nästa uppstart) föreslår kandidatrader och flaggar
teman utan argumenttäckning — notifierar bara, skriver aldrig något själv. Verifierat med en
skarp testkörning: utkast skrivet för "ai-bot för lärare" (två redaktionella granskningsvarv,
en felattribuerad källa rättad), och en funktionell körning av veckojobbets promptlogik som
avslöjade och löste en riktig bugg (Tema-fältet tomt på nya rader). Ingen ny app-kod. Spec+plan
i `docs/superpowers/`.
### Mobil LCP-fördröjning — diagnos + tre fixar: KODAT, VÄNTAR PÅ DEPLOY-VERIFIERING (2026-08-14)
PageSpeed Insights (desktop 99/96/96/92) ledde till en mobilmätning som visade Prestanda 81 och
LCP 4,5s trots TTFB 4ms — hela fördröjningen satt i "elementrendering" (3,1s) på startsidans
hero-transkript (`LessonTranscriptDemo`). Lokal Lighthouse-baseline (`docs/superpowers/plans/
2026-08-13-mobil-lcp-fordrojning.md`) visade `scriptEvaluation` dominera huvudtrådsarbetet
(3,8s) — pekade mot för mycket JS att tolka/köra innan målning, inte en enskild blockerande
resurs. Tre commits på branchen `worktree-mobil-lcp-fordrojning` (ej pushad/mergad än): **(1)**
tredjeparts-analysskripten (Albacross, Snitcher) flyttade från toppen av `<body>` till slutet,
i `apps/web/app/[locale]/(public)/layout.tsx` — leverantörskontrakten (rå HTML, `window._nQc`-
ordning) opåverkade. **(2)** `PageFadeIn.tsx` — hoppar över `<main>`:s 280ms opacity-fade-in på
allra första sidladdningen (ingen "föregående sida" att tona in från då); tre granskningsrundor
hittade och fixade en riktig bugg på vägen (animationen slutade fungera efter första klientsid-
navigeringen — löst med `key={pathname}`-baserad remount istället för en `useEffect`+boolean
som fastnade permanent på `true`). **(3)** Bundle-analyserade den 72 KB/226 KB-chunk PageSpeed
flaggade för oanvänd kod + legacy-polyfills — **ärligt negativt resultat**: chunken visade sig
vara precompilerad `react-dom`/Next-runtime, inte en tredjepartsdependency eller egna kompo-
nenter, så `browserslist`-fixen planen föreslog ger 0% mätbar effekt (verifierat, sedan reverterat
enligt principen "ingen ändring behålls om den inte mätbart förbättrar"); `@next/bundle-analyzer`-
verktyget (med `analyze`-npm-script, kräver `--webpack`-flagga eftersom Turbopack saknar stöd)
behölls som framtida diagnosverktyg. **Sidoupptäckt:** en CLS-regression (0,013→0,40) i lokala
mätningar visade sig vid utredning finnas redan i koden FÖRE de här ändringarna (orsak: webbfont-
swap på Newsreader/Geist, `display: 'swap'`, helt orört av det här arbetet) — bekräftat genom att
tillfälligt köra Lighthouse mot den återställda pre-ändrings-koden i samma worktree. Egen framtida
uppgift, inte en regression härifrån. Lokala devtools-throttlade mätningar (samma maskin, samma
beroenden, före/efter) visar konsekvent förbättring i rätt riktning (LCP 2,2s→1,9s, TBT 120ms→
80ms) men med hög varians mellan körningar på en delad utvecklingsmaskin — den auktoritativa
mätningen (PageSpeed Insights mot en riktig preview-deploy, tre körningar) återstår och kräver att
branchen pushas, vilket inte gjorts i den här sessionen.

---

## Ekonomi

- 500 SEK/elev/år | ~141 SEK driftskostnad | ~71,7% marginal
- Full koncern (Amerikanska, 5 skolor): 2 000 elever → 1 MSEK intäkt / 283 KSEK kostnad
- Pilotens första fas är mindre: 2–3 klasser, ~60–90 elever — expansion efter validering
- Skala till 440 000 nordiska elever
