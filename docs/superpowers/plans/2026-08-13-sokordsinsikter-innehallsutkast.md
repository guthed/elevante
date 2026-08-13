# Sökordsinsikter → innehållsutkast + veckovis triage-påminnelse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge Sökordsinsikter-triagelistan en väg till faktiskt innehåll: en dokumenterad process för att skriva SEO/AEO-anpassade blogginlägg på begäran (grundade i Argument-databasen), plus ett veckovis notis-jobb som föreslår vilka rader som är värda ett utkast och flaggar teman utan bra argumenttäckning.

**Architecture:** Inget nytt applikationskod. Del A är ett dokumenterat arbetssätt (en Claude-minnesfil, samma mönster som befintlig blogg-ingestion) som exekveras i en chattsession på begäran, och skriver resultatet direkt som en Notion-undersida. Del B är ett schemalagt cloud-agent-jobb (samma mekanism som andra rutiner i det här projektet) som läser Notion via MCP och skickar en notis — inget skrivs eller ändras av jobbet.

**Tech Stack:** Notion MCP (`mcp__6116c3ad-9758-4839-9bb3-e62295a45c83__*`) för att läsa/skriva sidor, projektets schemaläggningsmekanism (`schedule`-skillet / `CronCreate`) för det veckovisa jobbet, Claudes minnessystem för processdokumentationen.

Referens: [docs/superpowers/specs/2026-08-13-sokordsinsikter-innehallsutkast-design.md](../specs/2026-08-13-sokordsinsikter-innehallsutkast-design.md)

---

### Task 1: Skriv processdokumentationen som en minnesfil

**Files:**
- Create: `/Users/johnguthed/.claude/projects/-Users-johnguthed-elevante/memory/sokordsinsikter-content-drafts.md`

- [ ] **Step 1: Skapa minnesfilen med hela processen**

```markdown
---
name: sokordsinsikter-content-drafts
description: Process för att skriva SEO/AEO-anpassade blogginlägg på begäran utifrån Sökordsinsikter-rader, grundat i Argument-databasen
metadata:
  type: project
---

**Trigger:** John pekar på en rad i 🔍 Sökordsinsikter (id `effad1ec-7444-43ea-927c-d792bc4b0b9f`)
eller nämner ett ämne direkt. Generera aldrig ett utkast ombedd.

**Grundmaterial, i prioritetsordning:**
1. Triageraden själv — sökfråga/ämne + dess mätvärden (GSC: Klick/Visningar/CTR/Position;
   GA4: sessioner/engagemang via Klick-fältet; Google Trender: Kommentar/Period).
2. Befintliga inlägg i `apps/web/content/blog/*.md` — skummas för att undvika dubbletter och
   för att träffa samma tonalitet.
3. 💡 Argument-databasen (data source id `6f9ba123-6ab2-4667-9893-553ff13fcd5e`, under
   📚 Research, id `36184c8f-289e-812a-97ce-d6e043710cf0`) — matchas mot ämnets tema, plockar
   redan godkänd siffra/citat/styrka med källhänvisning.
4. Externa, källbelagda siffror bara när Argument-databasen inte redan täcker det specifika
   påståendet — citera, samma standard som redan gäller på `/priser` och `/vad-kostar-elevante`.

**Prioriteringshinkar** (används både här och av det veckovisa jobbet):

| Hink | Signal |
|---|---|
| 🟢 Snabb vinst | GSC Position ~4–20, Visningar > 0 |
| 🟡 Riktig lucka | GSC Visningar > 20, Position > 20 eller saknas |
| 🔵 AEO-först | Sökfråga är ett tydligt frågeformat ("vad är", "hur fungerar", "vad kostar") |
| 🟠 Timing | Källa = Google Trender, Kommentar nämner "stigande" |

**Struktur på utkastet:**
- Svensk brödtext. Rubrik/struktur matchar sökfrågans intention (SEO). Ett tidigt, tydligt,
  fristående svarsstycke (AEO) — något en AI-svarstjänst kan citera på egen hand.
- Frontmatter enligt ingestion-pipelinen: `title`, `description` (140–160 tecken), `date`,
  `category` (en av: "Om Elevante", "Lärare", "Elever", "Skola & system", "Teknik",
  "GDPR & juridik", "AI i skolan").
- En kort "Varför det här ämnet"-callout överst på Notion-sidan: vilken triagerad, vilken hink,
  källmätvärdena, och vilka Argument-databas-teman som användes.

**Var det hamnar:** ny undersida direkt under ✍️ Blogg (id `f6286b9d41244cef90100416ce3a1f4e`),
titel `🔸 UTKAST — <arbetstitel>`. Skapas med min egen Notion MCP-integration — INTE appens
`NOTION_TOKEN`/"Elevante leads" (se `notion-app-integration`-minnet), eftersom jag skapar sidan
direkt i en chatt, inte den deployade appen.

**Skyddsräcken:**
- Fabricera aldrig en siffra eller ett citat. Är underlaget tunt för ett specifikt påstående,
  flagga det i utkastet ("obekräftat, behöver källa") istället för att gissa.
- Inga kundnamn i offentlig text.
- `🔸 UTKAST`-prefixet är den enda spärren mot att ett ogranskat utkast råkar ingestas — ta bara
  bort det när John godkänt sidan. Efter godkännande är ingestionen oförändrad (se
  `blog-ingestion`-minnet).
```

- [ ] **Step 2: Verifiera att filen skrevs korrekt**

Läs tillbaka filen och bekräfta att frontmatter har `name: sokordsinsikter-content-drafts`,
`description`, och `metadata.type: project`, och att alla fyra sektioner (Trigger, Grundmaterial,
Struktur, Var det hamnar, Skyddsräcken) finns med.

- [ ] **Step 3: Commit**

Minnesfiler ligger utanför git-repot (`~/.claude/projects/...`), så inget att committa här —
gå direkt vidare till Task 2.

---

### Task 2: Lägg till minnet i indexet

**Files:**
- Modify: `/Users/johnguthed/.claude/projects/-Users-johnguthed-elevante/memory/MEMORY.md`

- [ ] **Step 1: Lägg till en indexrad**

Lägg till följande rad i listan, alfabetiskt/tematiskt nära `notion-app-integration`-raden:

```markdown
- [Sökordsinsikter content drafts](sokordsinsikter-content-drafts.md) — process för att skriva SEO/AEO-blogginlägg på begäran från triagerader, grundat i Argument-databasen; hinkarna för prioritering
```

- [ ] **Step 2: Verifiera**

```bash
grep -n "sokordsinsikter-content-drafts" "/Users/johnguthed/.claude/projects/-Users-johnguthed-elevante/memory/MEMORY.md"
```

Expected: en träff, raden syns i filen.

---

### Task 3: Registrera det veckovisa triage-notis-jobbet

**Files:** inga (extern registrering via schemaläggningsverktyget)

- [ ] **Step 1: Ladda schemaläggningsverktygets aktuella schema**

Kör `ToolSearch` med `query: "select:CronCreate,CronList"` (eller invokera `schedule`-skillet om
den föredras) för att se exakt vilka parametrar som krävs — cron-syntax och tidszon-hantering
kan skilja sig, så bekräfta formatet innan nästa steg.

- [ ] **Step 2: Skapa jobbet**

Registrera ett veckovis jobb, måndagar ca kl 08:00 (två timmar efter `sokordsinsikter`-cronjobbets
06:00-körning som fyller på Notion-listan), med exakt denna instruktionstext:

```
Läs Notion-databasen 🔍 Sökordsinsikter (id effad1ec-7444-43ea-927c-d792bc4b0b9f) och hämta alla
rader med Status = Ny som skapats sedan förra veckans körning.

Tillämpa denna prioriteringsheuristik på varje rad:
- 🟢 Snabb vinst: GSC-rad, Position mellan 4 och 20, Visningar > 0
- 🟡 Riktig lucka: GSC-rad, Visningar > 20, och Position > 20 eller saknas
- 🔵 AEO-först: Sökfråga/Sida innehåller ett frågeord ("vad är", "hur fungerar", "vad kostar", "varför")
- 🟠 Timing: Källa = Google Trender och Kommentar nämner "stigande"

Ranka de 3–5 mest lovande raderna. Hämta sedan 💡 Argument-databasen (data source id
6f9ba123-6ab2-4667-9893-553ff13fcd5e, under 📚 Research) och jämför varje kandidatrads tema mot
Argument-databasens temataggar. Flagga rader vars tema saknar eller har svag täckning där.

Skicka ett sammanfattande meddelande till John med: de rankade kandidaterna (rad, hink, kort
motivering), och separat, eventuella tema-luckor i Argument-databasen. Skriv inget och ändra
inget i Notion — bara ett meddelande. Om inga nya rader finns sedan förra veckan, skicka inget
meddelande alls.
```

- [ ] **Step 3: Verifiera att jobbet registrerades**

Kör `CronList` och bekräfta att jobbet syns med rätt cron-schema (veckovis, måndag) och att
instruktionstexten från Step 2 sparades ordagrant.

---

### Task 4: Skarp testkörning — skriv ett riktigt utkast end-to-end

**Files:** inga lokala filer — output är en Notion-sida

- [ ] **Step 1: Välj en riktig kandidatrad**

Fråga 🔍 Sökordsinsikter-databasen (id `effad1ec-7444-43ea-927c-d792bc4b0b9f`) via
`notion-query-database-view` eller `notion-fetch`, filtrera på Status = Ny, och välj den rad som
bäst matchar en av de fyra hinkarna från Task 1 (helst 🟢 Snabb vinst eller 🟡 Riktig lucka —
tydligast att bedöma).

- [ ] **Step 2: Följ grundmaterial-ordningen från minnesfilen**

1. Läs radens fullständiga fält (Sökfråga/Sida, Källa, Klick, Visningar, CTR, Position).
2. Skumma filnamnen i `apps/web/content/blog/` (`ls apps/web/content/blog/`) för att se om ämnet
   redan är täckt.
3. Sök 💡 Argument-databasen (data source `6f9ba123-6ab2-4667-9893-553ff13fcd5e`) efter samma
   tema och plocka relevanta argument.

- [ ] **Step 3: Skriv utkastet**

Skriv fullständig text enligt strukturen i minnesfilen: rubrik, meta-beskrivning (140–160 tecken),
kategori, brödtext med ett tidigt AEO-svarsstycke, och "Varför det här ämnet"-callouten överst.

- [ ] **Step 4: Skapa Notion-sidan**

Använd `notion-create-pages` med `parent` satt till ✍️ Blogg (id `f6286b9d41244cef90100416ce3a1f4e`)
och titel `🔸 UTKAST — <den faktiska arbetstiteln från Step 3>`.

- [ ] **Step 5: Verifiera**

Kör `notion-fetch` på den nya sidans id och bekräfta att den ligger som undersida under ✍️ Blogg,
att titeln har `🔸 UTKAST — `-prefixet, och att brödtexten inte är tom.

- [ ] **Step 6: Rapportera till John**

Ge honom en direkt Notion-länk till sidan för genomläsning. Inget annat sker automatiskt förrän
han har godkänt eller redigerat.

---

### Task 5: Trigga det veckovisa jobbet manuellt och verifiera output

**Files:** inga

- [ ] **Step 1: Kör jobbet manuellt**

Använd schemaläggningsverktygets "kör nu"-funktion (bekräfta exakt kommando via samma
`ToolSearch`-uppslag som i Task 3, Step 1) på jobbet från Task 3, utan att vänta till nästa
måndag.

- [ ] **Step 2: Verifiera meddelandet**

Bekräfta att ett meddelande kom fram med rankade kandidatrader (eller inget meddelande, om inga
nya rader fanns sedan senast — det är också ett korrekt utfall) och eventuella tema-luckor.

- [ ] **Step 3: Verifiera att jobbet inte skrev något**

Kontrollera att antalet rader i 🔍 Sökordsinsikter och antalet argument i 💡 Argument-databasen
är oförändrat efter körningen — jobbet ska bara läsa och notifiera, aldrig skriva.

---

### Task 6: Slut för loopen — uppdatera minnesfil och CLAUDE.md

**Files:**
- Modify: `/Users/johnguthed/.claude/projects/-Users-johnguthed-elevante/memory/sokordsinsikter-content-drafts.md`
- Modify: `/Users/johnguthed/elevante/CLAUDE.md`

- [ ] **Step 1: Lägg till en bekräftelserad i minnesfilen**

Lägg till en sista rad i filen från Task 1, med de faktiska värdena från Task 4 och 5:

```markdown

Bekräftat 2026-08-13 med en skarp testkörning: utkast skrivet för raden "<den faktiska
sökfrågan/ämnet från Task 4>" → <Notion-URL från Task 4, Step 4>. Det veckovisa jobbet
kördes manuellt (Task 5) och gav <kort resultat: "N kandidater + M tema-luckor" eller "inget
meddelande, inga nya rader">.
```

- [ ] **Step 2: Lägg till Fasminne-post i CLAUDE.md**

Lägg till en ny rad under `### Fas 8` och senare poster i `## Fasminne`-sektionen (samma
komprimerade stil som grannraderna), t.ex.:

```markdown
### Sökordsinsikter → innehållsutkast + triage-påminnelse: KLAR (2026-08-13)
`/api/cron/sokordsinsikter` (GSC+GA4 veckovis, Google Trender manuellt) får nu en väg till
innehåll: en dokumenterad process (Claude-minne `sokordsinsikter-content-drafts`) skriver
SEO/AEO-anpassade utkast på begäran som `🔸 UTKAST`-undersidor under ✍️ Blogg, grundade i
💡 Argument-databasen (104 argument/34 rapporter) + befintliga inlägg + källbelagda externa
siffror vid behov. Fyra prioriteringshinkar (snabb vinst/riktig lucka/AEO-först/timing) motiverar
varje val. Ett schemalagt veckojobb (måndagar, efter datainsamlingen) föreslår kandidatrader och
flaggar teman utan argumenttäckning — notifierar bara, skriver aldrig något själv. Ingen ny
app-kod. Spec+plan i `docs/superpowers/`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: logga sökordsinsikter-innehållsutkast + triage-påminnelse i Fasminnet

Dokumenterad utkastsprocess + veckovis notis-jobb verifierat med en skarp
testkörning (riktigt utkast skapat, jobbet kört manuellt).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(Minnesfilen i `~/.claude/projects/...` ligger utanför repot och committas inte.)

- [ ] **Step 4: Verifiera**

```bash
git log -1 --stat
```

Expected: senaste committen visar `CLAUDE.md` ändrad, inget annat.
