# Fas A — Mobilt skal (bottom-nav + topbar-städning) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge inloggade vyer en fungerande mobilnavigering (bottom-nav per roll) och städa topbaren, så att appen är användbar under 768px.

**Architecture:** En delad navkonfiguration (`lib/app/nav.ts`) blir enda källa för nav-items. `Sidebar` (laptop) och en ny `MobileNav` (mobil, `md:hidden`, fast i botten) konsumerar samma config. `Topbar` reduceras till varumärke på mobil och döljs på laptop. `AppShell` renderar `MobileNav` och lägger botten-padding på `<main>`.

**Tech Stack:** Next.js 16 (App Router, React 19), Tailwind CSS v4, TypeScript. Inget test-ramverk finns — verifiering sker via `pnpm --filter web typecheck`, `lint`, `build` samt manuell preview-rendering på 375px och 1280px.

**Spec:** [docs/superpowers/specs/2026-06-23-inloggade-vyer-redesign-design.md](../specs/2026-06-23-inloggade-vyer-redesign-design.md) — Del 1.

---

## Filstruktur

- **Create:** `apps/web/lib/app/nav.ts` — delad nav-config + `NavId`-typ. Enda källa för nav-items per roll.
- **Modify:** `apps/web/components/app/Sidebar.tsx` — ersätt lokal `itemsFor` med delad `navItemsFor` (DRY).
- **Create:** `apps/web/components/app/MobileNav.tsx` — klientkomponent, bottom-nav på mobil.
- **Modify:** `apps/web/components/app/Topbar.tsx` — ta bort döda ikoner; varumärke på mobil; dold på laptop.
- **Modify:** `apps/web/components/app/AppShell.tsx` — rendera `MobileNav`, botten-padding på `<main>`.

Befintliga fakta att förlita sig på:
- `Role` finns i `apps/web/lib/app/roles.ts` (`'student' | 'teacher' | 'admin'`).
- Nav-etiketter finns redan i `dict.app.sidebar.{student,teacher,admin}` och `dict.app.roleTitles[role]` (inga nya i18n-strängar behövs).
- CSS-tokens finns i `apps/web/app/globals.css`: `--color-canvas`, `--color-ink`, `--color-ink-muted`, `--color-accent`, `--color-sand`. `font-serif` = Newsreader.
- `AppShell` har redan `locale`, `role`, `dict`, `user` i scope.

---

### Task 1: Delad nav-config + refaktorera Sidebar

**Files:**
- Create: `apps/web/lib/app/nav.ts`
- Modify: `apps/web/components/app/Sidebar.tsx` (ta bort lokal `itemsFor` + `NavItem`, importera delad)

- [ ] **Step 1: Skapa den delade nav-configen**

Create `apps/web/lib/app/nav.ts`:

```ts
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';

export type NavId =
  | 'overview'
  | 'library'
  | 'chat'
  | 'examPrep'
  | 'learnerProfile'
  | 'classes'
  | 'lessons'
  | 'sharedTests'
  | 'schools'
  | 'users'
  | 'schedule'
  | 'stats'
  | 'prospects';

export type NavItem = { id: NavId; href: string; label: string };

// Enda källa för nav-items per roll. Konsumeras av både Sidebar (laptop)
// och MobileNav (mobil). `base` är t.ex. `/sv/app`.
export function navItemsFor(role: Role, base: string, dict: Dictionary): NavItem[] {
  if (role === 'student') {
    const s = dict.app.sidebar.student;
    return [
      { id: 'overview', href: `${base}/student`, label: s.overview },
      { id: 'library', href: `${base}/student/bibliotek`, label: s.library },
      { id: 'chat', href: `${base}/student/chat`, label: s.chat },
      { id: 'examPrep', href: `${base}/student/provplugg`, label: s.examPrep },
      { id: 'learnerProfile', href: `${base}/student/profil`, label: s.learnerProfile },
    ];
  }
  if (role === 'teacher') {
    const t = dict.app.sidebar.teacher;
    return [
      { id: 'overview', href: `${base}/teacher`, label: t.overview },
      { id: 'classes', href: `${base}/teacher/klasser`, label: t.classes },
      { id: 'lessons', href: `${base}/teacher/lektioner`, label: t.lessons },
      { id: 'sharedTests', href: `${base}/teacher/prov`, label: t.sharedTests },
    ];
  }
  const a = dict.app.sidebar.admin;
  return [
    { id: 'overview', href: `${base}/admin`, label: a.overview },
    { id: 'schools', href: `${base}/admin/skolor`, label: a.schools },
    { id: 'users', href: `${base}/admin/anvandare`, label: a.users },
    { id: 'schedule', href: `${base}/admin/schema`, label: a.schedule },
    { id: 'stats', href: `${base}/admin/statistik`, label: a.stats },
    { id: 'prospects', href: `${base}/admin/intresse`, label: a.prospects },
  ];
}
```

- [ ] **Step 2: Refaktorera Sidebar att använda den delade configen**

I `apps/web/components/app/Sidebar.tsx`:

1. Lägg till import högst upp (vid övriga imports):

```ts
import { navItemsFor } from '@/lib/app/nav';
```

2. Ta bort den lokala typdeklarationen och funktionen `itemsFor` helt (raderna `type NavItem = { href: string; label: string };` samt hela `function itemsFor(role, base, dict) { ... }`).

3. Inne i `Sidebar`-komponenten, byt raden:

```ts
const items = itemsFor(role, base, dict);
```

till:

```ts
const items = navItemsFor(role, base, dict);
```

`SidebarNav` tar `{ href, label }[]`; de extra `id`-fälten är harmlösa (strukturell typning).

- [ ] **Step 3: Verifiera typer + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS, inga fel (särskilt inga "itemsFor is not defined" eller oanvänd `NavItem`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/app/nav.ts apps/web/components/app/Sidebar.tsx
git commit -m "refactor(web): bryt ut delad nav-config för sidebar + mobilnav"
```

---

### Task 2: MobileNav-komponenten

**Files:**
- Create: `apps/web/components/app/MobileNav.tsx`

- [ ] **Step 1: Skapa MobileNav**

Create `apps/web/components/app/MobileNav.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { navItemsFor, type NavId } from '@/lib/app/nav';

// Stroke-ikoner i linje med befintlig Topbar-stil (1.5 stroke, 20x20).
const I = (path: ReactNode): ReactNode => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const ICONS: Record<NavId, ReactNode> = {
  overview: I(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  library: I(<><path d="M4 5h12v15H4z" /><path d="M16 5h4v15h-4" /></>),
  chat: I(<path d="M21 12a8 8 0 0 1-11 7L3 21l2-7a8 8 0 1 1 16-2z" />),
  examPrep: I(<><path d="M4 4h16v14H7l-3 3z" /></>),
  learnerProfile: I(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  classes: I(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /></>),
  lessons: I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  sharedTests: I(<><path d="M9 11l3 3 8-8" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  schools: I(<><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M10 21v-5h4v5" /></>),
  users: I(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /></>),
  schedule: I(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  stats: I(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  prospects: I(<><path d="M21 12a8 8 0 0 1-11 7L3 21l2-7a8 8 0 1 1 16-2z" /></>),
};

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
};

export function MobileNav({ locale, role, dict }: Props) {
  const pathname = usePathname();
  const base = `/${locale}/app`;
  const items = navItemsFor(role, base, dict);
  const overviewHref = `${base}/${role}`;

  // Fokusläge: dölj nav i aktiv chatt-tråd så meddelandefältet kan sitta längst ned.
  const isChatThread = /\/app\/student\/chat\/[^/]+$/.test(pathname);
  if (isChatThread) return null;

  return (
    <nav
      aria-label={dict.app.roleTitles[role]}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      {items.map((item) => {
        const isOverview = item.href === overviewHref;
        const isActive = isOverview
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.625rem] transition-colors',
              isActive
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-ink-muted)]',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={isActive ? 'text-[var(--color-accent)]' : undefined}
            >
              {ICONS[item.id]}
            </span>
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verifiera typer + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS. (`ICONS` täcker alla `NavId`; `Record<NavId, ReactNode>` ger typfel om något id saknas.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/MobileNav.tsx
git commit -m "feat(web): mobil bottom-nav per roll (md:hidden, safe-area)"
```

---

### Task 3: Topbar-städning

**Files:**
- Modify: `apps/web/components/app/Topbar.tsx`

- [ ] **Step 1: Ersätt Topbar-innehållet**

Ersätt HELA innehållet i `apps/web/components/app/Topbar.tsx` med:

```tsx
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
  user: {
    fullName: string | null;
    email: string | null;
  } | null;
};

// Mobil: visar varumärket (sidomenyn är dold < md).
// Laptop: dold helt (varumärket finns i sidomenyn) — sidinnehållet börjar högst upp.
// De tidigare placeholder-ikonerna (sök/notiser) är borttagna; global sök byggs senare.
export function Topbar({ locale }: Props) {
  return (
    <header className="flex h-[52px] items-center px-5 md:hidden">
      <Link
        href={`/${locale}`}
        className="font-serif text-[1.25rem] leading-none tracking-tight text-[var(--color-ink)]"
      >
        Elevante
      </Link>
    </header>
  );
}
```

(Props behåller `role`, `dict`, `user` för att anropssidan i `AppShell` är oförändrad; endast `locale` används.)

- [ ] **Step 2: Verifiera typer + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS. Inga oanvända-import-fel (endast `Link`, typerna används i `Props`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/Topbar.tsx
git commit -m "feat(web): städa topbar — varumärke på mobil, dold på laptop, döda ikoner bort"
```

---

### Task 4: Koppla in MobileNav i AppShell + botten-padding

**Files:**
- Modify: `apps/web/components/app/AppShell.tsx`

- [ ] **Step 1: Importera MobileNav**

I `apps/web/components/app/AppShell.tsx`, lägg till importen vid de övriga komponent-importerna (efter `import { Topbar } from './Topbar';`):

```ts
import { MobileNav } from './MobileNav';
```

- [ ] **Step 2: Lägg botten-padding på `<main>`**

Ersätt raden:

```tsx
<main id="app-main" className="flex-1 overflow-y-auto animate-page-in">
```

med:

```tsx
<main
  id="app-main"
  className="flex-1 overflow-y-auto animate-page-in pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
>
```

- [ ] **Step 3: Rendera MobileNav**

Ersätt det avslutande blocket:

```tsx
      </div>
    </div>
  );
}
```

med:

```tsx
      </div>
      <MobileNav locale={locale} role={role} dict={dict} />
    </div>
  );
}
```

(`MobileNav` är `fixed`, så placeringen i DOM:en spelar ingen roll för layouten; den läggs sist i yttre `div`.)

- [ ] **Step 4: Verifiera typer + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/app/AppShell.tsx
git commit -m "feat(web): rendera mobil bottom-nav i AppShell + botten-padding"
```

---

### Task 5: Integrationsverifiering (build + preview på mobil/laptop)

**Files:** inga (verifiering).

- [ ] **Step 1: Full build**

Run: `pnpm --filter web build`
Expected: Bygger utan fel.

- [ ] **Step 2: Starta dev-servern och rendera elev-vyn**

Starta dev-servern via preview-verktygen (`preview_start`, kommando `pnpm --filter web dev`), navigera till en inloggad elev-vy (t.ex. `/sv/app/student`).

- [ ] **Step 3: Verifiera mobil (375px)**

Med `preview_resize` till 375px bredd, ta `preview_snapshot`/`preview_screenshot`. Verifiera:
- Bottom-nav syns längst ned med 5 elev-flikar (Hem · Bibliotek · Fråga · Provplugg · Profil).
- Topbar visar "Elevante"-ordmärket uppe till vänster.
- Sista innehållet skyms inte av bottom-nav (padding fungerar).
- Aktiv flik är markerad (accent-färgad ikon + ink-text).

- [ ] **Step 4: Verifiera fokusläge i chatt-tråd**

Navigera till en chatt-tråd (`/sv/app/student/chat/<id>`). Verifiera att bottom-nav är dold (returnerar `null`).

- [ ] **Step 5: Verifiera laptop (1280px)**

Med `preview_resize` till 1280px: verifiera att sidomenyn syns till vänster, att bottom-nav är dold (`md:hidden`), och att topbaren inte längre tar plats (sidinnehållet börjar högst upp).

- [ ] **Step 6: Verifiera lärar-rollen**

Logga in/växla till lärare och bekräfta att bottom-nav visar 4 flikar (Översikt · Klasser · Lektioner · Prov) på 375px.

- [ ] **Step 7: Slutcommit (om något justerades under verifiering)**

```bash
git add -A
git commit -m "fix(web): justeringar efter mobil/laptop-verifiering av skalet"
```

(Hoppa över om inget ändrades i steg 1–6.)

---

## Self-review

- **Spec-täckning (Del 1):** 1.1 bottom-nav → Task 2+4; 1.2 topbar-städning → Task 3; 1.3 sidomeny oförändrad → endast DRY-refaktor i Task 1 (ingen beteendeändring). Botten-padding (1.1) → Task 4. Admin får nav gratis via delad config (Task 1). ✓
- **Inga nya i18n-strängar** behövs — verifierat att `dict.app.sidebar.*` och `dict.app.roleTitles` finns. ✓
- **Typkonsistens:** `navItemsFor`/`NavId`/`NavItem` definieras i Task 1 och konsumeras identiskt i Task 2 (`navItemsFor`, `NavId` för `ICONS`). `MobileNav`-props (`locale`,`role`,`dict`) matchar anropet i Task 4. ✓
- **WCAG:** touch-target `min-h-[44px]`, `aria-current` på aktiv, `aria-label` på `<nav>`, ikoner `aria-hidden`. ✓
- **Ej testramverk:** verifiering via typecheck/lint/build + preview — explicit i Task 5. ✓
