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
| Backend | FastAPI (Python) |
| Databas | Supabase (PostgreSQL + pgvector + Storage + Auth) |
| AI — ALL generering | **Claude API (Anthropic) — enda AI-leverantören** |
| Transkribering | KB-Whisper via Berget AI (svenska, GDPR) |
| Hosting (webb) | Vercel (auto-deploy från GitHub) |
| Hosting (backend/AI) | Berget AI (EU, GDPR) |
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
├── packages/
│   ├── ui/           # Delat komponentbibliotek
│   ├── api-client/   # Typade API-klienter
│   └── types/        # Delade TypeScript-typer
├── backend/
│   ├── api/          # FastAPI
│   ├── pipeline/     # Transkription + RAG
│   └── workers/      # Bakgrundsjobb
├── CLAUDE.md
└── turbo.json
```

---

## QA-krav

- [ ] WCAG AA på alla UI-komponenter
- [ ] Inga hårdkodade strängar (t('key'))
- [ ] Pydantic-validering på alla API-endpoints
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
### Fas 3 — Lärarens webbvy: EJ STARTAD
### Fas 4 — Elevens chattgränssnitt: EJ STARTAD
### Fas 5 — Mobilapp: EJ STARTAD
### Fas 6 — Transkription & RAG: EJ STARTAD
### Fas 7 — Admin & Statistik: EJ STARTAD

---

## Ekonomi

- 500 SEK/elev/år | ~141 SEK driftskostnad | ~71,7% marginal
- Pilot: 2 000 elever → 1 MSEK intäkt / 283 KSEK kostnad
- Skala till 440 000 nordiska elever
