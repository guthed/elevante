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

## [Klassprov — lärar-författade prov] — 2026-06-24

### Byggt
- **Nya tabeller** `class_tests` (titel, klass, lektionsurval, frågor jsonb, status draft/published/closed) och `class_test_submissions` (svar jsonb, poäng, AI-genererad feedback, release-flagga). RLS skolscopat på båda.
- **Provgenerator med reglage**: läraren väljer klass, lektioner, antal frågor och fördelning (stängda/öppna/resonerande via reglage). Largest-remainder-algoritm garanterar att summering alltid landar på exakt valt antal. `generateClassTest` Server Action anropar Claude mot lektionstranskript.
- **Draft → publicera → inlämning → AI-rättning → granskning → släpp**: flerval rättas deterministiskt i kod, fritextsvar och resonerande av Claude via `gradePracticeTest`. Läraren granskar/justerar och väljer när varje elevs resultat är klart att släppas.
- **Security-definer-RPC:er**: `get_published_class_test` (strippar `answer_key`/`correct_index` för elever), `get_my_submission_result` (release-gate — returnerar null tills läraren släpper), `get_class_test_for_grading` (lärarskyddad full read), `list_student_class_tests` (elev-scope med submission-status).
- **Routes**: `/teacher/klassprov` (lista + skapa), `/teacher/klassprov/[id]` (editor i draft, inlämningslista i published/closed), `/teacher/klassprov/[id]/[submissionId]` (GradeReview), `/student/klassprov` (lista), `/student/klassprov/[id]` (TestRunner / väntläge / resultat). `QuestionEditor` + `ClassTestRunner` + `GradeReview` + `CloseTestButton` nya klientkomponenter.
- **Återanvänder** `TestResult` (fr. Provplugg/delat prov) och `typeLabel`-hjälparen från `lib/app/test-utils.ts`.
- **Zod** infört för `generateClassTest`- och `submitClassTest`-Server Actions (tidigare saknades validering).

### QA-fynd
- Largest-remainder krävde explicit off-by-one-test för udda totaltal.
- `get_my_submission_result` måste köras som security definer för att kringgå att eleven annars inte kan läsa sin submission förrän läraren satt release-flaggan.

### Tekniska beslut
- **Facit-strippning i RPC, inte i klientkod** — facit når aldrig klienten ens om eleven debuggar nätverkstrafiken.
- **Release-gate i RPC** — submission-raden (med AI-feedback) är synlig i databasen men returneras inte förrän `released_at IS NOT NULL`. Eleven kan inte läsa resultatet via direktanrop till PostgREST.
- **Zod på Server Actions** — val framåt: alla nya Actions valideras med Zod. Retroaktiv migrering av äldre actions läggs som separat uppgift.

---

## [Startsida — trim] — 2026-06-23

### Byggt
- **Dubbla demo-länken borttagen** i hjälten: "Klicka igenom Elevante-demon" konkurrerade med den nya levande demon bredvid. Kvar är "Boka demo" i hjälten + "Klicka igenom hela demon" i Spela-in-sektionen.
- **FAQ trimmad 8 → 5** (sv/en): kvar är Vad är Elevante, Hittar Elevante på svar (strikt RAG), Är Elevante GDPR-säkert, Ersätter Elevante läraren, Vad kostar Elevante. Bort: "Hur fungerar" (överlappar "Vad är" + visas i hero/triptyk), "hårdvara/installation" (täcks av För skolan-kortet), "vilka skolor".
- **EU/Berget-dedup**: trust-punkten "All data inom EU. Aldrig i USA." borttagen — det nya Berget-stycket säger det tydligare (data stannar i Sverige, ingen amerikansk molntjänst). Fyra trust-punkter kvar.

### Tekniska beslut
- **Stockfotona i de tre dörrarna + trygghet behålls** (medvetet val) — övervägdes att bytas mot riktiga produktskärmar/tas bort, men sparas tills riktiga produktbilder finns.

---

## [Hjälte — självspelande transkript-demo] — 2026-06-23

### Byggt
- **`LessonTranscriptDemo` ersätter `ChatMockup`** i startsidans hjälte: lektionstranskriptet "tänds upp" på de rader svaret bygger på, eleven skriver frågan tecken för tecken (blinkande coral-markör), en kort "tänk"-paus, och Elevante skriver ut svaret löpande med källpiller som matchar de tända tidsstämplarna.
- **Fem ämnen loopar** med olika frågetyper: Matematik (poäng), Biologi (begrepp man inte förstod), Historia (orsak), Kemi (missad lektion), Samhällskunskap (hur funkar det). Egna scenarier per locale — `/sv` och `/en` får var sin uppsättning transkript, frågor, svar och piller.
- **Hjälten omordnad i mobilvyn**: rubrik → transkript+chatt → CTA-knappar (Boka demo / Klicka igenom demon). På desktop ligger knapparna kvar under texten med demon centrerad i högerkolumnen.
- **Trygghet-sektionen**: engelsk rubrik bytt till "Built in Sweden. Hosted inside a mountain (really)." + ny text (sv/en) om varför AI-pipelinen körs hos Berget och vad det ger skolan (data stannar i Sverige, svensk lag, fysiskt skyddat, ingen amerikansk molnberoende).
- **Lint-setup lagad för Next 16**: `next lint` är borttaget och kraschade; lint-skriptet bytt till `eslint . --max-warnings 0` och `eslint.config.mjs` förenklad till direkta `eslint-config-next`-importer.

### QA-fynd
- Verifierat i webbläsaren: sv + en, desktop + mobil (375px), inga konsolfel; typecheck + lint grönt.
- Mobil-ordning bekräftad via DOM (demo 441–1064px, Boka demo 1104px).

### Tekniska beslut
- **Imperativ typewriter via refs + `setTimeout`** i stället för state per tecken — undviker en re-render per bokstav.
- **Hela det korta transkriptet visas och båda källraderna tänds samtidigt**, i stället för att scrolla fram en rad: i den smala 5/12-hjälte-kolumnen radbryts raderna, vilket gjorde scroll-greppet opålitligt (nedre källraden klipptes). Tydligare att visa allt.
- **Mobil-omordning utan duplicerad markup**: tre grid-syskon (text, demo, CTA) i DOM-ordning text→demo→CTA; desktop placeras explicit med `md:row-start`/`col-start` så knapparna hamnar under texten igen.
- **`prefers-reduced-motion`** respekteras — visar färdigt tillstånd (fråga, tända rader, svar, piller) utan animering.

---

## [Prestanda — middleware-scoping] — 2026-05-29

### Byggt
- **`proxy.ts` kör Supabase-session bara på auth-rutter**: tidigare anropades `supabase.auth.getUser()` på *varje* lokaliserad route — även de statiska publika sidorna — vilket lade en seriell nätverks-roundtrip till Supabase Auth (Zurich) före varje klick. Session-refresh + auth-skydd är nu scopat till `/[locale]/app/*` och `/[locale]/login`. Övriga publika rutter returnerar direkt efter locale-logiken och serveras statiskt från Vercels CDN.

### Tekniska beslut
- **Token-refresh på publika sidor offras medvetet**: access-tokens lever 1 h och nästa `/app`-navigering refreshar ändå. Vinsten — ingen Auth-roundtrip per publikt klick — väger tyngre för en sajt där de flesta sidor är publika och statiska.

---

## [SEO & säkerhet] — 2026-05-28

### Byggt
- **Säkerhetsheaders** i `next.config`: CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS.
- **Strukturerad data utökad**: JSON-LD för `Organization`+`EducationalOrganization` (logo, sameAs, legalName), `WebSite` med publisher, `SoftwareApplication` med `Offer` (500 SEK/elev/år) och `FAQPage` på startsidan från befintliga FAQ-items.
- **AI-crawlers**: `robots` släpper explicit in GPTBot/ClaudeBot/PerplexityBot m.fl., blockerar `/app`, `/login`, `/signup`, `/api`.
- **Analytics lazy**: GTM/GA laddas `lazyOnload` (~160 kB bort från initial JS).
- **og:image + twitter:image** explicit i metadata med alt-text; titel kortad så "Elevante" inte upprepas (absolute title).
- **E-post bytt** `john@guthed.se` → `john@elevante.se` överallt (UI, schema, llms.txt, kontaktformulär, `.env.example`). Footer fick adress-block (Elevante AB, Stockholm) med klickbar e-post.

---

## [Copy-revision] — 2026-05-21

### Byggt
- **Vassare rubriker** på publika sajten (7 platser): "Spela in. Spara. Fråga.", "Det här används faktiskt.", "Tre vyer på samma lektion", "Ett pris. Allt ingår." m.fl.
- **Språkfixar** (8 platser): tar bort direktöversättningar och subjektsbyten — "Elevante svarar" (inte "vi svarar"), "tvingas på folk" (inte "mandateras fram"), du/ni-mix rätad.
- **Dictionary-städning**: döda `home`/`forSchools`/`forStudents`/`about`/`pricing` borttagna ur i18n (kvarlevor sedan Editorial Calm). Eliminerade samtidigt tysta konflikter (gammalt "privat AI-lärare"-löfte, €45 i EN mot live SEK 500). −208 rader per locale.

---

## [Kampanj — prisuppskattning, skol-prospekt & lead-gen] — 2026-05-19

### Byggt
- **Kampanjsida `/vad-kostar-elevante`** (PR #21–24): publik kalkylator där en gymnasieskola söks fram, elevantalet fylls i automatiskt från Skolverket och en ungefärlig årskostnad + pris per elev/månad visas. Lead-formulär (e-post + meddelande). Säljig layout — tiltade fotografier, mörkt kontrastband ("kostnaden av att inte göra något"), strukturerad "det här ingår"-lista.
- **Databasgrund** (migrationer `20260518210000` + `_constraints`): två globala tabeller — `school_lookups` (rå logg per prisförfrågan) och `school_prospects` (anrikat prospekt, en rad per skola, `enrichment_status` pending/done/failed + `updated_at`-trigger). RLS: bara admin läser, service-role skriver (kringgår RLS — inga insert/update-policys).
- **Skolverket-integration** (`lib/skolverket.ts`): hämtar elevantal + skolfakta (adress, telefon, e-post, huvudman, inriktning) via planned-educations v3. Statisk uppslagstabell `municipalities.json` (Sveriges 290 kommuner) översätter `geographicalAreaCode` → kommunnamn. `scripts/fetch-schools.ts` snapshottar gymnasieskolor; skolenhetskod rensas ur skolnamnet.
- **AI-säljbrief** (`lib/campaign-brief.ts`): Claude genererar en kort säljbrief per prospekt utifrån skolfakta.
- **Notion-sync** (`lib/notion.ts`): varje prospekt upsertas till en Notion-databas (`NOTION_TOKEN` + `NOTION_LEADS_DATABASE_ID`); Kontakt delas i Telefon/E-post/Adress.
- **Server Actions** (`app/actions/campaign.ts`): race-säker prospekt-upsert + lead-koppling, bakgrundsanrikning (Skolverket → brief → Notion), `enrichment_status='done'` direkt för manuella koder. `lib/supabase/service-role.ts` ny service-role-klient.
- **Admin-vy `/admin/intresse`** (PR #20–21): listar skol-prospekt med kontaktkolumner; nav-länk i admin-sidebaren.

### QA-fynd
- **Manuella prospekt krockade på `school_unit_code UNIQUE`** → `PriceEstimator` genererar `manual-<uuid>` per session.
- `ALTER`/constraint bröts ut till följdmigration (`_constraints`) separat från tabellskapandet.

### Tekniska beslut
- **Globala tabeller, inte skol-scopade**: prospekt är säljdata, inte kunddata — ingen `school_id`/RLS-per-skola, bara admin-read + service-role-write.
- **Inget rabattpåslag** (`lib/pricing.ts`): alltid fullt pris 500 SEK/elev/år (beslut i specen).
- **Skolverket-kod → kommunnamn via statisk tabell**, inte API-anrop per uppslag — koden ger bara `geographicalAreaCode`.

---

## [Publik sajt v2 — startsida som router] — 2026-05-18

### Byggt
- **Startsidan ombyggd som router** (PR #20): storidé → loop-visualisering → "tre dörrar" (elev/lärare/skola) → trygghetssektion.
- **Varvande hjälterubrik**: tre rubriker som roterar långsamt (inte slump per laddning).
- **Hovermarkör i menyn**: coral understrykning som tonar in.
- **Pris-sidan städad**: gratis-pilot-erbjudandet borttaget, den klickbara-men-inte-klickbara planväljaren borttagen.
- **Om-oss**: TBD-platshållare i teamet borttagna.

### Tekniska beslut
- **A11y**: `aria-hidden` på dekorativa visuals i loop + hjälte, typografiska apostrofer i engelsk copy.

---

## [Insikt blir lärarprivat] — 2026-05-17

### Byggt
- **Förståelsekartan är nu lärarprivat** (migration `20260517170000_teacher_private_insight.sql`): bara läraren som äger lektionen (`lessons.teacher_id`) ser insikts-datan. Admin och kollegor förlorar åtkomsten. Policys `chats_owning_teacher_select`, `chat_messages_owning_teacher_select`, `lesson_views_owning_teacher_select` ersätter de bredare `*_teacher_admin_school_select`/`lesson_views_school_select` från Fas 8.

### Tekniska beslut
- **Vänder Fas 8-beslutet medvetet**: den breda läsåtkomsten (alla lärare/admin i skolan) gjorde en minderårigs förståelse-/engagemangsdata synlig för skolledning och kollegor. Heatmapen använder bara lesson-scope-chattar, så avgränsningen via `teacher_id` täcker behovet. Elevernas self-select-policys är orörda.

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
