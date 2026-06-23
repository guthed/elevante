# Redesign — inloggade vyer (lärare & elev)

**Datum:** 2026-06-23
**Status:** Godkänd riktning, redo för implementationsplan
**Omfattning:** Alla inloggade vyer för roller `student` och `teacher`. Admin berörs endast av den gemensamma mobilnavigeringen (gratis bieffekt), inte av vy-omdesign.

---

## Bakgrund & mål

De inloggade vyerna är byggda i "Editorial Calm" och ser lugna ut, men tre problem återkommer:

1. **Mobil saknar navigering helt.** `Sidebar` är `hidden md:flex` ([Sidebar.tsx:75](../../../apps/web/components/app/Sidebar.tsx#L75)) och `Topbar` har bara två placeholder-ikoner. Under 768px kan användaren inte byta vy.
2. **Ytan utnyttjas passivt på laptop.** 8/4-grid där högerkolumnen ofta bär ett dekorativt citat-/tipskort, mycket luft uppe, och passiva sifferrader utan ingångar.
3. **Otydlig primär handling + påhittad data.** Elevens "Fortsätt där du slutade" är hårdkodat, och varken elev eller lärare möts av sin kärnhandling överst.

**Mål:** Tydligare hierarki, bättre ytutnyttjande på både laptop (≥768px) och mobil (375px), med varje rolls kärnvärde överst — utan att tappa det andningsbara uttrycket.

**Designprinciper (gäller alla vyer):**

- **Kärnhandling överst.** Elev = *ställ en fråga*. Lärare = *se var eleverna fastnar*.
- **Ingen dekorativ utfyllnad.** Citat-/tipskort tas bort. Premium-yta bär riktig, handlingsbar data.
- **Ingen påhittad data i riktiga vyer.** Antingen riktig data eller villkorad döljning/empty-state.
- **Mobil först för navigering, laptop först för densitet.** Bottom-nav på mobil; tätare innehåll på laptop.
- **Behåll Editorial Calm-tokens** (ivory canvas, ink, sand/sage/coral, Newsreader + Geist + JetBrains Mono). Ingen ny färgpalett.

---

## Del 1 — Gemensamt skal

### 1.1 Mobil bottom-nav (ny komponent)

Ny klientkomponent `components/app/MobileNav.tsx`, renderas i `AppShell` och syns endast `< md` (`md:hidden`). Fast i botten, full bredd.

- **Innehåll per roll** återanvänder `itemsFor(role, base, dict)` från `Sidebar.tsx` (en källa till sanning). Visar ikon + kort etikett per destination.
  - **Elev (5):** Hem · Bibliotek · Fråga (chat) · Provplugg · Profil. "Fråga" centreras visuellt som huvudhandling.
  - **Lärare (4):** Översikt · Klasser · Lektioner · Prov.
  - **Admin (6):** befintliga admin-items får också nav (utanför omdesign-scope men slipper vara trasiga på mobil).
- **Aktiv vy** markeras via `usePathname()` med samma logik som `SidebarNav` (overview = exakt match, övriga = prefix-match).
- **Tillgänglighet:** touch-targets ≥ 44px höjd, `aria-current="page"` på aktiv, `prefers-reduced-motion` respekteras, `env(safe-area-inset-bottom)` padding för iPhone-home-indicator.
- **Ikoner:** stroke-ikoner i linje med befintlig Topbar-stil (1.5 stroke).

`AppShell` lägger `pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0` på `<main>` så att bottom-nav aldrig täcker innehåll.

**Undantag — fokusläge:** I aktiv chatt-tråd (`/student/chat/[id]`) döljs bottom-nav så att meddelande-fältet kan sitta längst ned. Tillbaka sker via sid-header. (Se 3.1.)

### 1.2 Topbar — städning

[Topbar.tsx](../../../apps/web/components/app/Topbar.tsx) idag = två döda ikoner.

- **Ta bort** både sök- och notis-ikonen (global sök byggs som separat uppgift senare).
- **Mobil:** Topbar visar Elevante-ordmärket till vänster (eftersom `Sidebar` med varumärket är dolt på mobil). Slimmad rad, ~52px.
- **Laptop:** Topbar renderar inget innehåll längre (varumärket finns i sidomenyn). Antingen tas raden bort på `md+` eller kollapsas till noll höjd så att sidinnehållet börjar högre upp och vinner vertikal yta.
- Skip-to-content-länken i `AppShell` behålls.

`dict.app.topbar.search/notifications` blir oanvända — lämna kvar i ordlistan (skadar inte) eller städa; ej blockerande.

### 1.3 Sidomeny (laptop) — oförändrad

`Sidebar` på `md+` behålls i grunden. (Eventuella ikoner per nav-item är out of scope.) Undantag: namnraden längst ned blir en länk till kontosidan (se 1.4).

### 1.4 Kontosida — delad för alla roller (tillagd 2026-06-23, byggd i Fas A)

Ny route `/app/[role]/konto` med en gemensam vy för elev, lärare och admin (`konto/page.tsx` + klientkomponent `AccountForms.tsx`). Tidigare saknades helt en konto-/inställningsvy.

- **Innehåll:** Profil (namn redigerbart, e-post skrivskyddad), Säkerhet (byt lösenord — nytt + bekräfta, min 8 tecken), Språk (sv/en via `LanguageSwitcher`), Logga ut.
- **Nås via:** namnraden i sidomenyn (laptop) och konto-ikon till höger i toppraden (mobil). Ligger medvetet **inte** i bottom-nav (full med 5 elev-flikar).
- **Server actions:** `app/actions/account.ts` — `updateProfileName` (RLS `profiles_update_self`) och `updatePassword` (`supabase.auth.updateUser`). Manuell validering enligt befintligt mönster (auth.ts/admin.ts).
- **Utanför v1:** byta e-post, notisinställningar, avatar-uppladdning, radera konto.

---

## Del 2 — Dashboards

### 2.1 Lärare — `/teacher` ([TeacherDashboard.tsx](../../../apps/web/components/app/teacher/TeacherDashboard.tsx))

Godkänd "förslag"-mockup. Ändringar:

- **Kompakt header:** hälsning + datum mindre; de fyra siffrorna flyttas till **kompakta chips** bredvid hälsningen (`4 kurser · 86 elever · 3 klasser`) istället för en egen stor sifferrad med divider.
- **Hjälte-kort (nytt, överst):** "Veckans insikt" — det koncept flest elever frågat om denna vecka, med mini-heatmap-glimt + knapp "Se vad de undrar →" som leder till relevant lektion/insiktsvy. Drivs av befintlig insikts-data (`insightRows` / `MiniHeatmap`-underlaget).
- **Idag-lista:** behålls, med statusetikett synlig.
- **Höger rail:** "Dina klasser" (riktiga länkar) + nytt "Snabbt"-kort (Ladda upp material, Dela ett prov). **Citat-/tipskortet tas bort.**

### 2.2 Elev — `/student` ([StudentHome.tsx](../../../apps/web/components/app/student/StudentHome.tsx))

Godkänd "förslag"-mockup (variant A). Ändringar:

- **Fråge-ruta som hjälte (nytt, överst):** "Vad undrar du om det du lärt dig?" med ett input/CTA-fält som leder in i chatt, plus 2 exempel-chips (t.ex. "Sammanfatta dagens biologi", "Förhör mig på derivata"). Detta är elevens kärnhandling.
- **Dagens lektioner:** behålls; "Inga fler lektioner idag"-raden behålls bara när det finns lektioner.
- **"Fortsätt där du slutade":** **villkoras på riktig senaste chatt.** Finns ingen → kortet döljs helt (ingen påhittad integral-text). Finns en → visa riktig fråga + svarsutdrag.
- **Höger rail:** "Dina kurser" (riktiga länkar) + "Prov på gång?" → Plugga inför prov. **Citat-/tipskortet tas bort.**

---

## Del 3 — Innersidor (per vy)

Alla ärver designprinciperna under *Bakgrund & mål*. Nedan endast vy-specifika ändringar.

### Elev

**3.1 Chatt — `/student/chat` + `/student/chat/[id]`** ([ChatThread.tsx](../../../apps/web/components/app/ChatThread.tsx))
- Landning: lägg till exempel-prompt-chips (samma språk som dashboardens fråge-ruta) för att varm-starta. Historik-sidofältet (3-col) breddas något (history känns hopträngt).
- Tråd: **fokusläge på mobil** — dölj bottom-nav, meddelande-fältet pinnas längst ned (ovanför tangentbordet), tillbaka via header. Ta bort "mock"-notisen när riktig RAG svarar.

**3.2 Lektionsdetalj — `/student/lektioner/[id]`** ([StudentLessonDetail.tsx](../../../apps/web/components/app/student/StudentLessonDetail.tsx))
- 7/5-grid behålls på laptop. **Mobil-ordning:** sammanfattning → chat-CTA/fält → föreslagna frågor (som chips) → material sist. Idag kan den långa frågelistan trycka ned chatten under skärmkanten.

**3.3 Bibliotek — `/student/bibliotek`**
- Höger rail visar idag max 4 kurser (`slice(0,4)`). Visa alla eller lägg "Visa fler". I övrigt behålls 8/4 + filter-pills.

**3.4 Provplugg — `/student/provplugg` + `/[id]`**
- Behåll flödet. Resultat-/test-vyn: knapp-raden (dela/gör om) **staplas i full bredd på mobil** istället för att radbrytas osnyggt. Den stora poäng-siffran skalas ned något på mobil.

**3.5 Lärprofil — `/student/profil`**
- Idag en smal `max-w-2xl`-kolumn. Utnyttja laptop-ytan bättre: sammanfattning överst i full bredd, styrkor/utvecklingsområden i 2-col (stackar på mobil — befintligt). Empty-state behålls.

**3.6 Transkript — `/student/lektioner/[id]/transkript`**
- Lägg **"Kopiera"-knapp**. `<pre>` i JetBrains Mono med radbrytning så långa rader inte ger horisontell scroll på mobil.

### Lärare

**3.7 Lektionslista — `/teacher/lektioner`**
- Idag `<table>` med `overflow-x-auto` (dålig mobil-UX). **Responsivt mönster:** tabell på `md+`, **staplade radkort på mobil** (datum + kurs/klass + statusbadge). Behåll statusfilter-pills. Notera behov av paginering/lazy-load vid många lektioner (kan tas som separat steg).

**3.8 Lektionsdetalj — `/teacher/lektioner/[id]`** ([TeacherLessonDetail.tsx](../../../apps/web/components/app/teacher/TeacherLessonDetail.tsx))
- Header: de 4 stat-tiles → **kompakta chips** (konsekvent med dashboarden).
- **InsightHeatmap** är vyns kärna men spricker på mobil (för bred). Mönster: horisontell scroll med **sticky första kolumn** (elevnamn) + minsta cellstorlek på `md+`; **mobil-fallback** = lista per koncept (återanvänd `ConceptQuestionList`-stilen) istället för rutnät.
- Transkript-blocket: på mobil kollapsas bakom disclosure eller länkas till `/transkript`; på laptop kvar i 8-col.

**3.9 Insikts-drawer** ([InsightDrawer.tsx](../../../apps/web/components/app/teacher/InsightDrawer.tsx))
- Idag 448px höger-panel — klumpig på telefon. **Mobil:** gör om till bottom-sheet (glider upp, full bredd, safe-area, scroll-containment). Laptop: behåll höger-panel.
- [StudentProfileCard.tsx](../../../apps/web/components/app/teacher/StudentProfileCard.tsx): ersätt hårdkodad etikett `"NA1A · Biologi 1"` med riktig data.

**3.10 Klasser — `/teacher/klasser` + `/[id]`**
- Lista: 3-col kort behålls; lägg indikator för tom/kommande klass.
- Detalj: 2-col (1fr + 360px sticky) behålls; medlemslistan kan behöva paginering vid många elever (separat steg).

**3.11 Delade prov — `/teacher/prov` + `/[id]`**
- Empty-state får en förklarande CTA (hur elever delar prov). Poäng görs mer skannbar.
- Transkript-route för lärare ärver kopiera-knapp + radbrytning (3.6).

---

## Del 4 — Genomgående regler (tvärs alla vyer)

- **Responsiv tabell:** mönster "tabell på desktop / radkort på mobil" återanvänds (3.7).
- **Drawer → bottom-sheet på mobil** (3.9) som generellt mönster.
- **Audit & ta bort:** alla dekorativa citat-/tipskort samt hårdkodade demo-strängar (integral-citatet, `"NA1A · Biologi 1"`, m.fl.).
- **i18n:** alla nya strängar via `dict`/`t('key')` — inga hårdkodade strängar (svenska + engelska).
- **WCAG AA:** kontrast, synligt fokus, touch-targets ≥ 44px (särskilt bottom-nav), `aria-current` på aktiva nav-länkar.
- **Responsivt verifieras** på 375 / 768 / 1280 / 1440px.
- **Motion:** befintliga cubic-bezier/240–320ms; `prefers-reduced-motion` respekteras.
- **Inga TODO-kommentarer; inga `any` utan kommentar** (CLAUDE.md QA-krav).

---

## Föreslagen fasindelning (för implementationsplanen)

- **Fas A — Skal:** `MobileNav`, Topbar-städning, `<main>`-padding. *Låser upp hela mobilen direkt.*
- **Fas B — Dashboards:** lärare + elev (Del 2).
- **Fas C — Högtrafik-vyer:** elev-chatt (3.1), elev-lektionsdetalj (3.2), bibliotek (3.3); lärar-lektionslista (3.7) + lektionsdetalj/heatmap (3.8).
- **Fas D — Resterande:** provplugg/test (3.4), profil (3.5), transkript (3.6), klasser (3.10), delade prov (3.11), drawer→sheet (3.9).

---

## Utanför scope

- Global sök (egen uppgift; topbar-ikonerna tas bort tills vidare).
- Notis-system.
- Admin-vyernas omdesign (får bara mobil-nav).
- Paginering/virtualisering av långa listor (noteras som separata steg där det behövs).
- Ny färgpalett eller typografi.
