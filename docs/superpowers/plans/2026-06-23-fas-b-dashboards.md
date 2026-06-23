# Fas B — Dashboard-omdesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bygg om lärar- och elevöversikten så att varje rolls kärnvärde ligger överst, ytan utnyttjas tätare och påhittad data försvinner.

**Architecture:** Rena server/klient-Next-komponenter. Lärar-hjälten härleds ur befintlig `getRecentLessonInsightRows`; elevens "Fortsätt"-kort drivs av `getUserChatHistory()`. Inga nya DB-queries.

**Tech Stack:** Next.js 16 (App Router, React 19), Tailwind v4, TypeScript. Verifiering: `pnpm --filter web typecheck` / `lint` / `build` + preview på 375px och ≥768px, inloggad som Anna (lärare) + Elin (elev).

**Spec:** [docs/superpowers/specs/2026-06-23-inloggade-vyer-redesign-design.md](../specs/2026-06-23-inloggade-vyer-redesign-design.md) — Del 2.

---

## Filstruktur

- **Modify:** `apps/web/lib/i18n/types.ts`, `locales/sv.ts`, `locales/en.ts` — nya strängar under `app.pages.teacher.overview` och `app.pages.student.overview` (hjälte, chips, ask-box, quick-links).
- **Modify:** `apps/web/components/app/teacher/TeacherDashboard.tsx` — kompakt header + chips, hjälte-insikt, rail med Snabbt-kort.
- **Modify:** `apps/web/app/[locale]/app/[role]/page.tsx` — hämta senaste chatt för elev, skicka till `StudentHome`.
- **Modify:** `apps/web/components/app/student/StudentHome.tsx` — ask-box-hjälte, villkorat "Fortsätt"-kort, rail med "Plugga inför prov".

Befintlig data:
- `TeacherOverview` = `{ classes, courses, recentLessons }`; `MiniLessonRow` = `{ lessonId, title, topConceptName, topConceptQuestionCount, studentsAsking, totalStudents }`.
- `ChatHistoryRow` = `{ id, title, scope, lesson_id, course_id, updated_at }`; `getUserChatHistory()` returnerar nyaste först.

---

### Task 1: i18n-strängar

**Files:** `types.ts`, `locales/sv.ts`, `locales/en.ts`

- [ ] **Step 1:** Lägg till i `Dictionary['app']['pages']['teacher']['overview']` (types.ts) fälten:

```ts
heroEyebrow: string;       // "Veckans insikt"
heroCtaLabel: string;      // "Se vad de undrar"
heroQuestionWord: string;  // "frågor" (för "{n} frågor")
heroConceptPrefix: string; // "fastnar på" → "{n} elever fastnar på …"
quickHeading: string;      // "Snabbt"
quickLessons: string;      // "Mina lektioner"
quickTests: string;        // "Delade prov"
chipsCourses: string;      // "kurser"
chipsStudents: string;     // "elever"
chipsClasses: string;      // "klasser"
```

Och i `student.overview`:

```ts
askEyebrow: string;        // "Fråga Elevante"
askTitle: string;          // "Vad undrar du om det du lärt dig?"
askPlaceholder: string;    // "Skriv din fråga…"
askCta: string;            // "Fråga"
askExample1: string;       // "Sammanfatta dagens lektion"
askExample2: string;       // "Förhör mig inför provet"
continueHeading: string;   // "Fortsätt där du slutade"
continueLabel: string;     // "Senaste chatten"
continueCta: string;       // "Öppna chatten"
examQuickHeading: string;  // "Prov på gång?"
examQuickCta: string;      // "Plugga inför prov"
```

- [ ] **Step 2:** Fyll samma nycklar i `locales/sv.ts` och `locales/en.ts` (svenska enligt kommentarerna ovan; engelska motsvarigheter: "Insight of the week", "See what they wonder", "questions", "are stuck on", "Quick", "My lessons", "Shared tests", "courses", "students", "classes"; "Ask Elevante", "What are you wondering about what you've learned?", "Type your question…", "Ask", "Summarise today's lesson", "Quiz me for the test", "Pick up where you left off", "Last chat", "Open chat", "Got a test coming up?", "Exam prep").

- [ ] **Step 3:** `pnpm --filter web typecheck` → PASS (fångar saknade nycklar i något locale).

- [ ] **Step 4:** Commit: `feat(web): i18n-strängar för dashboard-omdesign (sv+en)`

---

### Task 2: Lärar-dashboard

**Files:** `apps/web/components/app/teacher/TeacherDashboard.tsx`

- [ ] **Step 1:** Härled hjälte-insikt överst i komponenten (efter `totalStudents`):

```tsx
const topInsight = insightRows
  .filter((r) => r.topConceptQuestionCount > 0)
  .sort((a, b) => b.topConceptQuestionCount - a.topConceptQuestionCount)[0] ?? null;
```

- [ ] **Step 2:** Ersätt den stora 4-stat-sektionen (`<section className="grid grid-cols-2 …">` + omgivande dividers) med kompakta chips i headern. Headern blir:

```tsx
<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
  <div>
    <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
      {greeting(locale, firstName)}
    </h1>
    <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">{dateSubtitle(locale)}</p>
  </div>
  <div className="flex flex-wrap gap-2">
    <Chip n={data.courses.length} label={t.chipsCourses} />
    <Chip n={totalStudents} label={t.chipsStudents} />
    <Chip n={data.classes.length} label={t.chipsClasses} />
  </div>
</header>
```

Lägg till `Chip`-helper i filen:

```tsx
function Chip({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-[var(--color-sand)] px-3 py-1 text-[0.8125rem] text-[var(--color-ink-secondary)]">
      <b className="font-serif text-[var(--color-ink)] tabular-nums">{n}</b> {label}
    </span>
  );
}
```

(`t` = `dict.app.pages.teacher.overview`; lägg till `dict`-prop — se Step 5. Behåll `Stat`-helpern bort, den används inte längre.)

- [ ] **Step 3:** Lägg hjälte-kortet direkt under headern (före "Idag"):

```tsx
{topInsight ? (
  <Link
    href={`${base}/lektioner/${topInsight.lessonId}`}
    className="mt-8 flex items-center justify-between gap-4 rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(26,26,46,0.12)]"
  >
    <div className="min-w-0">
      <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-accent)]">{t.heroEyebrow}</p>
      <p className="mt-2 font-serif text-[1.125rem] leading-snug text-[var(--color-ink)]">
        {topInsight.studentsAsking} {t.chipsStudents} {t.heroConceptPrefix} <span className="italic">{topInsight.topConceptName}</span>
      </p>
      <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">{topInsight.title} · {topInsight.topConceptQuestionCount} {t.heroQuestionWord}</p>
    </div>
    <span className="shrink-0 rounded-[12px] bg-[var(--color-ink)] px-4 py-2 text-[0.8125rem] text-[var(--color-canvas)]">{t.heroCtaLabel} →</span>
  </Link>
) : null}
```

- [ ] **Step 4:** Byt grid-layouten så MAIN och rail får `min-w-0` (redan gjort i Fas A — behåll). Lägg "Snabbt"-kort i `<aside>` efter "Dina klasser":

```tsx
<div className="rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)]">
  <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">{t.quickHeading}</h3>
  <ul className="mt-4 space-y-2">
    <li><Link href={`${base}/lektioner`} className="text-[0.9375rem] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] hover:underline">{t.quickLessons} →</Link></li>
    <li><Link href={`${base}/prov`} className="text-[0.9375rem] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] hover:underline">{t.quickTests} →</Link></li>
  </ul>
</div>
```

- [ ] **Step 5:** Lägg `dict`-prop på `TeacherDashboard` (`dict: Dictionary`) och `const t = dict.app.pages.teacher.overview;` samt `const sv = locale === 'sv';` (behåll). Uppdatera anropet i `page.tsx` (Task-överskridande): skicka `dict={dict}` där `TeacherDashboard` renderas — `dict` finns redan i `generateMetadata` men måste hämtas i `RoleOverviewPage` för teacher-grenen: `const dict = await getDictionary(locale);`.

- [ ] **Step 6:** `pnpm --filter web typecheck && pnpm --filter web lint` → PASS.

- [ ] **Step 7:** Commit: `feat(web): bygg om lärardashboarden — hjälte-insikt + chips + snabbgenvägar`

---

### Task 3: Elev-dashboard

**Files:** `apps/web/app/[locale]/app/[role]/page.tsx`, `apps/web/components/app/student/StudentHome.tsx`

- [ ] **Step 1:** I `page.tsx` student-grenen, hämta dict + senaste chatt och skicka in:

```tsx
const [data, chatHistory, dict] = await Promise.all([
  getStudentOverview(profile.id),
  getUserChatHistory(),
  getDictionary(locale),
]);
const lastChat = chatHistory[0] ?? null;
return <StudentHome locale={locale} firstName={firstName} data={data} dict={dict} lastChat={lastChat} />;
```

Lägg importer: `getUserChatHistory, type ChatHistoryRow` från `@/lib/data/student`.

- [ ] **Step 2:** I `StudentHome.tsx`, uppdatera Props: lägg `dict: Dictionary` och `lastChat: ChatHistoryRow | null`. `const s = dict.app.pages.student.overview;`

- [ ] **Step 3:** Lägg ask-box-hjälten direkt efter headern (före "Dagens lektioner"), ersätt den första `<div className="my-10 h-px …">`-dividern:

```tsx
<Link
  href={`${base}/chat`}
  className="mt-8 block rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(26,26,46,0.12)]"
>
  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-accent)]">{s.askEyebrow}</p>
  <p className="mt-2 font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">{s.askTitle}</p>
  <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3">
    <span className="flex-1 text-[0.9375rem] text-[var(--color-ink-muted)]">{s.askPlaceholder}</span>
    <span className="rounded-[8px] bg-[var(--color-ink)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-canvas)]">{s.askCta} →</span>
  </div>
  <div className="mt-3 flex flex-wrap gap-2">
    <span className="rounded-full border border-[var(--color-sand)] px-3 py-1 text-[0.8125rem] text-[var(--color-ink-secondary)]">{s.askExample1}</span>
    <span className="rounded-full border border-[var(--color-sand)] px-3 py-1 text-[0.8125rem] text-[var(--color-ink-secondary)]">{s.askExample2}</span>
  </div>
</Link>
```

- [ ] **Step 4:** Ersätt hela "Fortsätt där du slutade"-sektionen (med hårdkodat integral-citat) med villkorad riktig data:

```tsx
{lastChat ? (
  <section className="mt-14">
    <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">{s.continueHeading}</h2>
    <Link href={`${base}/chat/${lastChat.id}`} className="mt-6 block rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(26,26,46,0.12)]">
      <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">{s.continueLabel}</p>
      <p className="mt-3 font-serif text-[1.125rem] italic text-[var(--color-ink)]">{lastChat.title ?? '—'}</p>
      <p className="mt-3 inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-ink-secondary)]">{s.continueCta} →</p>
    </Link>
  </section>
) : null}
```

- [ ] **Step 5:** Ersätt "Tips för veckan"-kortet i `<aside>` med "Prov på gång?"-kort:

```tsx
<div className="rounded-[20px] border border-[var(--color-sand)] p-6">
  <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">{s.examQuickHeading}</h3>
  <Link href={`${base}/provplugg`} className="mt-3 inline-flex text-[0.9375rem] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] hover:underline">{s.examQuickCta} →</Link>
</div>
```

- [ ] **Step 6:** `pnpm --filter web typecheck && pnpm --filter web lint` → PASS.

- [ ] **Step 7:** Commit: `feat(web): bygg om elevdashboarden — fråge-ruta + villkorat fortsätt-kort`

---

### Task 4: Integrationsverifiering

- [ ] **Step 1:** `pnpm --filter web build` → grön.
- [ ] **Step 2:** Preview (`pnpm --filter web dev`), logga in som Anna. På 375px + 1280px: hjälte-insikt syns överst, chips i header, inga dividers-luckor, Snabbt-kort i rail, ingen sidledes-scroll.
- [ ] **Step 3:** Logga in som Elin. På 375px + 1280px: ask-box överst, exempel-chips, "Fortsätt"-kort visas bara om chatt finns (Elin har chattar → ska synas, med riktig titel), "Prov på gång?" i rail, inget integral-citat, inget Tips-kort.
- [ ] **Step 4:** Slutcommit om något justerats: `fix(web): justeringar efter dashboard-verifiering`.

---

## Self-review

- **Spec Del 2.1 (lärare):** chips, hjälte-insikt, Idag, rail Dina klasser + Snabbt → Task 2. ✓ (Avvikelse: Snabbt länkar "Mina lektioner"/"Delade prov" i stället för "Ladda upp material"/"Dela prov" eftersom uppladdning kräver vald lektion — ärligt riktiga länkar.)
- **Spec Del 2.2 (elev):** ask-box-hjälte, villkorat Fortsätt, rail kurser + Plugga inför prov, citat bort → Task 3. ✓
- **Påhittad data borttagen:** integral-citatet (Task 3 Step 4), elevens Tips-kort (Step 5). ✓
- **i18n:** alla nya strängar via dict sv+en (Task 1). ✓
- **min-w-0** på grid-barn bevaras (Fas A). ✓
