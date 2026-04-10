# Elevante

AI-driven EdTech-plattform som spelar in klassrumsundervisning, transkriberar och låter elever ställa frågor om innehållet via textbaserad AI.

> *"Elevante minns allt du lär dig i skolan"*

## Monorepo

```
elevante/
├── apps/
│   └── web/        # Publik sajt + kommande webb-app (Next.js 16)
├── packages/       # Delade paket (kommer senare)
├── CLAUDE.md       # Agenternas kollektiva minne
└── turbo.json
```

## Kom igång

Kräver Node 20+ och pnpm 9+.

```bash
pnpm install
pnpm dev
```

Öppna [http://localhost:3000](http://localhost:3000) — du redirectas till `/sv` eller `/en` baserat på din browser-locale.

## Bygga

```bash
pnpm build
```

## Miljövariabler

Kopiera `apps/web/.env.example` till `apps/web/.env.local` och fyll i värden.

| Variabel | Syfte |
|---|---|
| `RESEND_API_KEY` | Resend API-nyckel för kontaktformuläret |
| `CONTACT_TO_EMAIL` | Mottagaradress för kontaktformulärsmeddelanden |
| `NEXT_PUBLIC_SITE_URL` | Bas-URL för sajten (används i sitemap, OG, JSON-LD) |

## Status

Se `CLAUDE.md` för aktuellt fasminne.
