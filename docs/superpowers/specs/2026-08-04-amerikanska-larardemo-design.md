# Lärardemo — Amerikanska gymnasiet får testa Elevante ur elevperspektiv

**Datum:** 2026-08-04
**Status:** Spec, godkänd design
**Livslängd:** Tillfällig. Rivs när piloten startar (sep/okt 2026).

---

## Bakgrund

2026-08-04 hade John och Stefan ett möte med fyra lärare på Amerikanska
gymnasiet inför en pilot. Mötet spelades in och transkriberades med
KB-Whisper. Mot slutet av mötet lovade John att lärarna samma dag skulle få
logga in och ställa frågor om det som sagts:

> "Jag har alla dina e-mailadresser. Vi kommer tillbaka till dig senare idag.
> Logga in. Vi ska göra detta en klass, för dig att fråga frågor om vad vi har
> pratat om idag."

Det här är den leveransen.

## Mål

Fyra lärare ska uppleva Elevante **som elever**, med **sitt eget möte** som
lektionsinnehåll. Poängen är igenkänning: de känner materialet utantill, så de
kan bedöma om svaren är korrekta och om källcitaten pekar rätt — något de inte
kan göra på ett syntetiskt Ekologi-transkript.

**Icke-mål:**

- Feedback-loopen som också utlovades i mötet. Egen leverans.
- Lärarvyn/förståelse-kartan. Möjlig uppföljning när de fyra har chattat
  tillräckligt för att ge underlag — se "Uppföljning".
- Permanent funktionalitet. Ingen ny kod, inget nytt i fasminnet.

## Beslut

| Fråga | Beslut | Varför |
|---|---|---|
| Konto eller inloggningsfri länk? | Riktiga elevkonton | Ger hela elevupplevelsen (bibliotek, chat, provplugg, övningsprov, lärprofil), inte bara try-loopen. Skyddar dessutom mötesinnehållet bakom inloggning. |
| Hur många lektioner? | **En** | Ett möte = en inspelning = en lektion. Matchar både lärarnas mentala modell och produktens egen "bucket per lektion". |
| Hur mycket städas transkriptet? | Måttlig städning | Rått KB-Whisper-transkript har ASR-haverier och kodväxling mitt i meningar. Ostädat blir citat-korten obegripliga och de bedömer RAG:en efter transkriptets kvalitet. |
| Permanent? | Nej — byggt för att rivas | Onboarding-verktyg inför piloten, inte en produktfunktion. |
| Vem mejlar? | John, från egen inkorg | Fyra personer han just träffat ska ha ett personligt mejl, inte en transaktionsmall. |

## Arkitektur

**Ingen ny kod.** `transcribe-lesson` tar redan emot färdig `transcript_text` i
request-body och hoppar då över audio-download och Whisper
(`supabase/functions/transcribe-lesson/index.ts:18-24`, `:230-233`). Samma väg
som de sex syntetiska Ekologi-lektionerna seedades. Det här är ett data- och
seedjobb.

### Datamodell

Allt hänger under **ett** `school_id`:

```
schools: "Amerikanska gymnasiet"
  └── courses: "Elevante" (code: ELEVANTE)
  └── classes: "Pilotlärare"
        └── class_members: 4 profiles (role = 'student')
  └── lessons: 1 st — "Elevante — introduktionsmötet 4 augusti"
        └── lesson_chunks: chunks med embeddings (~500 tecken, 80 overlap)
```

Egen skola betyder att RLS isolerar dem automatiskt: de ser sitt eget möte och
ingenting annat i systemet.

### Transkriptets form

En lektion, men transkriptet struktureras i sex avsnitt i mötets naturliga
ordning. Det ger läsbara citat och bättre chunk-retrieval utan att bryta upp
mötet i konstgjorda "lektioner":

1. Varför Elevante finns — bakgrunden, sommarskolan, maskinen som ersatte den
   jobbiga föräldern
2. Så fungerar tekniken — inspelning, KB-Whisper, ljudet raderas, bucketen,
   språkstöd
3. Elevens vy — bibliotek, chat, provplugg, övningsprov, rättning, lärprofil
4. Lärarens vy — förståelse-kartan, klassprov, transkriptet, redigera/radera
5. Det svåra — diskussion vs. fakta, känsliga ämnen, AI-akten, eleven som
   vägrar delta
6. Piloten — klasslistor, schema, skolmejl, tidplan, feedback-loopen

**Städningens regler:**

- Rätta uppenbara ASR-fel ("läsning" → lektion, "grader" → betyg,
  "lärarutbildning" → läromedel där kontexten är otvetydig)
- Normalisera kodväxling svenska/engelska till svenska när meningen är klar
- Reparera eller klipp trasiga passager (t.ex. "Bifrönt skogsken. Habdi. Nått.")
- **Inga nya påståenden.** Ingenting tillförs som inte sades i rummet.
- Behåll talspråket. Materialet ska kännas som ett möte, inte en broschyr.

### Integritet

- Transkriptet innehåller **inga talarnamn** — Whisper gör ingen diarisering.
  Ingen enskild lärare kan pekas ut för något de sade om känsliga
  klassrumsdiskussioner.
- **Transkriptet committas aldrig till git.** Filerna bor lokalt, datan bor i
  Supabase.
- Samtycke till inspelningen är givet muntligt i mötet (citatet ovan). LOI är
  påskrivet med Amerikanska Gymnasiet, men ett LOI är ingen personuppgifts-
  rättslig grund — biträdesavtal och samtyckesfrågan för piloten kvarstår.

## Genomförande

0. **Verifiera** att Supabase-projektet `msqfuywpbrteyrzjggsw` är igång och att
   `BERGET_AI_API_KEY` + `ANTHROPIC_API_KEY` svarar. Pausade projekt startar
   inte om av sig själva.
1. **Städa** transkriptet till en `.txt` enligt reglerna ovan.
2. **Seeda** skola, kurs, klass och en lektionsrad (`transcript_status =
   'pending'`).
3. **Kör `transcribe-lesson`** med `lesson_id` + `transcript_text` → chunks,
   embeddings, AI-genererad sammanfattning, koncept, förslagsfrågor.
   Verifiera att `lesson_chunks` fyllts och `transcript_status = 'ready'`.
4. **Handplocka förslagsfrågorna** så första klicket landar där de minns
   rummet: "Vad händer med ljudfilen efter transkriberingen?", "Vad sa vi om
   pausknappen?", "Hur skiljer systemet på diskussion och fakta?"
5. **Skapa fyra elevkonton** med deras riktiga skolmejladresser som inloggning,
   kopplade till klassen. Ett gemensamt startlösenord (samma mönster som
   befintliga demo-konton) som de kan byta — inte fyra olika att hålla reda på
   i ett mejl.
6. **Verifiera end-to-end själv** innan något mejlas: logga in som en av dem,
   ställ en fråga, kontrollera att citatet pekar på rätt ställe i transkriptet,
   generera och rätta ett övningsprov.
7. **Skriv mejlutkast** till John — inloggningslänk, uppgifter, en rad om vad de
   ska prova först. John skickar.

## Rivning

Skrivs samtidigt som seedskriptet, inte efteråt.

`schools` kaskaderar till `courses`, `classes`, `lessons`, `chats` och
`practice_tests`. Men `profiles.school_id` är `on delete set null`, så
kontona överlever — de måste tas bort separat via `auth.users` (som i sin tur
kaskaderar till `profiles`).

Rivning = radera de fyra `auth.users`-raderna + radera skolan. Två satser.

## Risker

| Risk | Hantering |
|---|---|
| RAG:ens systemprompt är tunad för lektioner, inte metasamtal om produkten | Verifieras i steg 6. Innehållet är sakligt och sammanhängande, så strikt RAG bör fungera — men det är antagandet som testas först. |
| En lärare minns en formulering annorlunda än den städade | Städningen tillför inga påståenden. Om någon reagerar är det ett bra samtal, inte ett fel. |
| Mejl till skoladress fastnar i filter | John skickar från egen inkorg till kollegor han just träffat — låg risk. |

## Uppföljning (ej i denna leverans)

När de fyra har chattat ett tag finns riktigt underlag för förståelse-kartan.
Ge dem då varsitt lärarkonto på samma skola, så ser de sin egen nyfikenhet
plottad i lärarvyn — samma vy de såg i demon, fast med sig själva som elever.
