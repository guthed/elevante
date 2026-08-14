# Investerardeck — elev/lärare-flikar i §6 Produkten — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace §6 PRODUCT's static student screenshot with a live, clickable flik-switcher ("Eleven" / "Läraren") that shows the real `InvestorChatDemo` (already live in §4) and the real `InsightHeatmap` (already live in §6) as two equally interactive, clearly separated views of the same synthetic lesson.

**Architecture:** One new small presentational component (`RoleTabs`) hosts two existing, already-verified product components — no new backend logic, no new data. `InvestorChatDemo` gets a `seeded` prop so it can start empty in §6 without duplicating its fetch/RAG logic. §4 is untouched (default `seeded=true`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 — matches the rest of `apps/web/app/investerare/`.

**Spec:** `docs/superpowers/specs/2026-08-15-investerardeck-elev-larare-flikar-design.md`

**On testing:** `apps/web` has no test runner configured (no Jest/Vitest, no `*.test.ts` files anywhere in the app — verified via `find`/`grep` before writing this plan). This matches how every other investor-deck change in this codebase has been verified: `tsc --noEmit` for type safety, then a manual browser pass against a local dev server. This plan follows that existing convention rather than introducing a new test framework for one UI section.

---

### Task 1: Add a `seeded` prop to the existing student chat component

**Files:**
- Modify: `apps/web/app/investerare/demo-transcript.ts`
- Modify: `apps/web/components/showcase/InvestorChatDemo.tsx`

- [ ] **Step 1: Add the empty-state copy string**

In `apps/web/app/investerare/demo-transcript.ts`, find the `CHAT_UI` object (starts at line 64). Add a new `ledeEmpty` key immediately after the existing `lede` key:

```ts
export const CHAT_UI: Record<string, L> = {
  chrome: { sv: 'Elevante · Elevvy', en: 'Elevante · Student view' },
  badge: { sv: 'Live-demo', en: 'Live demo' },
  subjectLabel: { sv: 'Ämne', en: 'Subject' },
  lede: {
    sv: 'En pågående chatt om dagens Ekologi-lektion. Testa själv — ställ en egen fråga om ekologin nedan.',
    en: 'An ongoing chat about today’s Ecology lesson. Try it yourself — ask your own question about ecology below.',
  },
  ledeEmpty: {
    sv: 'Ställ en fråga om Ekologi-lektionen — eller prova ett förslag nedan.',
    en: 'Ask a question about the Ecology lesson — or try a suggestion below.',
  },
  placeholder: { sv: 'Ställ en fråga om ekologin…', en: 'Ask a question about ecology…' },
  send: { sv: 'Fråga', en: 'Ask' },
  thinking: { sv: 'Elevante läser lektionen…', en: 'Elevante is reading the lesson…' },
  sourceLabel: { sv: 'Ur lektionen', en: 'From the lesson' },
  suggestionsLabel: { sv: 'Eller prova:', en: 'Or try:' },
  error: {
    sv: 'Kunde inte hämta ett svar just nu. Försök igen om en stund.',
    en: 'Couldn’t fetch an answer right now. Please try again in a moment.',
  },
  note: {
    sv: 'Riktiga produktmotorn (strikt RAG, Claude) svarar grundat i en syntetisk demolektion — aldrig påhittat.',
    en: 'The real product engine (strict RAG, Claude) answers grounded in a synthetic demo lesson — never made up.',
  },
};
```

(Only the `lede`→`ledeEmpty` insertion is new; every other key is unchanged, shown here for exact placement.)

- [ ] **Step 2: Give `InvestorChatDemo` a `seeded` prop, default `true`**

In `apps/web/components/showcase/InvestorChatDemo.tsx`, change the function signature (currently line 16):

```diff
-export default function InvestorChatDemo({ lang }: { lang: Lang }) {
-  const [messages, setMessages] = useState<Msg[]>(() =>
-    DEMO_SEED.map((m) => ({
-      role: m.role,
-      content: t(lang, m.content),
-      citation: m.citation ? { ts: m.citation.ts, quote: t(lang, m.citation.quote) } : undefined,
-    })),
-  );
+export default function InvestorChatDemo({ lang, seeded = true }: { lang: Lang; seeded?: boolean }) {
+  const [messages, setMessages] = useState<Msg[]>(() =>
+    seeded
+      ? DEMO_SEED.map((m) => ({
+          role: m.role,
+          content: t(lang, m.content),
+          citation: m.citation ? { ts: m.citation.ts, quote: t(lang, m.citation.quote) } : undefined,
+        }))
+      : [],
+  );
```

- [ ] **Step 3: Swap the lede line based on `seeded`**

Currently line 86:

```diff
-        <p className="mt-2 text-sm text-ink-secondary">{t(lang, CHAT_UI.lede)}</p>
+        <p className="mt-2 text-sm text-ink-secondary">{t(lang, seeded ? CHAT_UI.lede : CHAT_UI.ledeEmpty)}</p>
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "InvestorChatDemo\|demo-transcript"`
Expected: no output (no errors referencing either file). `seeded` is optional so every existing call site (`<InvestorChatDemo lang={lang} />` in §4) still compiles unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/investerare/demo-transcript.ts apps/web/components/showcase/InvestorChatDemo.tsx
git commit -m "feat(investerare): stöd tomt starttillstånd i elevchatt-demon

Lägger till en valfri seeded-prop (default true, så §4 är oförändrat)
så samma chattkomponent kan återanvändas i §6 utan förifylld konversation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Build the `RoleTabs` component

**Files:**
- Create: `apps/web/components/showcase/RoleTabs.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';

export type RoleTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

// Presentational tab-switcher — no data fetching, no animation, no external
// state. IMPORTANT: switching tabs must stay a plain conditional render, not
// a transform/opacity transition — InsightHeatmap's fixed-position drawer
// panels break inside any ancestor with `will-change: transform` (see the
// warning comment above its usage in InvestorDeck.tsx §6).
export default function RoleTabs({ tabs, defaultId }: { tabs: RoleTab[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  );
  const activeTab = tabs[activeIndex] ?? tabs[0];

  function selectByIndex(index: number) {
    const wrapped = (index + tabs.length) % tabs.length;
    setActive(tabs[wrapped].id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectByIndex(activeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectByIndex(activeIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectByIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectByIndex(tabs.length - 1);
    }
  }

  return (
    <div>
      <div role="tablist" className="flex gap-2" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`role-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`role-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-ink text-canvas' : 'bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        key={activeTab.id}
        role="tabpanel"
        id={`role-tabpanel-${activeTab.id}`}
        aria-labelledby={`role-tab-${activeTab.id}`}
        className="mt-6"
      >
        {activeTab.panel}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "RoleTabs"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/RoleTabs.tsx
git commit -m "feat(showcase): lägg till återanvändbar RoleTabs-flikväxlare

Ren presentationskomponent för att växla mellan två paneler via klick
eller tangentbord (piltangenter/Home/End), utan transform-animation —
säkert att använda runt InsightHeatmap.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Trim §6 copy and add the new tab/connector strings

**Files:**
- Modify: `apps/web/app/investerare/content.ts`

- [ ] **Step 1: Shrink `COPY.product.cols` to 2 bullets per role**

Replace the `cols` array inside `COPY.product` (currently lines 598–633):

```diff
     cols: [
       {
         heading: { sv: 'För eleven', en: 'For the student' },
         rows: [
           {
-            sv: 'Ställer frågor till lektionen — strikt RAG på lärarens egna ord.',
-            en: 'Asks questions about the lesson — strict RAG on the teacher’s own words.',
-          },
-          {
-            sv: 'Gör AI-övningsprov på det som sagts och lärarens uppladdade material.',
-            en: 'Takes AI practice tests on what was said and the teacher’s uploaded material.',
-          },
-          {
-            sv: 'Repeterar och pluggar inför prov i egen takt.',
-            en: 'Reviews and studies for tests at their own pace.',
+            sv: 'Ställer frågor till lektionen — strikt RAG på lärarens egna ord.',
+            en: 'Asks questions about the lesson — strict RAG on the teacher’s own words.',
+          },
+          {
+            sv: 'Övningsprov och repetition inför prov, i egen takt.',
+            en: 'Practice tests and review before exams, at their own pace.',
           },
         ],
       },
       {
         heading: { sv: 'För läraren', en: 'For the teacher' },
         rows: [
           {
             sv: 'Ser vilka frågor eleverna ställer — och var de fastnar.',
             en: 'Sees which questions students ask — and where they get stuck.',
           },
           {
-            sv: 'Ser vilka delar av lektionen som väcker flest frågor.',
-            en: 'Sees which parts of the lesson spark the most questions.',
-          },
-          {
-            sv: 'Följer hur elevernas övningsprov går.',
-            en: 'Tracks how students’ practice tests go.',
+            sv: 'Följer förståelse per begrepp och elevernas övningsprov.',
+            en: 'Tracks understanding per concept and students’ practice tests.',
           },
         ],
       },
     ],
```

The resulting `cols` array (for reference, this is the complete new block):

```ts
    cols: [
      {
        heading: { sv: 'För eleven', en: 'For the student' },
        rows: [
          {
            sv: 'Ställer frågor till lektionen — strikt RAG på lärarens egna ord.',
            en: 'Asks questions about the lesson — strict RAG on the teacher’s own words.',
          },
          {
            sv: 'Övningsprov och repetition inför prov, i egen takt.',
            en: 'Practice tests and review before exams, at their own pace.',
          },
        ],
      },
      {
        heading: { sv: 'För läraren', en: 'For the teacher' },
        rows: [
          {
            sv: 'Ser vilka frågor eleverna ställer — och var de fastnar.',
            en: 'Sees which questions students ask — and where they get stuck.',
          },
          {
            sv: 'Följer förståelse per begrepp och elevernas övningsprov.',
            en: 'Tracks understanding per concept and students’ practice tests.',
          },
        ],
      },
    ],
```

- [ ] **Step 2: Add the new tab-label and connector strings to `MEDIA`**

In the `MEDIA` object (starts at line 1385), remove the now-unused `elevAlt`/`elevCaption` keys (they only ever backed the screenshot we're removing in Task 4) and add three new keys in their place:

```diff
 export const MEDIA = {
   heroScroll:   { sv: 'Scrolla ↓', en: 'Scroll ↓' },
   chatAlt:      { sv: 'Elevante-chatt med svar och källhänvisningar ur lektionen', en: 'Elevante chat with answers and source citations from the lesson' },
   chatCaption:  { sv: 'Fråga Elevante · svar med källor', en: 'Ask Elevante · answers with sources' },
-  elevAlt:      { sv: 'Elevens vy i Elevante med dagens lektioner', en: "Student view in Elevante with today's lessons" },
-  elevCaption:  { sv: 'Elevens vy · dagens lektioner', en: "Student view · today's lessons" },
   kartaAlt:     { sv: 'Förståelsekarta i Elevante per klass och begrepp', en: 'Understanding map in Elevante per class and concept' },
   kartaCaption: { sv: 'Lärarens förståelsekarta · per klass', en: "Teacher's understanding map · per class" },
   kartaLiveChrome: { sv: 'Elevante · Lärarvy', en: 'Elevante · Teacher view' },
   kartaLiveBadge:  { sv: 'Live-demo', en: 'Live demo' },
   kartaLiveNote:   { sv: 'Den riktiga produktvyn — inte en bild. Klicka på en elev eller ett koncept. Syntetisk demodata, ingen riktig elevdata.', en: 'The actual product view — not an image. Click a student or a concept. Synthetic demo data, no real student data.' },
+  productTabElev:    { sv: 'Eleven', en: 'Student' },
+  productTabLarare:  { sv: 'Läraren', en: 'Teacher' },
+  productSwitchNote: { sv: 'Samma lektion — sett från två håll. Klicka för att växla.', en: 'Same lesson — seen from two sides. Click to switch.' },
   arrAriaLabel: { sv: 'ARR-prognos 2026–2031, från 0 till 100 MSEK.', en: 'ARR forecast 2026–2031, from 0 to 100 MSEK.' },
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "content.ts"`
Expected: no output. (`MEDIA` is typed via `satisfies Record<string, L>` — adding/removing keys doesn't need an interface change.)

- [ ] **Step 4: Confirm `elevAlt`/`elevCaption` have no other consumers before deleting**

Run: `cd apps/web && grep -rn "MEDIA.elevAlt\|MEDIA.elevCaption" app/investerare/`
Expected: no output (their only use was the screenshot in `InvestorDeck.tsx`, which Task 4 removes). If this prints a match anywhere other than `InvestorDeck.tsx` line ~290/295, stop and re-add the keys instead of deleting them.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/investerare/content.ts
git commit -m "content(investerare): korta §6-punkterna, lägg till flik-copy

Krymper 'För eleven'/'För läraren' till två punkter var (kompletterar
nu den interaktiva jämförelsen istället för att bära hela sektionen
själva). Nya strängar för flik-etiketter och den kopplande textraden.
Tar bort elevAlt/elevCaption — bara använda av skärmdumpen som §6 nu
ersätter med en levande demo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Rewire §6 in `InvestorDeck.tsx`

**Files:**
- Modify: `apps/web/app/investerare/InvestorDeck.tsx`

- [ ] **Step 1: Remove the now-unused screenshot imports**

At the top of the file, remove the `ZoomableShot` import (line 3) and the `shotElev` import (line 39) — both become dead code once the screenshot block is replaced in Step 3:

```diff
 import Eyebrow from '@/components/showcase/Eyebrow';
 import Reveal from '@/components/showcase/Reveal';
-import ZoomableShot from '@/components/showcase/ZoomableShot';
 import { LoopStep, RecVisual, TranscribeVisual, AskVisual } from '@/components/showcase/LoopVisuals';
```

```diff
 import LangToggle from './LangToggle';
 import ContactBar from './ContactBar';
 import {
   t,
   type Lang,
   COPY,
   PROBLEM_STATS,
   PROBLEM_SOURCE,
   MARKET_RINGS,
   EXPANSION,
   ASK,
   GLANCE,
   FUNDS,
   RISK_LADDER,
   DERISK_PROOF,
   DERISK_CONTRAST,
   TRACTION,
   MEDIA,
   CONTACTS,
 } from './content';
-
-import shotElev from '../../public/rektor/elev-oversikt.png';
```

- [ ] **Step 2: Import `RoleTabs`**

Add it next to the other showcase imports (after the `InvestorChatDemo` import, line 11):

```diff
 import InvestorChatDemo from '@/components/showcase/InvestorChatDemo';
+import RoleTabs from '@/components/showcase/RoleTabs';
 import { InsightHeatmap } from '@/components/app/teacher/InsightHeatmap';
```

- [ ] **Step 3: Replace the §6 body**

Replace the whole block from the `cols` grid through the `InsightHeatmap` wrapper (currently lines 268–320 — everything between the header `<Reveal>` at the top of §6 and the closing `<Reveal>` that renders `COPY.product.source`) with:

```tsx
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {COPY.product.cols.map((col, ci) => (
              <Reveal key={ci} delay={ci * 90}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <h3 className="font-serif text-2xl">{t(lang, col.heading)}</h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {col.rows.map((row, ri) => (
                      <li key={ri} className="flex gap-3 text-ink-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-coral" aria-hidden />
                        {t(lang, row)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          {/* Elev/lärare-flikar — båda paneler är riktiga, interaktiva produktkomponenter
              på samma syntetiska Ekologi-lektion. OBS: RoleTabs växlar via ren villkorlig
              rendering, ingen transform-animation — .reveal:s will-change:transform skapar
              en containing block som felplacerar InsightHeatmaps fixed drawer-paneler, så
              RoleTabs-blocket ligger medvetet utanför alla <Reveal>-wrappers. */}
          <div className="mt-10">
            <RoleTabs
              defaultId="elev"
              tabs={[
                {
                  id: 'elev',
                  label: t(lang, MEDIA.productTabElev),
                  panel: <InvestorChatDemo lang={lang} seeded={false} />,
                },
                {
                  id: 'larare',
                  label: t(lang, MEDIA.productTabLarare),
                  panel: (
                    <div className="overflow-hidden rounded-2xl bg-canvas shadow-lift">
                      <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-coral/70" aria-hidden />
                        <span className="h-2.5 w-2.5 rounded-full bg-sand-strong" aria-hidden />
                        <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden />
                        <span className="eyebrow ml-2">{t(lang, MEDIA.kartaLiveChrome)}</span>
                        <span className="eyebrow ml-auto flex items-center gap-1.5 text-coral-deep">
                          <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden />
                          {t(lang, MEDIA.kartaLiveBadge)}
                        </span>
                      </div>
                      <div className="p-4 sm:p-6">
                        <InsightHeatmap insight={DEMO_LESSON_INSIGHT} aiInsight={DEMO_AI_INSIGHT} />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
            <p className="mt-3 text-sm text-ink-muted">{t(lang, MEDIA.productSwitchNote)}</p>
          </div>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.product.source)}</p>
          </Reveal>
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i investerare`
Expected: no output.

- [ ] **Step 5: Confirm no other file imports the removed screenshot asset**

Run: `cd apps/web && grep -rn "elev-oversikt" app/ components/`
Expected: no output (the PNG file itself in `public/rektor/` is left alone — other pages may still reference the same image separately; this check only confirms the investor deck's own import is gone).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/investerare/InvestorDeck.tsx
git commit -m "feat(investerare): elev/lärare-flikar ersätter statisk skärmdump i §6

§6 visar nu en klickbar flikväxlare mellan den riktiga elevchatten
(samma komponent som §4, tom startpunkt) och den riktiga
förståelsekartan — båda levande, ingen längre bara en bild.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full-app typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit code 0.

- [ ] **Step 2: Start a local dev server on a scratch port**

Run (from `apps/web`): `PORT=3052 pnpm dev`
Expected: `Ready in <N>ms`, listening on `http://localhost:3052`. Leave it running for the remaining steps.

- [ ] **Step 3: Generate a local investor-session cookie (no Notion/email side effects)**

The gate needs a valid signed session cookie. Generate one locally using the same HMAC scheme the app uses (`INVESTOR_DECK_SECRET` from `apps/web/.env.local`), same approach as previous verification passes on this deck:

```bash
cd apps/web
SECRET=$(grep "^INVESTOR_DECK_SECRET=" .env.local | cut -d= -f2-)
env SECRET="$SECRET" node -e "
const crypto = require('crypto');
const secret = process.env.SECRET;
function toBase64Url(buf) { return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+\$/,''); }
const payload = { label: 'Plan verification', sid: crypto.randomUUID(), pid: 'local-preview' };
const body = toBase64Url(Buffer.from(JSON.stringify(payload)));
const sig = toBase64Url(crypto.createHmac('sha256', secret).update(body).digest());
console.log(body + '.' + sig);
"
```
Expected: a single line, two base64url segments joined by `.`. Save it as `$TOKEN` for the next steps.

- [ ] **Step 4: Fetch the rendered page and confirm the new markup is present, old markup is gone**

```bash
curl -s -H "Cookie: investor_access=$TOKEN" http://localhost:3052/investerare -o /tmp/investerare-verify.html
grep -c 'role="tablist"' /tmp/investerare-verify.html
grep -c "elev-oversikt" /tmp/investerare-verify.html
grep -c "Samma lektion — sett från två håll" /tmp/investerare-verify.html
```
Expected: first grep ≥ 1 (tablist present), second grep = 0 (old screenshot import gone), third grep = 1 (new connector line present).

- [ ] **Step 5: Repeat Step 4 for the English route**

```bash
curl -s -H "Cookie: investor_access=$TOKEN" http://localhost:3052/investerare/en -o /tmp/investerare-en-verify.html
grep -c 'role="tablist"' /tmp/investerare-en-verify.html
grep -c "Same lesson — seen from two sides" /tmp/investerare-en-verify.html
```
Expected: both ≥ 1.

- [ ] **Step 6: Browser check — tab switching and keyboard nav**

Open `http://localhost:3052/investerare` in a browser with the `investor_access` cookie set to `$TOKEN` (e.g. via the Browser pane's `javascript_tool`: `document.cookie = "investor_access=$TOKEN; path=/"`, then navigate). Scroll to §6 (heading "Vad eleven får — och vad läraren ser"). Confirm:
- The "Eleven" tab is active by default, showing an empty chat with suggestion chips (no pre-filled question).
- Clicking a suggestion chip sends a real request and a real answer with a citation appears (same behavior as §4's chat).
- Clicking "Läraren" swaps the panel to the understanding-map heatmap; clicking a student name or concept opens its drawer correctly (same behavior as before this change).
- Pressing the right/left arrow key while a tab button is focused moves focus and switches panels.
- Switching tabs back and forth does not visually break the heatmap's drawer panels (the `will-change:transform` regression this plan explicitly avoids).

- [ ] **Step 7: Regression check §4**

Scroll to §4 ("Lösningen"). Confirm the chat there still shows its original pre-filled example conversation exactly as before (proves the `seeded` default didn't change §4's behavior).

- [ ] **Step 8: Stop the scratch dev server**

Run: `lsof -ti :3052 | xargs -r kill`

- [ ] **Step 9: Report result**

No commit in this task (verification only). If any check in Steps 4–7 fails, fix the specific issue in the relevant Task 1–4 file and re-run Steps 1–7 before proceeding.
