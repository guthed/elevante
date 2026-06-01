---
title: "KB-Whisper och svensk AI – därför har Elevante valt svenska modeller"
description: "Elevante transkriberar med KB-Whisper, Kungliga bibliotekets svenska modell – 47 % färre fel än engelska Whisper, och allt körs på svenska servrar. Därför valde vi svenskt."
date: "2026-05-10"
category: "Teknik"
---

När vi byggde Elevante hade vi två alternativ till transkribering. Det ena: använda OpenAI:s Whisper, en bra men engelsk-centrerad modell som körs i amerikansk infrastruktur. Det andra: använda KB-Whisper, Kungliga bibliotekets svenska variant, som körs lokalt på svenska servrar.

Vi valde KB-Whisper. Här är varför.

## Vad KB-Whisper är

KB-Whisper är en svensktränad version av OpenAI:s Whisper, utvecklad av Kungliga biblioteket. Den är tränad på tiotusentals timmar svenskt material och presterar dramatiskt bättre på svensk uttal, dialekter och fackterminologi än den globala motsvarigheten.

[KB-Whisper gör 47 % färre fel än OpenAI Whisper på svenska](https://www.isof.se/aktuellt/nyheter/nyheter-isof/2025-02-20-kungliga-biblioteket-lanserar-ny-ai-modell-baserad-pa-dialektinspelningar-fran-isof). [KB-Whisper är särskilt bra på svenska namn och fackuttryck](https://www.isof.se/aktuellt/nyheter/nyheter-isof/2025-02-20-kungliga-biblioteket-lanserar-ny-ai-modell-baserad-pa-dialektinspelningar-fran-isof). Det är en av de bäst presterande svenska transkriberingsmodellerna som finns idag.

## Varför det spelar roll i klassrummet

Lärare som undervisar på svenska använder en mix av ord som inte alltid finns i en global engelsk-baserad modell:

- Fackterminologi på svenska: ”derivata”, ”syntes”, ”energiprincipen”, ”agrarsamhället”.
- Dialekter och tonlägen som varierar mellan Skåne, Stockholm och Norrland.
- Skolspecifika uttryck: kurskod, kunskapskrav, betyg E/C/A, läroplansreferenser.
- Avbrott, självavbrott, omformuleringar – mycket vanligare i undervisning än i podcasts eller mötesinspelningar.

En engelsk-tränad modell tappar fler av de här elementen, eller skriver dem fel. För Elevante är det inte acceptabelt. Hela tjänsten bygger på att AI:n kan referera till exakt vad läraren har sagt. Om transkriptet är 91 procent korrekt blir AI:ns svar 91 procent korrekt. Och 91 procent räcker inte i skolan.

## Var det körs

KB-Whisper körs hos [Berget AI](https://berget.ai/), en svensk leverantör som driver sina GPU:er i Sverige. [KB-Whisper tränad på 50 000+ timmar svensk audio](https://www.isof.se/aktuellt/nyheter/nyheter-isof/2025-02-20-kungliga-biblioteket-lanserar-ny-ai-modell-baserad-pa-dialektinspelningar-fran-isof). Det ger tre saker som amerikansk infrastruktur inte kan ge:

1. **GDPR-rätt.** Inga personuppgifter passerar EU:s gränser. Inga DPA-bekymmer om Schrems II eller motsvarande problem.
2. **Lägre latens.** Datan reser inte över Atlanten för att komma tillbaka.
3. **Suveränitet.** Sverige har en svensk AI-leverantör som vi kan vända oss till.

## Sverige har en chans att leda

Danmark, Norge och Finland löser AI-frågan på olika sätt. Norge har använt amerikanska tjänster med varierad framgång. Danmark har egna initiativ med Microsoft-koppling. Sverige har KB-Whisper, Berget AI och en stark forskningstradition inom NLP.

[Svenska lärare har bättre infrastruktur än OECD-snittet, men saknar AI-kompetens](https://www.oecd.org/en/publications/results-from-talis-2024-country-notes_e127f9e2-en/sweden_95600eec-en.html). Det är ett tillfälle som inte kommer tillbaka. Och en svensk skola som köper en svensk AI-lösning idag bidrar till att den faktiskt blir en realitet.

## En produktväg med svenskt fokus

Elevante använder Anthropic Claude för den narrativa AI-lärardelen. Det är ett medvetet val: Claude är för tillfället den största språkmodellen för svenska. Men hela uppströmskedjan – inspelning, transkribering, lagring av embeddings, själva applikationen – ligger i Sverige.

## Sammanfattning

- KB-Whisper är mätbart bättre på svenska än den engelska originalmodellen.
- Hela transkriberingen sker på svenska servrar via Berget AI.
- Det ger både högre kvalitet och full GDPR-kontroll.
- En svensk skola som väljer Elevante väljer också att stödja en svensk AI-stack.
