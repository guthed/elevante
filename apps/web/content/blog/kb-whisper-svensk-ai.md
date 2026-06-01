---
title: "KB-Whisper och svensk AI – därför har Elevante valt svenska modeller"
description: "Kungliga biblioteket har släppt en svensk taligenkänningsmodell tränad på dialekter. Så använder Elevante KB-Whisper och varför det spelar roll."
date: "2026-05-10"
category: "Teknik"
---

En gymnasielärare i Skellefteå testar OpenAI:s Whisper på en intervju med en äldre författare som pratar västerbottensdialekt. Transkriberingen blir oanvändbar. Hen testar KB-Whisper. Den förstår.

Det är inte en liten skillnad. Det är skillnaden mellan att tekniken funkar och att den inte gör det.

## Vad KB-Whisper är

[KB-Whisper](https://www.isof.se/aktuellt/nyheter/nyheter-isof/2025-02-20-kungliga-biblioteket-lanserar-ny-ai-modell-baserad-pa-dialektinspelningar-fran-isof) är en svensk taligenkänningsmodell utvecklad av Kungliga biblioteket, tränad på dialektinspelningar från Institutet för språk och folkminnen. Den förstår svenska, svensk-finska, samiska influenser och regionala dialekter på ett sätt amerikanska modeller inte gör.

Den är dessutom open source och kan köras lokalt på svensk infrastruktur.

## Varför en svensk modell spelar roll i skolan

1. **Likvärdighet i dialekt.** En elev från Norrland ska inte missgynnas av att en amerikansk modell inte förstår hens uttal.
2. **Språkintegritet.** Tal som transkriberas i USA är inte under svensk dataskydd.
3. **Tillgång för elever med talsvårigheter.** Bra svensk taligenkänning gör AI tillgänglig som stöd.
4. **Modersmål och svenska som andraspråk.** Anpassningsbar mot fler språkfamiljer.

## Varför Elevante valt det

Elevante använder KB-Whisper för alla talinslag (uppläsning, diktering, transkribering). Det gör tjänsten:

- Förstår svenska och svenska dialekter på riktigt.
- Kör på svensk infrastruktur via [Berget AI](https://berget.ai/).
- Följer GDPR utan extra arbete.
- Är oberoende av amerikanska bolags prissteg och villkorsändringar.

## Use cases

### Specialpedagogen och eleven med dyslexi

Eleven dikterar sina svar. Modellen förstår oklart uttal bättre än Whisper.

### Modersmålsläraren

Elever transkriberar samtal på dialekt. Materialet blir användbart i undervisningen.

### NO-läraren med fysikgenomgång

Spelar in en lektion, låter KB-Whisper transkribera. Sjuka elever får texten dagen efter.

### Gymnasieläraren i historia med ljudkällor

Låter eleverna transkribera äldre svenska röstinspelningar som källkritisk övning.

## FAQ

**Är KB-Whisper bättre än OpenAI Whisper på svenska?**
På svenska dialekter ja. På standardsvenska är de jämförbara.

**Vem har byggt det?**
Kungliga biblioteket, baserat på Whisper-arkitekturen men tränat med svenska data.

**Är det gratis?**
Modellen är open source. Drift kräver hårdvara.

**Var körs den?**
Elevante kör den på [Berget AI](https://berget.ai/) i Sverige.

**Sparas röstdata?**
Elevante sparar tal endast så länge som behövs för transkribering, sedan raderas det.

**Är det GDPR-säkert?**
Ja. Datan lämnar aldrig EU.

**Funkar det med engelska?**
Ja. Den är tränad på många språk men starkast på svenska.

**Vad säger ISOF om modellen?**
Institutet för språk och folkminnen står bakom dataunderlaget och har använt den i egna projekt.

**Är open source mer säkert än stora aktörer?**
Inte automatiskt. Men det ger granskningsbarhet.

**Vilka språkkluster funkar bäst?**
Nordiska språk, svenska dialekter inklusive samiska influenser.

**Funkar det offline?**
Kan köras offline lokalt vid behov, men Elevante kör det online via Berget AI.

**Vad kostar det att köra det?**
Elevante absorberar driftskostnaden i sin licens.

**Vad händer om OpenAI sänker priset på Whisper?**
Vi byter inte. Lagring i USA är inte ett alternativ för elevdata.

## Reflektion

Svenska elever pratar svenska. Vissa pratar svenska med västerbottensaccent, vissa med arabisk brytning, vissa med tonhöjdsavvikelser. En AI som ska tjäna alla måste förstå alla — inte bara dem som låter som en Hollywoodfilm. KB-Whisper är teknisk infrastruktur som tar likvärdighet på allvar. Det är därför Elevante kör det.
