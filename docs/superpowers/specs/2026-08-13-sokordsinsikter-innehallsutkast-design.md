# Sökordsinsikter → innehållsutkast, och en veckovis triage-påminnelse

Status: godkänd, redo för implementationsplan
Datum: 2026-08-13

## Bakgrund

`/api/cron/sokordsinsikter` (se `CLAUDE.md`-fasminnet "Skol-CRM" och senare poster) samlar
varje måndag ihop sökfrågor från Search Console och landningssidor från GA4 i den delade
Notion-databasen **🔍 Sökordsinsikter**. En tredje källa, Google Trender, saknar officiellt API
och läggs in manuellt en gång i månaden via mallen "🗒️ Trender-loggning – mall" (samma DB,
Källa = Google Trender).

Listan fylls alltså på av sig själv, men två steg saknas för att den ska bli till något:
1. Ingen skriver om raderna till faktiskt innehåll.
2. Ingen påminns om att listan finns, så den riskerar att bara växa utan att ge effekt.

Det här dokumentet specificerar båda styckena, samt en tredje, mindre bit: en påminnelse om att
underhålla **📚 Research**-wikin (💡 Argument-databasen, 104 argument / 34 rapporter), som
innehållsutkasten ska luta sig mot för fakta och positionering.

## Scope

Medvetet snävt, per uttrycklig instruktion ("låt oss inte bli för specifika"):

**Byggs:**
- En dokumenterad arbetsprocess (som blogg-ingestionen redan är) för att skriva ett
  SEO/AEO-anpassat utkast på begäran, grundat i Argument-databasen + befintliga blogginlägg +
  vid behov källbelagda externa siffror.
- Ett veckovis schemalagt jobb som (a) föreslår vilka nya triagerader som är värda ett utkast,
  och (b) flaggar teman i triagelistan som saknar bra täckning i Argument-databasen. Ett enda
  meddelande, inget mer.

**Byggs INTE (explicit, för att hålla scopet litet):**
- Ingen automatisk källbevakning av Skolverket/OECD/TALIS/Eurostat/etc.
- Ingen automatisk extraktion eller uppladdning av nya argument/rapporter — Notions API tillåter
  inte filuppladdning, så PDF-hantering i Argument-databasen förblir helt manuell, som idag.
- Ingen ny app-kod, inget nytt Server Action, ingen ny sida i webbappen. Utkasts-generatorn är
  ett arbetssätt jag (Claude) utför i en chattsession, inte en tjänst som körs av sig själv.
- Ingen automatisk publicering. Allt går genom mänsklig granskning i Notion innan det rör repot.

## Del 1 — Innehållsutkast på begäran

**Trigger:** användaren pekar på en rad i Sökordsinsikter (eller nämner ämnet direkt i en chatt)
och ber om ett förslag. Ingen automatik skriver utkast åt sig själv.

**Grundmaterial, i prioritetsordning:**
1. Den valda triageraden: sökfråga/ämne + dess mätvärden (klick, visningar, CTR, position för
   GSC-rader; sessioner/engagemang för GA4-rader; intressenivå/period för Trender-rader).
2. Befintliga blogginlägg (`apps/web/content/blog/*.md`) — skummas för att undvika dubbletter
   och för att träffa samma tonalitet.
3. 💡 Argument-databasen — matchas mot ämnets tema, plockar redan godkända siffror/citat/styrka
   med källhänvisning.
4. Externa, källbelagda siffror vid behov (samma standard som redan gäller på `/priser` och
   `/vad-kostar-elevante`) — bara när ämnet kräver något Argument-databasen inte redan har.

**Struktur på utkastet:**
- Svensk brödtext, strukturerad för både SEO (rubrik/struktur matchar sökfrågans intention) och
  AEO (ett tidigt, tydligt och fristående svarsstycke, redo att citeras av en AI-svarstjänst).
- Frontmatter-fälten som redan används vid ingestion: titel, meta-beskrivning (140–160 tecken),
  kategori (från den befintliga listan i blogg-ingestionsprocessen: "Om Elevante", "Lärare",
  "Elever", "Skola & system", "Teknik", "GDPR & juridik", "AI i skolan").
- En kort "Varför det här ämnet"-notis överst på Notion-sidan: vilken triagerad, vilken hink
  (se nedan), källmätvärdena, och vilka Argument-databas-teman som användes.

**Var det hamnar:** en ny undersida direkt under **✍️ Blogg** i Notion, med titelprefix
**"🔸 UTKAST — "**. Användaren granskar/redigerar där, precis som med riktiga inlägg. När det är
godkänt (prefixet tas bort) går det in i den redan existerande, oförändrade
ingestion-processen: hämta sidan, skriv `apps/web/content/blog/<slug>.md`, bygg, commit, push.

**Skyddsräcken:**
- Aldrig fabricera statistik eller citat. Är underlaget för tunt för ett visst påstående, flaggas
  det i utkastet ("obekräftat, behöver källa") istället för att gissa.
- Inga kundnamn i offentlig text (gäller redan sajten i stort).
- "🔸 UTKAST"-prefixet är den enda spärren mot att ett ogranskat utkast råkar ingestas — inget
  tekniskt skydd, bara en tydlig konvention.

## Del 2 — Prioriteringsheuristik ("hinkarna")

Används både när ett utkast väljs på begäran och av det veckovisa jobbet (Del 3) för att
motivera sina förslag. Ingen dold poäng — fyra tydliga, förklarbara hinkar:

| Hink | Signal | Vad den betyder |
|---|---|---|
| 🟢 Snabb vinst | Position ~4–20, redan visningar | Konkurrerar redan om frågan — vässa befintlig sida hellre än att skriva nytt |
| 🟡 Riktig lucka | Höga visningar, ingen träff / position >20 | Ingen sida svarar på frågan idag — ny artikel |
| 🔵 AEO-först | Tydligt frågeformat ("vad är", "hur fungerar", "vad kostar") | Värt att äga svaret oavsett volym |
| 🟠 Timing | Stigande Google Trender-intresse | Skriv före toppen, inte efter |

Sista ordet om ett ämne passar Elevantes faktiska expertis och positionering är alltid
mänskligt — hinkarna avgör bara vad som är värt att lyfta fram, inte vad som ska skrivas.

## Del 3 — Veckovis triage-påminnelse (schemalagt jobb)

**Kadens:** en gång i veckan, kort efter att `sokordsinsikter`-cronjobbet (måndag 06:00) fyllt på
Notion-listan med färsk data.

**Vad jobbet gör:**
1. Läser Sökordsinsikter-rader med Status = Ny sedan förra körningen.
2. Kör hink-heuristiken (Del 2) på varje rad, rankar de mest lovande kandidaterna.
3. Jämför de nya radernas teman mot 💡 Argument-databasens temataggar — flaggar teman utan
   stark täckning ("det här kom upp den här veckan, men ni har inget starkt argument om det än").
4. Skickar **ett** sammanfattande meddelande: topp 3–5 utkastkandidater med hink-motivering, plus
   eventuella research-luckor. Inget skrivs eller ändras automatiskt — bara ett meddelande.

**Vad jobbet INTE gör:** skriver inga utkast, rör inte Argument-databasen, hämtar inga nya
källor. Rent notifierande.

**Implementation:** ett schemalagt cloud-agent-jobb (samma mekanism som styr övriga cron-liknande
rutiner i det här projektet), som läser Notion via samma integration som redan används, och
levererar meddelandet som en notis. Ingen ny app-kod.

## Testning / validering

Innan det här räknas som ett stående arbetssätt:
1. En riktig testkörning: ett faktiskt utkast skrivs för en verklig, aktuell rad i
   Sökordsinsikter-listan, och användaren granskar resultatet end-to-end (Notion-sida → struktur
   → källhänvisningar → tonalitet).
2. Det veckovisa jobbet triggas manuellt en gång och verifieras innan det läggs på schema.

## Öppna frågor / medvetet olösta

- Exakt vilken kanal det veckovisa meddelandet levereras via (push-notis vs. chattmeddelande vid
  nästa session) avgörs i implementationsplanen, inte här — påverkar inte designen ovan.
- Ingen lösning för att automatiskt hålla Argument-databasen påfylld läggs fram här, utöver att
  flagga luckor. Om det blir aktuellt är det ett eget, framtida scope-beslut.
