# Design: Bloggstomme (elevante.se)

> Datum: 2026-06-01 · Status: Godkänd design, redo för implementationsplan
> Scope: Teknisk stomme för en svensk blogg på elevante.se. Innehållet (~20–40
> inlägg över tid, från Notion) läggs in separat när det levereras — stommen
> verifieras med ett exempelinlägg.

## Mål

Ge elevante.se en bloggsektion som rankar på informationssökningar och blir
citerbar av AI-motorer (Google AI Overviews, ChatGPT, Perplexity). Bloggen är
den största outnyttjade hävstången för organisk + AEO-trafik eftersom sajten
idag bara kan ranka på varumärkestermen "Elevante".

## Beslut (från brainstorming)

- **Språk:** Svenska enbart. Bloggen lever under `/sv`. `/en/blogg` → 404.
  Artiklar har canonical `/sv/blogg/<slug>` utan en-alternate (x-default = sv).
- **Inläggsfält:** titel, ingress/description, publiceringsdatum, brödtext
  (alltid) + **kategori**, **hero-/OG-bild per inlägg** (valfri, fallback till
  genererad), **lästid** (auto). Ingen författar-byline → Elevante (Organization)
  som author/publisher i schemat.
- **Innehållsmodell:** Markdown-filer med frontmatter (Approach A).

## Rutter

Alla under route-gruppen `(public)` så de ärver Header/Footer/JSON-LD-layouten.

| Fil | Rutt | Syfte |
|-----|------|-------|
| `app/[locale]/(public)/blogg/page.tsx` | `/sv/blogg` | Listsida |
| `app/[locale]/(public)/blogg/[slug]/page.tsx` | `/sv/blogg/<slug>` | Artikel |
| `app/[locale]/(public)/blogg/[slug]/opengraph-image.tsx` | `/sv/blogg/<slug>/opengraph-image` | Genererad OG-bild (fallback) |

**Svensk-only:** sidornas `generateStaticParams` genererar bara slugs för
`locale === 'sv'`. Båda sidorna anropar `notFound()` om `locale !== 'sv'`, så
`/en/blogg` och `/en/blogg/<slug>` ger 404. Bloggen läggs inte till i `/en`-delen
av sitemapen.

## Innehållsmodell

Varje inlägg = en fil `content/blog/<slug>.md`:

```markdown
---
title: "Får man spela in lektioner i skolan? Så funkar GDPR"
description: "Kort ingress som blir meta description och listingress."
date: 2026-05-20            # publishedTime / datePublished
updated: 2026-05-22         # valfritt → dateModified
category: "GDPR"
heroImage: "/blog/gdpr-inspelning.jpg"   # valfritt → annars genererad OG
---

Brödtext i markdown…
```

### `lib/blog.ts`

Datalager, körs vid byggtid (React Server Component + `node:fs`):

- `getAllPosts(): Post[]` — läser `content/blog/*.md`, parsar frontmatter med
  `gray-matter`, returnerar typade poster sorterade nyast först.
- `getPostBySlug(slug): Post | null`
- `getCategories(): string[]` — unika kategorier ur posterna.
- Lästid räknas ur brödtexten (ord / 200, avrundat uppåt, min 1).
- Typ `Post`: `{ slug, title, description, date, updated?, category,
  heroImage?, body, readingMinutes }`.

Frontmatter valideras lätt: saknad obligatorisk nyckel (title/description/
date/category) → tydligt byggfel som pekar ut filen.

## Rendering & design (Editorial Calm)

- `components/public/Prose.tsx` — renderar markdown-brödtext med `react-markdown`
  + `remark-gfm` (båda redan installerade). Wrappar i `.prose-elevante`.
- `.prose-elevante` i `globals.css` — handrullade prosa-stilar: Newsreader på
  rubriker, Geist på brödtext, sand-linjer, coral-accent på länkar, generös
  radhöjd. Ingen `@tailwindcss/typography`-plugin (håller beroenden nere och
  matchar designsystemet exakt).
- `components/public/BlogCard.tsx` — listkort: hero-bild (eller en lugn
  genererad/placeholder-yta), kategori-chip, datum, lästid, titel, ingress.
- Listsidan: rad med kategori-filter-chips ("Alla" + kategorier) som en liten
  client-komponent. Filtrerar de redan renderade korten på klienten.

## SEO / AEO

### Artikel (`/sv/blogg/<slug>`)
- `generateMetadata`: titel (`%s · Elevante`-template), description, **canonical
  `/sv/blogg/<slug>`** (ingen en-alternate; x-default = sv), `openGraph.type =
  'article'` med `publishedTime`/`modifiedTime`, OG-bild (heroImage om satt,
  annars `/sv/blogg/<slug>/opengraph-image`), `twitter.card =
  summary_large_image`.
- JSON-LD **`BlogPosting`**: `headline`, `description`, `datePublished`,
  `dateModified` (= updated ?? date), `image`, `articleSection` (kategori),
  `author` + `publisher` = `{ '@id': '<SITE_URL>/#organization' }`,
  `mainEntityOfPage` = canonical, `inLanguage: 'sv-SE'`.
- JSON-LD **`BreadcrumbList`**: Hem → Blogg → artikel.

### Listsida (`/sv/blogg`)
- `generateMetadata`: titel "Blogg · Elevante", description, canonical
  `/sv/blogg`.
- JSON-LD **`Blog`**: `blogPost` som en lista av `BlogPosting`-referenser
  (headline + url) — lättviktig.
- JSON-LD **`BreadcrumbList`**: Hem → Blogg.

### OG-bildsgenerering (fallback)
`opengraph-image.tsx` använder `next/og` `ImageResponse` (speglar befintliga
`app/opengraph-image.tsx`): renderar titel + kategori på Editorial Calm-bakgrund,
1200×630. Används bara när inlägget saknar `heroImage`.

## Integration

- `app/sitemap.ts` — lägg till `/sv/blogg` + alla `/sv/blogg/<slug>` via
  `getAllPosts()`. Svensk-only: inga `alternates.languages` på dessa poster.
  De befintliga `PAGE_PATHS`-rutterna lämnas orörda.
- `components/public/Footer.tsx` — blogg-länk, visas bara när `locale === 'sv'`
  (i Företag-kolumnen). Ny label `dict.nav.blog`.
- `lib/i18n/locales/sv.ts`, `en.ts`, `lib/i18n/types.ts` — lägg till `nav.blog`
  ("Blogg" / "Blog"). En-labeln finns för typkomplett­het även om den inte visas.
- **Exempelinlägg** `content/blog/exempel-*.md` seedas så rutterna renderar och
  kan verifieras. Tydligt märkt som exempel; raderas när de riktiga inläggen
  läggs in.

## Nytt beroende

- `gray-matter` — frontmatter-parsning. Litet, standard, inga tunga
  transitiva beroenden.

## Medvetet utelämnat (YAGNI)

- Författar-byline, taggar utöver kategori, kommentarer.
- Paginering — vid ~20–40 inlägg ryms allt på en listsida med kategori-filter;
  läggs till (sökvägsbaserad, `/sv/blogg/sida/2`) först om bloggen växer förbi
  det. Innehållsmodellen behöver inte ändras då.
- Kategori-landningssidor (`/sv/blogg/kategori/<x>`) — kan läggas till senare
  utan omarbete av innehållsmodellen.
- Blogg-länk i Headern — bara Footern i v1.
- RSS/Atom-flöde — kan läggas till senare.

## Verifiering

- `pnpm typecheck` + `pnpm build` rena.
- Byggd HTML för exempelinlägget: korrekt self-canonical, `BlogPosting`- och
  `BreadcrumbList`-schema renderas, OG-bild svarar `200 image/png`.
- `/en/blogg` ger 404.
- `/sv/blogg` + exempelartikeln finns i `sitemap.xml`.

## Filer som skapas / ändras

**Nya:**
- `content/blog/exempel-*.md`
- `lib/blog.ts`
- `components/public/Prose.tsx`
- `components/public/BlogCard.tsx`
- `components/public/BlogCategoryFilter.tsx` (client)
- `app/[locale]/(public)/blogg/page.tsx`
- `app/[locale]/(public)/blogg/[slug]/page.tsx`
- `app/[locale]/(public)/blogg/[slug]/opengraph-image.tsx`

**Ändras:**
- `app/sitemap.ts`
- `components/public/Footer.tsx`
- `lib/i18n/locales/sv.ts`, `lib/i18n/locales/en.ts`, `lib/i18n/types.ts`
- `app/globals.css` (`.prose-elevante`)
- `package.json` (`gray-matter`)
