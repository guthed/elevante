# Klassprov — genereringsanimation + elevnotis

**Datum:** 2026-06-24
**Status:** Godkänd design, redo för implementationsplan

---

## Bakgrund & syfte

Två demo-polish-tillägg till den nyligen byggda Klassprov-featuren
(se `2026-06-24-klassprov-design.md`):

1. **Genereringsanimation.** När läraren trycker "Generera utkast" görs ett
   blockerande Claude-anrop som tar ~15–40 s. Idag får läraren ingen
   återkoppling utöver en disablad knapp. Vi vill visa en animation med en
   uppräknande procent så det känns som att något händer.

2. **Elevnotis om nytt prov.** När ett prov publicerats finns det i elevens
   lista, men inget uppmärksammar eleven på det vid inloggning. Vi vill ha en
   tydlig notis så eleven faktiskt ser och gör provet.

---

## Beslut (från brainstorming)

1. **Progress = simulerad %.** Genereringen är ett enda blockerande
   server-action-anrop utan löpande progress-signal. Vi visar en *uppskattad*
   procent (mjuk uppräkning), inte verklig. Ingen ombyggnad till streaming.
2. **Elevnotis = banner på översikten + menyprick.** Inte en toast (för lätt att
   missa). Banner på elevens startsida + en prick/antal på "Klassprov" i menyn.

"Nytt prov" = publicerat klassprov i elevens klass som hen inte lämnat in
(`status==='published'` och ingen submission). Stängda prov räknas inte.
Ingen "läst"-status spåras — allt härleds från live-data och släcks automatiskt
när eleven lämnat in.

---

## Del 1 — Genereringsanimation

### Komponent
Ny klientkomponent `GenerationProgress.tsx` (i
`app/[locale]/app/[role]/klassprov/nytt/`). Renderas av `ClassTestBuilder` som
ett **overlay-kort** (centrerat, halvtransparent backdrop) när formuläret är i
pending-läge.

### Beteende
- En **progress-ring** (SVG-cirkel, `stroke-dashoffset`) som animerar en
  *simulerad* procent från `0` mot ett tak på `~92%` över ~25 s med en
  avtagande easing (snabbt först, saktar mot taket — fastnar aldrig på 100 %
  i förtid). Implementeras med `requestAnimationFrame` eller en `setInterval`
  som ökar mot taket: `pct += (cap - pct) * k` per tick (asymptotisk).
- **Roterande statustext** styrd av procenten:
  - `< 30%`: "Läser lektionernas transkript…"
  - `30–70%`: "Skapar frågor…"
  - `>= 70%`: "Färdigställer provet…"
- Efter ~30 s visas en lugnande rad: "Det kan ta upp till en minut…".
- Procenten visas i ringens mitt (heltal) med en liten "ungefär"-markör
  (texten "uppskattat" eller `~` före siffran).
- `prefers-reduced-motion`: hoppa över uppräkningen, visa en statisk
  spinner + statustext istället.

### Klart/fel-hantering
- `createClassTestDraft` redirectar till editorn vid framgång → hela
  `nytt`-sidan (inkl. overlay) unmountas. Det är "100 % / klart".
- Vid fel returnerar action:en `void` → Next re-renderar `nytt`-sidan →
  overlayn försvinner (klient-state nollställs) och formuläret är tillbaka.
  Acceptabelt för V1 (inget explicit felmeddelande krävs).
- Overlayn behöver alltså inte ett eget "klar"-tillstånd — den lever bara så
  länge sidan är kvar.

### Koppling till formuläret
`ClassTestBuilder` har redan `submitting`-state (`onSubmit={() =>
setSubmitting(true)}`). När `submitting` blir `true` renderas
`<GenerationProgress />` som overlay. Formuläret postar som vanligt till
`createClassTestDraft` (oförändrad action).

---

## Del 2 — Elevnotis (banner + menyprick)

### Data-helper
Ny funktion i `lib/data/class-test.ts`:

```typescript
export type StudentNewTest = { testId: string; title: string };

/** Publicerade klassprov i elevens klasser som hen inte lämnat in. */
export const getStudentNewTests = cache(
  async (studentId: string): Promise<StudentNewTest[]> => { ... }
);
```

Återanvänder `getStudentClassTests(studentId)` och filtrerar
`status === 'published' && submissionStatus === null`. Wrappas i React `cache()`
så att layouten och översiktssidan (båda kör per request) delar ett anrop.

### Banner på elevens översikt
`StudentHome` får en ny prop `newTests: StudentNewTest[]`. Överst i vyn (före
befintligt innehåll), om `newTests.length > 0`, renderas ett coral-tonat kort:
- Rubrik: "Du har {n} nytt prov" / "{n} nya prov" (singular/plural via i18n).
- Lista provtitlar (eller den enda titeln inline).
- CTA: "Gör provet" → `/{locale}/app/student/klassprov/{testId}` om exakt ett
  prov, annars "Till klassprov" → `/{locale}/app/student/klassprov`.

`[role]/page.tsx` (student-grenen) hämtar `getStudentNewTests(profile.id)` och
skickar in `newTests`.

### Menyprick

Vald koppling (entydig): `navBadges` skickas som en map och AppShell mappar in
den på rätt nav-item via `id`. `lib/app/nav.ts` (`navFor`) lämnas **orört** och
fortsätter producera statiska items med `id`.

- `AppShell` får en ny prop `navBadges?: Partial<Record<NavId, number>>`.
- I AppShell, när nav-items byggs/skickas vidare till `Sidebar`/`MobileNav`,
  sätts `badge: navBadges?.[item.id]` på varje item.
- `SidebarNav` och `MobileNav` utökar sin lokala `NavItem`-typ med
  `id: NavId` (om den inte redan finns) + `badge?: number`. AppShell skickar
  redan `id` vidare i detta steg.
- `[role]/layout.tsx` (server): för `role === 'student'` beräknas
  `getStudentNewTests(profile.id).length` och skickas som
  `navBadges={{ classTests: n }}`. `cache()` gör att detta inte dubbel-frågar
  mot översiktssidan.
- `SidebarNav`: rendera en liten prick/siffra bredvid etiketten när `badge > 0`.
- `MobileNav`: rendera en prick på "Klassprov"-ikonen när `badge > 0`.

### Försvinner automatiskt
Allt härleds från live-data. När eleven lämnat in → `submissionStatus='graded'`
→ filtret exkluderar provet → banner och prick släcks. Ingen seen-state.

---

## Filer

**Skapas:**
- `apps/web/app/[locale]/app/[role]/klassprov/nytt/GenerationProgress.tsx`

**Modifieras:**
- `apps/web/app/[locale]/app/[role]/klassprov/nytt/ClassTestBuilder.tsx` — visa overlay vid `submitting`.
- `apps/web/lib/data/class-test.ts` — `getStudentNewTests` (cache()-wrappad) + `StudentNewTest`-typ.
- `apps/web/app/[locale]/app/[role]/layout.tsx` — beräkna `navBadges` för elever.
- `apps/web/components/app/AppShell.tsx` — ta emot + vidarebefordra `navBadges`.
- `apps/web/components/app/Sidebar.tsx` — vidarebefordra badge till SidebarNav.
- `apps/web/components/app/SidebarNav.tsx` — rendera prick/antal.
- `apps/web/components/app/MobileNav.tsx` — `id`+`badge?` på lokal NavItem-typ, rendera prick på ikon.
- `apps/web/lib/app/nav.ts` — lämnas orört (badge mappas in via `navBadges` på `id` i AppShell).
- `apps/web/components/app/student/StudentHome.tsx` — `newTests`-prop + banner.
- `apps/web/app/[locale]/app/[role]/page.tsx` — hämta + skicka `newTests` (student-grenen).
- `apps/web/lib/i18n/types.ts`, `locales/sv.ts`, `locales/en.ts` — nya strängar.

---

## i18n-strängar (sv / en)

Lägg i `klassprov`-gruppen (eller en passande grupp):
- `generating`: "Genererar prov…" / "Generating test…"
- `genReadingTranscript`: "Läser lektionernas transkript…" / "Reading lesson transcripts…"
- `genCreatingQuestions`: "Skapar frågor…" / "Creating questions…"
- `genFinalizing`: "Färdigställer provet…" / "Finalizing the test…"
- `genTakesAMoment`: "Det kan ta upp till en minut…" / "This can take up to a minute…"
- `newTestSingular`: "Du har 1 nytt prov" / "You have 1 new test"
- `newTestPlural`: "Du har {n} nya prov" / "You have {n} new tests"
- `doTheTest`: "Gör provet" / "Take the test"
- `toClassTests`: "Till klassprov" / "To class tests"

(Pluralinterpolation: följ befintligt mönster i repot — om det inte finns
`{n}`-interpolation, formatera i komponenten.)

---

## QA-krav

- [ ] Inga hårdkodade strängar; sv + en kompletta.
- [ ] `prefers-reduced-motion` respekteras i animationen.
- [ ] WCAG AA: progress-ringen har `role="status"`/`aria-live` med textversion;
      banner är en länk/knapp med tydlig etikett; menypricken har `aria-label`
      eller en `sr-only`-text ("{n} nya prov").
- [ ] Procenten kommunicerar att den är uppskattad (inte exakt).
- [ ] Banner och prick försvinner när eleven lämnat in (verifieras live).
- [ ] Responsivt 375 → 1440px (overlay centreras, banner staplar på mobil).
- [ ] Ingen ny TypeScript `any` utan kommentar.

---

## Inte i scope

- Verklig streaming-progress (kräver async/streaming-arkitektur).
- Notis när ett *resultat släpps* (separat, ev. uppföljning).
- Push/e-postnotiser — bara in-app.
