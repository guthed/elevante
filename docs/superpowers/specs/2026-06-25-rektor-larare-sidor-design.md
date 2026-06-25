# Dedikerade säljsidor för rektor och lärare — design

**Datum:** 2026-06-25
**Status:** Förslag, väntar på godkännande
**Mål:** Två dedikerade, delbara webbsidor — en för rektorer, en för lärare — som visar hur Elevante fungerar med aktuella skärmdumpar och startsidans animationer, skrivna på skolsvenska och på respektive målgrupps planhalva.

---

## Bakgrund

Idag finns två nästan identiska "pitch"-sidor med samma innehåll i olika format:

- **`/rektor`** — bildspel (fast 1920×1080-canvas, `DeckStage`, piltangenter, PDF-export). Byggt för att presentera live. Har den nya skollingo-copyn.
- **`/skolan`** — scroll-webbsida (`Reveal`, `ChatDemo`, `ZoomableShot`). Byggt för att skickas som länk. Har den gamla copyn och "För din skola"-vinkeln.

Båda ligger utanför `[locale]` (svenska only) och är `noindex`.

Vi vill ha **delbara webbsidor** (inte bara bildspel) som är dedikerade per målgrupp och visuellt rika. Mönstret finns redan i `/skolan` och på startsidan — vi konsoliderar och bygger vidare på det istället för att skapa en tredje kopia.

---

## Roller i scope

Det finns **bara två inloggade roller: elev och lärare**. Ingen rektors-/skoladmin-vy.

- **Förståelse-kartan är en lärarvy** — läraren ser sin egen klass. Rektorn loggar inte in och får ingen skol-dashboard.
- **Rektorssidan säljer utfall, inte en granskningspanel.** Rektorns värde är indirekt: hen utrustar sina lärare (insikt, avlastning) och ger varje elev likvärdig tillgång. Sidan får aldrig antyda att rektorn personligen ser elev-/klassdata eller granskar lärare.
- **Bärande vinkel på rektorssidan: "det här kan du erbjuda dina lärare."** Allt ramas in som en *möjlighet rektorn ger sitt kollegium* — verktyget, avlastningen, insikten i den egna klassen — och därigenom likvärdighet och måluppfyllelse för eleverna. Rektorn är den som *möjliggör*, läraren är den som *använder*. Skärmbilder av lärarvyer visas som "så här blir lärarens vardag", inte "så här övervakar du".
- **Konsekvens för godkänd §08-copy:** raden "Du ser vilka begrepp…" skrivs om till lärarens perspektiv ("Dina lärare ser…"). Bekräftas av John innan den ändras.

## Bärande principer

1. **Skolsvenska / skollingo.** Båda sidorna möter läsaren på deras planhalva. Återhållsamt ankrade i fyra begrepp per målgrupp — ingen buzzword-soppa.
   - **Rektor:** likvärdighet & kompensatoriskt uppdrag, tillgänglig lärmiljö & extra anpassningar, systematiskt kvalitetsarbete & måluppfyllelse, huvudman/personuppgiftsansvarig.
   - **Lärare:** tolkningsföreträde & profession, studiero, arbetsbörda/avlastning, extra anpassningar.
2. **Visa, berätta inte.** Aktuella skärmdumpar av inloggat läge + startsidans animationer driver "så funkar det". Förståelse-kartan och RAG-med-källor är hjältebilder.
3. **Förstärker läraren, ersätter den inte.** Aldrig bedömnings-/övervakningsverktyg. Rektorssidan säger uttryckligen att förståelse-kartan visar elevernas lärande, inte den enskilda lärarens arbete.
4. **Återanvänd, bygg inte om.** Lyft befintliga interaktiva delar till ett delat bibliotek; komponera båda sidorna ur det.

---

## Arkitektur

### 1. Delat showcase-bibliotek — `apps/web/components/showcase/`

Lyfter de återanvändbara, interaktiva delarna till en gemensam plats så att startsidan, `/rektor` och `/larare` delar samma källa (ingen tredje kopia att underhålla).

| Fil | Ursprung | Åtgärd |
|-----|----------|--------|
| `Reveal.tsx` | `app/skolan/Reveal.tsx` | Flyttas |
| `ZoomableShot.tsx` | `app/skolan/ZoomableShot.tsx` | Flyttas |
| `ChatDemo.tsx` | `app/skolan/ChatDemo.tsx` | Flyttas |
| `LoopVisuals.tsx` | Extraheras ur `app/[locale]/(public)/page.tsx` | Ny — exporterar `LoopStep`, `RecVisual`, `TranscribeVisual`, `AskVisual` (REC-bricka, animerad ljudvåg, chatt + källpill) |

- `LessonTranscriptDemo` (hero-demon) och `Faq` ligger redan i `components/public/` och återanvänds som de är (tar `locale`).
- **Refaktor utan funktionsändring:** startsidan importerar `LoopVisuals` istället för att definiera dem inline; `/skolan` (om den behålls) importerar från `components/showcase/`.

### 2. `/rektor` → scroll-webbsida (ersätter bildspelet på den URL:en)

`app/rektor/page.tsx` skrivs om från `DeckStage` till en `<main>` scroll-sida i Editorial Calm (Tailwind), med den **redan godkända skollingo-copyn** (de 12 beaten som redan ligger i nuvarande `/rektor`).

All text-copy mappas 1:1 mot de godkända 12 beaten. Två sektioner (5 "Se det själv" och 9 "Elevens vy") är rena bildsektioner utan ny copy — de lägger bara till interaktivitet/bild, precis som `/skolan` gör idag. Sektioner med visuellt element:

1. **Hero** — serif-rubrik + `LessonTranscriptDemo`
2. **Problemet** — tre elevkort (`Reveal`-staggrade)
3. **Lösningen** — `ZoomableShot` (chatt med källor)
4. **Så funkar det** — `LoopVisuals`-triptyk (animerad: REC → ljudvåg → chatt)
5. **Se det själv** — live `ChatDemo`
6. **Inte ChatGPT** — strikt RAG + fotnot
7. **För läraren** — kort skollingo-version (tolkningsföreträde)
8. **För eleven** — likvärdig tillgång + extra anpassningar
9. **Elevens vy** — `ZoomableShot`
10. **Förståelse-karta** — `ZoomableShot` (hjältebild) + skollingo: systematiskt kvalitetsarbete, måluppfyllelse, "kartan visar elevernas lärande, inte den enskilda lärarens arbete"
11. **Hela skolan** — gemensam grund / lärartid
12. **Personuppgifter** — huvudman som personuppgiftsansvarig
13. **Mäter i piloten** — fyra mått
14. **Kom igång** — mörk CTA-sektion

Fotoband från `public/images/` mellan sektioner där det lyfter.

### 3. `/larare` → ny dedikerad lärarsida

Ny `app/larare/page.tsx`. Samma showcase-byggstenar, vinklad mot läraren. Copyn skrivs på **lärarens planhalva** och tas fram beat-för-beat för godkännande (mirror på rektors-processen). Föreslagen beat-struktur:

- **Hero:** "Du äger lektionen. Elevante minns den." + REC-visualen prominent
- **Problemet (lärarens vardag):** samma fråga tre gånger, repetition efter frånvaro, hinner inte med extra anpassningar
- **Så funkar det:** max två tryck — `LoopVisuals`-triptyk
- **Du behåller kontrollen:** du bestämmer när du spelar in, tolkningsföreträde över ditt material, inte övervakning
- **Studiero & avlastning:** Elevante tar de upprepade frågorna efter lektionen → mer lärartid till det som kräver en lärare
- **Extra anpassningar:** text i egen takt sänker tröskeln (NPF, dyslexi, nyanlända/SVA)
- **Din insikt:** lärarens förståelse-karta (`ZoomableShot`) — se vad klassen fastnar på
- **Tryggt:** EU, råljud raderas, PUB-avtal
- **Kom igång:** pilot + CTA

Skärmdumpar för lärarsidan: lärar-översikt + förståelse-karta (kapas/levereras av John).

### 4. Bildspelet bevaras på `/rektor/deck`

- Flyttar `DeckStage.tsx` + `deck.module.css` → `app/rektor/deck/`.
- Nuvarande deck-JSX (med skollingo-copyn) → `app/rektor/deck/page.tsx`.
- Diskret "Presentationsläge →"-länk på scroll-`/rektor` (för Johns eget bruk).
- Live-presentationsläget (piltangenter, PDF) lever kvar.

### 5. `/skolan` → redirect till `/rektor`

`/skolan` blir överflödig. Redirect `/skolan → /rektor` (reversibelt). Komponenterna är redan flyttade till `components/showcase/`, så `app/skolan/` kan tas bort. *(Låg insats, reversibelt — kan hoppas om John vill behålla `/skolan` separat.)*

---

## Skärmdumpar (levereras av John)

Aktuella bilder av inloggat läge ersätter de gamla i `public/rektor/`:

| Fil | Innehåll |
|-----|----------|
| `shot-chat-kallor.png` | Elevchatt: svar + KÄLLOR (gärna den som visar RAG-ärlighet "togs inte upp på lektionen") |
| `shot-elev-oversikt.png` | Elevens översikt |
| `shot-forstaelsekarta.png` | Förståelse-kartan (koncept × elev) |
| `shot-larare-oversikt.png` *(ny)* | Lärarens översikt (för `/larare`) |

Verifierat 2026-06-25 att inloggat läge går att fånga lokalt mot Supabase-projektet med demokontona (anna@ / elin@ demo.elevante.se).

---

## Det som INTE ingår (YAGNI)

- Ingen indexering (båda förblir `noindex` säljsidor).
- Ingen engelsk översättning (sidorna ligger utanför `[locale]`, svenska only).
- Inga nya uppföljnings-/mätfunktioner i produkten — SKA/måluppfyllelse hålls lätt ("nå målen"), inget som liknar utvärdering av enskilda lärare.
- Ingen ny scroll-driven animation i v1 — vi återanvänder startsidans befintliga rörelse. Läggs till först om sidan känns platt.

---

## Kvalitet / acceptans

- WCAG AA; `Reveal` respekterar `prefers-reduced-motion`; alt-text på alla shots; `ZoomableShot` tangentbordsåtkomlig.
- Responsivt 375 → 1440px.
- Inga hårdkodade engelska strängar kvar (svenska sidor).
- Startsidan och ev. kvarvarande `/skolan` oförändrade i funktion efter komponentflytt.

---

## Faser (för implementationsplanen)

1. **Showcase-bibliotek:** flytta `Reveal`/`ZoomableShot`/`ChatDemo`, extrahera `LoopVisuals`, uppdatera startsidans + skolans imports. Verifiera att startsidan ser oförändrad ut.
2. **`/rektor` scroll-sida:** ny `page.tsx` med godkänd skollingo-copy + showcase-komponenter. Flytta decket till `/rektor/deck`.
3. **`/larare`:** ta fram skollingo-copy beat-för-beat (godkänns av John) → bygg sidan.
4. **Städning:** redirect `/skolan → /rektor`, byt in aktuella skärmdumpar, slutverifiering (a11y, responsivt, länkar).
