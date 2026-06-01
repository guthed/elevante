---
title: "Elevante vs ChatGPT, Copilot och Khanmigo – vad skillnaden faktiskt är"
description: "En lugn jämförelse av AI-verktyg för svensk gymnasieskola. Vad de olika tjänsterna är bra på, var de faller kort, och när vad passar."
date: "2026-04-24"
category: "AI i skolan"
---

Det ligger fyra offerter på rektorns skrivbord. En från Microsoft kring Copilot. En från Google kring Gemini for Education. En PDF om Khanmigo som någon på Skolverkets nätverk har skickat vidare. Och så Elevante. Alla fyra säger ungefär samma sak i sin marknadsföring: AI för skolan, säkert, pedagogiskt, framtidens klassrum.

Rektorn vet att tre av dem ändå inte kommer att fungera för just den här skolan. Frågan är vilka tre.

Det här är ett försök att svara på den frågan utan att lova för mycket åt något håll. Vi gör Elevante och vet att vi har en partsbias, men i mötet med skolor är det inte mycket vi vinner på att överdriva. En skola som väljer fel verktyg slutar inte använda det – den slutar lita på AI överhuvudtaget. Det är dåligt för alla.

## En kort översikt av aktörerna

**ChatGPT (OpenAI)** är den AI eleverna redan använder. Bred, generell, engelskcentrerad i grunden men numera passabel på svenska. Inte byggd för skolan, men ofta använd i skolan ändå.

**Microsoft Copilot for Education** är ChatGPT-teknik paketerad i M365-miljön. Bra integration med Word, Teams och OneNote. Vänd dig hit om skolan redan kör Microsoft i hela sin stack.

**Google Gemini for Education** är motsvarigheten på Google Workspace-sidan. Stark om eleverna redan jobbar i Docs och Classroom. Amerikansk infrastruktur.

**Khanmigo (Khan Academy)** är en pedagogisk AI tränad mot Khans eget kursmaterial. Strukturerad, snäll, men byggd för amerikansk läroplan och engelsk-språkig grundskolematematik.

**Elevante** är en svensk tjänst som baserar sina svar på lärarens egna inspelade lektioner. Svensk infrastruktur via [Berget AI](https://berget.ai/), svensk transkribering via [KB-Whisper](https://www.isof.se/aktuellt/nyheter/nyheter-isof/2025-02-20-kungliga-biblioteket-lanserar-ny-ai-modell-baserad-pa-dialektinspelningar-fran-isof).

## Skillnader som spelar roll

### Vad AI:n vet

Generell AI vet allt och inget. Den hittar på exempel som inte stämmer mot just din kurs. Khanmigo vet vad Khan Academy har lagt upp som kursmaterial – inte vad just er matematiklärare gått igenom. Elevante vet det läraren faktiskt sagt under lektionen, ner till minutnivå.

Det är inte en marginalskillnad. Det är skillnaden mellan ett svar som råkar stämma och ett svar som hör hemma i kursen.

### Var data lever

ChatGPT, Copilot, Gemini och Khanmigo lagrar primärt i amerikansk infrastruktur. Det finns olika typer av EU-residency-avtal, men kärnan är att leverantörerna lyder under amerikansk lagstiftning (Cloud Act). Elevante kör hela kedjan i Sverige.

För en huvudman som vill ha enkel GDPR-dokumentation är det här en av de tyngsta posterna i utvärderingen.

### Vem som har byggt för läraren

ChatGPT är inte byggt för läraren. Copilot är byggt för kontorsanvändning. Gemini är byggt för Google-användare. Khanmigo är byggt för Khan Academys metodik. Elevante är byggt utifrån [Sveriges Lärare-rapporter om lärarnas arbetsmiljö](https://www.sverigeslarare.se/om-oss/nyheter/rapport-orimliga-forutsattningar/).

## När ChatGPT eller Copilot är bättre

- När syftet är att eleven ska träna prompt-design och förstå AI som teknik.
- När läraren behöver hjälp att skriva administrativa texter eller mejl.
- När skolan redan kör M365 eller Workspace och vill ha en lättintegrerad AI för personal.

## När Khanmigo är bättre

- Om skolan undervisar i engelska på amerikansk läroplansgrund.
- Om eleverna redan använder Khan Academys ekosystem.
- Om syftet är att repetera generella ämnen där lärarens egen kurs är mindre viktig.

## När Elevante är bättre

- När AI:n ska svara *utifrån lärarens egen undervisning*, inte generell läroboksgrund.
- När GDPR och svensk databehandling är ett krav, inte en preferens.
- När skolan vill att eleverna ska repetera lektioner, plugga inför prov och få anpassningar på svenska.
- När EU AI Act-dokumentation behöver vara hanterbar.

## Use cases

### Den oberoende gymnasieläraren

Historielärare med 110 elever fördelat på fyra klasser. Provet i veckan handlar om mellankrigstiden. ChatGPT kan ge eleverna en bra översikt av Weimarrepubliken, men eleverna kommer inte att läsa det material läraren la upp i klassrummet. Elevante baserar sina sammanfattningar och övningsfrågor på just den lektionen, så att repetitionen träffar exakt det provet kommer att kräva.

### Mellanstora gymnasieskolan med M365

Skolan kör Microsoft sedan länge och har precis aktiverat Copilot för personalen. Det fungerar utmärkt för att skriva åtgärdsprogram och styra mejlflödet. För eleverna räcker det inte: de vill ha hjälp med kurser, inte med Word. Skolan kombinerar Copilot för personal med Elevante för elever, och får en stack som täcker båda behoven.

### Friskolekoncernen med 12 enheter

En koncern vill ha enhetlig AI-hantering på alla skolor. Khanmigo passar inte eftersom kurserna är svenska, ChatGPT skapar GDPR-bekymmer. Elevante installeras centralt med RBAC per skola, vilket gör att koncernkontoret får insyn i användning men inte i enskilda elevers material.

### Lärarteamet på en yrkesgymnasium

Fyra lärare i fordon ska samarbeta kring kursplaneringen. Generell AI hjälper dem inte – den vet inget om deras egen undervisning. Med Elevante laddas alla lektioner upp i samma kurs, och eleverna får tillgång till en AI som ser hela kursförloppet, oavsett vilken lärare som hållit lektionen.

## FAQ

**Vad är Elevante?**
Elevante är en svensk AI-tjänst för gymnasieskolan som låter elever repetera, ställa frågor om och plugga inför prov baserat på lärarens egna inspelade lektioner. Hela databehandlingen sker i Sverige.

**Hur skiljer sig Elevante från ChatGPT?**
ChatGPT är en generell AI utan koppling till elevens kurs. Elevante baserar varje svar på den faktiska lektionen läraren har hållit, transkriberad via KB-Whisper på svenska servrar.

**Hur skiljer sig Elevante från Microsoft Copilot for Education?**
Copilot är primärt byggt för administrativ produktivitet i M365. Elevante är byggt för pedagogisk repetition av lektioner och fungerar oberoende av vilken kontorssvit skolan använder.

**Hur skiljer sig Elevante från Google Gemini for Education?**
Gemini är en generell AI integrerad i Workspace. Elevante är en specialiserad lärartjänst med svensk infrastruktur. De utesluter inte varandra – många skolor kör Gemini för personal och Elevante för elever.

**Hur skiljer sig Elevante från Khanmigo?**
Khanmigo bygger på Khan Academys eget kursmaterial och är primärt anpassat för amerikansk skola. Elevante bygger på lärarens egen lektion och är anpassat för svensk gymnasieskola.

**Kan man kombinera Elevante med Copilot eller Gemini?**
Ja. De täcker olika behov. Många skolor använder en kontors-AI för personal och Elevante för elever och lärarstöd kring själva undervisningen.

**Är Elevante GDPR-säkert?**
Ja. All datalagring sker i Sverige via Berget AI. Inga personuppgifter lämnar EU, och DPA samt registerförteckningsmall ingår vid avtalstecknande.

**Vilken AI är bäst på svenska?**
För tal-till-text är KB-Whisper bäst på svenska. För svensk språkmodell-output är Anthropic Claude och Google Gemini i framkant. Elevante använder båda i sin pipeline.

**Är ChatGPT förbjudet i skolan?**
Nej. Men eleven måste informeras om att skolan inte kontrollerar var data tar vägen om eleven använder ChatGPT med personligt konto, och skolan bör ha en policy för när AI får användas på inlämningar.

**Kostar Elevante mer än ChatGPT?**
ChatGPT Plus kostar cirka 240 kr/månad per individ. Elevante kostar cirka 500 kr per elev och år, vilket motsvarar 42 kr/månad. Elevante är alltså billigare per elev, och inkluderar dessutom GDPR-paket och lärarutbildning.

**Vad händer om skolan väljer fel verktyg?**
Det kostar sällan pengar direkt. Det kostar förtroende. När lärare och elever provar något som inte fungerar tappar de tron på AI generellt, vilket gör nästa införande svårare.

**Kan jag testa Elevante innan jag bestämmer mig?**
Ja. Vi gör pilotuppsättningar för en klass eller en kurs under 4–8 veckor. Du betalar inte förrän skolan bestämt sig.

**Behöver Elevante en separat inloggning?**
Elevante kopplar in sig mot skolans befintliga IdP via SSO (SAML, Google, Microsoft). Eleven använder sitt skolkonto.

**Hur lång tid tar onboarding?**
1–2 veckor för en pilotklass. 4–6 veckor för en hel skola.

**Vad gör Elevante som ingen annan gör?**
Elevante baserar varje svar på lärarens faktiska lektion, transkriberad lokalt på svenska KB-Whisper, körd på svensk infrastruktur. Den kombinationen finns inte hos någon annan av de stora aktörerna.

## Reflektion

Att välja AI för skolan är inte ett tekniskt beslut. Det är ett pedagogiskt beslut, ett juridiskt beslut och ett kulturellt beslut. De flesta skolor som vi pratar med inser någonstans i utvärderingen att de inte letar efter den smartaste AI:n – de letar efter den som ger eleverna det bästa stödet kring deras egen lärares undervisning, utan att skapa juridisk huvudvärk för rektorn.

Där ligger Elevantes hela rationale. Inte i att vara störst, utan i att vara förankrad i exakt det skolan redan gör. Resten är detaljer i kontraktet.
