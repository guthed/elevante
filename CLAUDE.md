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
**Elev:** Chat-gränssnitt (strikt RAG), lektionsbibliotek
**Admin:** Schemauppladdning, statistik, användarhantering

### Mobilapp — lärare only
Schema-sync → automatiskt lektionsförslag → REC → STOP → auto-upload. Max 2 tryck.

### Inte i V1
Röst (V2), video/avatar (V3), hybrid RAG (V2+), föräldraapp (V2)

---

## Design

**Läs alltid DESIGN-sidan i Notion innan du bygger UI:**
`https://www.notion.so/33e84c8f289e81ec869fe7e6a91585f9`

Nyckelprinciper:
- Inspiration: hedvig.com — rent, generöst whitespace, minimalt brus
- Färger: primär #1A1A2E (mörkblå), accent #4F7FFF (klar blå), vit bakgrund
- Typografi: DM Serif Display (rubriker) + Inter (brödtext)
- Ton: Varm och direkt. Aldrig formell, aldrig påklistrat ungdomlig.
- Animationer: Subtila, 150ms övergångar

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
Supabase Auth via @supabase/ssr i `apps/web/lib/supabase/`. Databas delas med Bokmässan-projektet i eget `elevante`-schema (free-tier). RLS på alla tabeller, helpers via security definer. Login/signup/signOut Server Actions. `proxy.ts` refreshar session + skyddar `/app/*`. Role-baserad redirect i `/app/page.tsx`. Admin CSV-upload för timeslots + `GET /api/schedule`. 30 rutter totalt.
### Fas 3 — Lärarens webbvy: KLAR (2026-04-11)
Migration `elevante_materials_and_storage` lägger till `materials`-tabell, `lessons.transcript_text/transcript_updated_at` och privat Storage-bucket `elevante-materials` (500 MB, RLS per skola). Data-layer i `lib/data/teacher.ts` för översikt, klasser, lektioner och detaljvyer. Server Actions: `uploadMaterial` (validering + sanering + signed URL), `getMaterialDownloadUrl`. Vyer: `/teacher` översikt med stat-tiles, `/teacher/klasser[/id]`, `/teacher/lektioner[/id]` med transkript-placeholder + materials-card. `LessonStatusBadge`, `MaterialUploadForm`, `MaterialList`. 50 rutter byggda.
### Fas 4 — Elevens chattgränssnitt: KLAR (2026-04-11)
Migration `elevante_chat_history` lägger till `chats` + `chat_messages` med strikt RLS-privacy (lärare och admin kan ej läsa elevchats). Data-layer i `lib/data/student.ts`. Mockad RAG i `app/actions/chat.ts` (riktig pipeline kommer i Fas 6). Vyer: `/student` översikt, `/student/bibliotek` med kurs-filter, `/student/chat` landning + history, `/student/chat/[id]` full tråd. Lektionsdetaljen branchad på role: student ser chat-CTA, lärare ser upload-form. Komponenter: `ChatThread`, `LessonChatForm`, `CourseChatStarter`. 62 rutter byggda.
### Fas 5 — Mobilapp: KLAR (2026-04-11)
`apps/mobile/` med Expo SDK 52 + Expo Router 4 + RN 0.76 + React 19. Migration `elevante_audio_recordings` med privat audio-bucket (RLS bara teacher/admin). Supabase-klient med SecureStore-adapter (Keychain/Keystore). AsyncStorage upload-queue med base64 → Storage. Skärmar: login (KeyboardAvoidingView), schedule (dagens lektioner från timeslots, pull-to-refresh, pending-banner), record (mörk bakgrund, REC/STOP, expo-audio HIGH_QUALITY, mm:ss timer). pnpm.overrides på @types/react för att hålla webb och mobil i sync. Manuell test i Expo Go ligger som separat uppgift.
### Fas 6 — Transkription & RAG: DELVIS KLAR (2026-04-11)
Migration `elevante_lesson_chunks_pgvector` aktiverar `vector`-extensionen och skapar `lesson_chunks` (1024-dim, IVFFLAT-index) + RPC `match_lesson_chunks` / `match_course_chunks` (security definer). AI-adaptrar i `lib/ai/`: `anthropic.ts` med `@anthropic-ai/sdk` direkt + strikt RAG-system-prompt, `berget.ts` med OpenAI-kompatibelt API antaget. `app/actions/chat.ts` försöker `ragAnswer` först och faller tillbaka till `mockedAnswer` när keys saknas. **BLOCKERAT** (separata Notion-uppgifter): Berget AI API-key + verifierat API-format för KB-Whisper, embedding-leverantör inom EU, Anthropic API-key + GDPR-DPA-granskning, end-to-end audio→transcript-pipeline.
### Fas 7 — Admin & Statistik: KLAR (2026-04-11)
Data-layer i `lib/data/admin.ts` (overview, users, schools, stats med 7-dagars-bucket). Server Actions: `updateUserRole`, `createSchool`. Vyer: `/admin` översikt med 5 stat-tiles, `/admin/anvandare` med inline `UserRoleForm`, `/admin/skolor` med `CreateSchoolForm`, `/admin/statistik` med weekly bar chart (div-bars utan dep) + status-breakdown + activity-totals. 92 rutter byggda.

---

## Ekonomi

- 500 SEK/elev/år | ~141 SEK driftskostnad | ~71,7% marginal
- Pilot: 2 000 elever → 1 MSEK intäkt / 283 KSEK kostnad
- Skala till 440 000 nordiska elever
