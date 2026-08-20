# Schemaimport — Amerikanska Gymnasiet Stora Essingen (Royal Schedule)

Status: analys + plan, 2026-08-20. Underlag: elva exportfiler från Joel Filipp
(`~/Documents/Scheman AG/`), alla samma schema — "Schema 26/27 Officiellt Schema- HT26".

---

## 1. Vad filerna faktiskt är

Skolan kör **Royal Schedule** (`meta.structure = "RS/core-2.0.0"`). Alla elva filer är
exporter ur samma schema, i sex olika format. Verdict per fil:

| Fil | Format | Innehåll | Duger? |
|---|---|---|---|
| `_RS_..._10_38.csv` | CSV, `;`, UTF-8 BOM | 588 utplacerade pass med **både namn och GUID** för grupp, lärare, klass, sal + veckor | **JA — kanonisk** |
| `_RS_..._10_37 (2).xlsx` | xlsx, blad "royal schedule export" | Identiska kolumner som CSV:n | JA (Excel-variant av samma) |
| `_2026-08-18.xlsx` | xlsx `RS/Excel-2.0.0` | Entiteter: 33 lärare, 19 klasser, 23 salar, 257 kurser (m. lärare + grupper), **tomt Students-blad**, Syllabuses | Komplement — men **inga lektionstider** |
| `_RS_..._10_38.json` | JSON `RS/core-2.0.0` | Hela modellen: 658 events (varav **70 "parked"** = oplacerade), courses, groups, teachers, locations, perioder | Rikast, men onödigt komplex — reserv |
| `_RS_..._10_25.xlsx`, `_10_37 (1).xlsx` | xlsx "Activities" | 647 pass med **riktiga datum** (StartDate/EndDate/SchoolYear/ExcludeWeeks) men **utan lärare och utan klass** | Nej — oanvändbar ensam |
| `_RS_..._10_37.xlsx` | xlsx, 3 blad | Undervisningsgrupper / Salar / Lektioner, allt via interna `kheMyrmB.*`-id | Nej — bara interna id |
| `_RS_..._10_38.txt` | tab, ISO-8859 | Ämne/Dag/Starttid/Längd/Klasser/Salar — **kolumnen Personal är tom** | Nej — ingen lärare |
| `_RS_..._10_38 (1).txt` | tab, UTF-8 | Samma rader men allt som GUID, inga läsbara namn | Nej |
| `_RS_..._10_38 (2).txt` | Novaschem INI | Legacy-exportformat, tomma tabeller | Nej |
| `_RS_..._10_39.xlsx` | xlsx "Kurser" | **Helt tom** (A1:A1) | Nej |

### Rekommendation
**Bygg importen mot `royal schedule export` (CSV eller xlsx — samma kolumner).**

```
id;externalid;groupid;group;dayid;startTime;length;subject;roomid;room;teacherid;teacher;classid;class;inweek
```

Den är den enda filen som ensam bär *alla* fyra dimensionerna vi behöver
(lärare, lektion, tid, klass) **och** stabila GUID:er att synka mot.

---

## 2. Vad schemat innehåller — siffrorna

- **588 utplacerade pass/vecka** (JSON:ens 658 minus 70 oplacerade — CSV:n är redan filtrerad)
- **342 inspelningsbara lektionspass**, 246 icke-lektioner: 210 luncher, 19 mentorstider,
  9 GA-Library, 4 gymnasiearbete-skrivpass, personalmöte, pluggstudion, resurstid, teamleader
- **19 klasser** (Ek24a…Tk26b), **33 lärare** (31 undervisar), **22 salar**, **234 undervisningsgrupper**
- Passlängd: 75 min (304 st) eller 50 min (24 st). Dag 0 = måndag. Tid som `1645` (HHMM).
- Lektioner/vecka per klass: 20–42. Per lärare: 4–17.
- **Inga lärarkrockar** — schemat är internt konsistent.

### Fyra fällor i datat

1. **Gruppnamn är inte unika.** "Matte nivå 2b" finns som fyra olika `groupid`, "HT religion 1"
   som tre, plus tolv namn till med dubbletter. → Kursidentitet **måste** vara GUID, aldrig namn.
2. **145 av 328 lektioner har flera klasser** (språkval, IV-block: upp till 7 klasser i ett pass).
   15 pass har flera lärare. Elevantes `timeslots` har exakt *en* `class_id` och *en* `teacher_id`.
3. **Lärarna står bara med förnamn** — "Alfred", "Akar", "Anna". Ingen mejladress, ingen signatur,
   ingen personnummer, i *någon* av filerna. Automatisk koppling till Elevante-konton är omöjlig.
4. **Datumen ljuger.** Filen heter HT26 men `division` säger 2026-01-06 → 2026-06-10 och
   `inweek` säger v2–24 — det är en vårtermin. Sannolikt en okorrigerad kopia
   ("(kopia) (kopia)"). Datum ur filen får inte litas på; adminen sätter terminen vid import.

### Och vad som helt saknas
- **Elever.** `groups.members` är tomt och Students-bladet har noll rader. Schemat ger klasserna
  men aldrig eleverna i dem.
- **Mejladresser** för både lärare och elever.
- **Ämneskoder** (Syllabuses-bladet tomt; 135 av 257 kurser saknar `subject` helt).

Det är alltså **två spår, inte ett**: schemat från Royal Schedule, personerna från Joels
egna listor. De möts på klassnamnet (`Ek26`, `Sa26a`…) och på lärarens förnamn.

---

## 3. Krock mot Elevantes datamodell

| Royal Schedule | Elevante idag | Gap |
|---|---|---|
| event → N klasser | `timeslots.class_id` (en) | **Blockerande för språkval/IV-block** |
| event → M lärare | `timeslots.teacher_id` (en) | 15 pass |
| kurs = `groupid` (GUID) | `courses.code` unique(school) | Behöver `external_ref` |
| stabilt `externalid`/pass | inget | Omuppladdning skapar **dubbletter** — `uploadSchedule` gör blind `insert` |
| lunch/mentorstid som pass | allt är "lektion" | 246 rader skräp i lärarens app |
| `inweek` = v2–24 | `valid_from`/`valid_until` | Lovveckor visas som lektioner |
| lärare = förnamn | `profiles.id` (uuid) | Kräver manuell mappning **en gång** |

Dessutom: **mobilappen läser inte `timeslots.teacher_id`** — `getTodayLessons()`
(`apps/mobile/lib/lessons.ts:36`) filtrerar via `course_teachers`. Importen måste skriva
den kopplingen, annars är lärarens REC-skärm tom trots att schemat är inne.

Nuvarande `uploadSchedule` (`apps/web/app/actions/schedule.ts`) kräver dessutom
`course_code;class_name;day;start_time;end_time` med kurser och klasser **redan skapade**,
och fäller hela filen på första oparsbara raden. Den klarar inte Joels export — och ska inte
lappas, utan ersättas.

---

## 4. Planen

Arkitekturvalet som gör resten enkelt: **`parse → CanonicalSchedule → validera → commit`**.
En parser per källformat, ett gemensamt mellanformat. Royal Schedule först, men Skola24/Novaschem
kommer garanterat i nästa skola (INI-filen i högen är just Novaschem) — då byggs bara en parser till,
inte en ny import.

### Fas A — datamodell (grund)
- `courses.external_ref`, `timeslots.external_ref` + `unique(school_id, external_ref)` → **idempotent upsert**, omuppladdning uppdaterar i stället för att duplicera
- `timeslot_classes` (join) — alla klasser i passet; `class_id` blir "primär klass" (första i listan) så all befintlig kod fortsätter fungera oförändrad
- `courses.recordable boolean default true` — auto-`false` för Lunch/Mentortid/Resurstid/Pluggstudion/Personalmöte/Library/Teamleader
- `timeslots.weeks smallint[]` — `inweek`, så lovveckor inte visas
- `schedule_teacher_map(school_id, external_ref, display_name, profile_id)` — förnamnsmappningen, **sparas** så nästa import går automatiskt
- `schedule_imports` — körningslogg (fil, tidpunkt, skapade/ändrade/hoppade)

### Fas B — parser
`lib/schedule/parse-royal-schedule.ts` + `lib/schedule/canonical.ts`.
Formatdetektering på rubrikraden så adminen kan släppa vilken RS-export som helst.
Enhetstester direkt mot Joels riktiga fil (588 rader) — inte mot syntetiskt testdata.

### Fas C — importguiden på `/admin/schema`
Fyra steg, allt avbrytbart och omkörbart:
1. **Ladda upp** — dra in filen (.csv/.xlsx). Vi känner igen formatet själva.
2. **Förhandsgranska** — *"19 klasser, 234 undervisningsgrupper, 342 lektionspass/vecka, 33 lärare, 22 salar. 246 rader ser ut som lunch och mentorstid — ska de med?"* Plus terminsstart/slut, förifyllt men redigerbart (datumen i filen är fel).
3. **Matcha lärare** — lista med de 33 förnamnen, autoförslag där förnamnet matchar ett befintligt konto, fritt mejlfält annars. Görs en gång; sparas.
4. **Välj klasser** — piloten är 2–3 klasser, inte 19. Bocka i vilka som ska in.
Efteråt: kvitto med skapat/uppdaterat/överhoppat och en länk till schemavyn.

### Fas D — koppla ihop
Skriv `course_teachers` från lärarmappningen. Verifiera i mobilappen att en riktig lärare
ser sina riktiga pass på rätt dag — det är först då kedjan schema → REC → transkript sitter.

### Fas E — leva med det
Omuppladdning visar **diff** ("12 nya pass, 3 ändrade tider, 1 borttaget") innan commit.
JSON-parser som reserv. Veckofilter i `getTodayLessons`.

---

## 5. Så här blir det enkelt för Joel

Han gör tre uppladdningar, i den här ordningen:

1. **Schemat** — exporterar `royal schedule export` ur Royal Schedule och släpper filen i guiden.
   Klasser, kurser, salar och pass skapas automatiskt. Ingen förberedelse, ingen omformatering.
2. **Lärarna** — `full_name;email;role` med `role=teacher`. Går redan idag via `/admin/anvandare`.
   Matchas mot schemats förnamn i steg 3 i guiden.
3. **Eleverna** — `full_name;email;class_name` där `class_name` är exakt klassnamnet ur schemat
   (`Ek26`, `Sa26a`…). Går redan idag; skapar konto, skickar inbjudan via Loops och kopplar
   till klassen. Testad skarpt på 543 rader.

Ingen av de tre kräver att han rör en cell i Excel. Det enda han behöver bestämma är
terminsdatum och vilka klasser som är med i piloten.

---

## 6. Frågor till Joel

1. **Terminen:** exporten säger 6 jan – 10 juni 2026, veckor 2–24, men filen heter HT26.
   Vilken termin och vilka veckor gäller på riktigt?
2. **Formatet:** kan han alltid exportera "royal schedule export" (CSV eller xlsx)? Det är
   den enda som har både lärare och klass.
3. **Lärarna:** kan vi få förnamn → mejladress för de 33? (Samma lista som lärar-uppladdningen.)
4. **Piloten:** vilka 2–3 klasser?
5. **Elevlistan:** använder han samma klassnamn som schemat (`Ek26`, `Sa26a`)?
6. **Skräpet:** ska luncher, mentorstid och resurstid synas i lärarens app som pass, eller
   filtreras bort helt?
7. **Uppdateringar:** hur ofta ändras schemat under terminen, och hur får vi veta?

---

# Tillägg 2026-08-20: Royal Schedule har ett API — SS 12000

Verifierat live, inte påläst. Royal Schedule exponerar **SS 12000:2020** (svensk standard för
informationsutbyte i skolan, OpenAPI 3):

- Swagger-UI: <https://ss12000.royalschedule.com/>
- Spec: <https://ss12000.royalschedule.com/api/openapi.yaml>
- Bas-URL: `https://backend.royalschedule.com/integrations/ss12000/v2/`
  (+ `dev-backend...` för test)
- Auth: `Authorization: Bearer <JWT>`. Verifierat: `GET /` utan token → **401**.
- Postman-collection länkas från specen.

Från Royal Schedules egen sida: *"Genom att koppla på SS:12000 kan andra av er godkända aktörer
såsom skolplattformar prenumerera på schemaläggningsdata i realtid"* — dvs. **skolan godkänner
oss**, det är inte något Royal Schedule ger ut på egen hand.

## Ändpunkter (implementerade)

`/persons` · `/duties` · `/groups` · `/activities` · `/calendarEvents` · `/rooms` · `/resources`
— var och en med `/{id}` och `/lookup` (bulk-hämtning på id-lista). `expand`-parameter på
groups/activities/duties ger inbäddade relationer i ett anrop.

`GET /calendarEvents` kräver `startTime.onOrAfter` + `startTime.onOrBefore`, valfritt
`activity` och `teacher`. Alltså: *"ge mig alla lektioner den här veckan för den här läraren"*
i ett anrop.

## Vad API:et löser som filen inte gör

| Problem i filimporten | Löst av API:et |
|---|---|
| 246 skräprader (lunch, mentorstid) filtrerade på svenska nyckelord | `Activity.activityType` är ett **enum**: `Undervisning` / `Elevaktivitet` / `Provaktivitet` / `Läraraktivitet` / `Övrigt`. Lunch = Övrigt, mentorstid = Elevaktivitet. Plus `calendarEventsRequired`. |
| Datumen ljuger (HT26-fil med vårdatum), `inweek` v2–24, lovveckor | `CalendarEvent.startTime`/`endTime` är **riktiga RFC 3339-datumtider med tidszon**. Inga veckonummer, inga terminsgissningar. |
| Inställda lektioner syns inte | `CalendarEvent.cancelled` |
| Gruppnamn inte unika (fyra "Matte nivå 2b") | Allt är UUID |
| 145 pass med flera klasser, 15 med flera lärare | `Activity.groups[]` och `Activity.teachers[]` är **arrayer** — modellerat från början |
| Lärare = bara förnamn, ingen mejl | `Person.emails[]` med typ `Skola personal`, plus `eduPersonPrincipalNames` |
| Elever saknas helt | `Group.groupMemberships[]` finns i modellen |
| Omuppladdning ger dubbletter | Persistenta UUID:n per entitet |
| Salar | `Activity.rooms[]` med `index` — samma index = välj *en* av dem, olika index = **båda** |

## Vad API:et inte löser

1. **Eleverna finns troligen inte i deras data.** JSON-exportens `groups[].members` är `[]` och
   Students-bladet har noll rader. Modellen har `groupMemberships` — AG:s Royal Schedule verkar
   inte ha fyllt den. Samma osäkerhet gäller `Person.emails`: fältet finns i API:et, men
   filexporterna hade inte en enda mejladress. **Det avgörs först när vi ser ett riktigt svar.**
2. **Inga webhooks.** `/subscriptions`, `/deletedEntities`, `/log` och `/statistics` ligger
   **utkommenterade** i deras spec. "Realtid" i marknadsföringen betyder i praktiken att *vi*
   pollar. Inga `meta.modified.after`-filter heller på de implementerade ändpunkterna →
   full hämtning per synk. I den här skalan (33 personer, 19 grupper, 234 aktiviteter,
   ~600 händelser/vecka) är det en icke-fråga.
3. **Åtkomsten är inte självbetjäning.** Vi behöver token, och vägen dit går via AG + Royal
   Schedule. Ledtid och eventuell kostnad okänd.
4. **Andra skolor kör inte Royal Schedule.** Filimporten behövs ändå på sikt — men SS 12000 är
   en *standard*, så en SS12000-klient fungerar mot Skola24, IST och SchoolSoft också. Den är
   mer återanvändbar än en RS-parser, inte mindre.

## Konsekvens för planen

`CanonicalSchedule`-lagret gör att **Fas A, C och D är identiska oavsett väg** — bara källan
byts. Därför:

- **Fas A (datamodellen) byggs nu.** External refs, `timeslot_classes`, `recordable`,
  lärarmappning, importlogg behövs i båda fallen. Ingen risk för bortkastat arbete.
- **Fas B (RS-filparsern) pausas** tills vi vet om vi får API-åtkomst. Det är den enda delen
  som blir onödig — och den innehåller allt det tråkiga: nyckelordsfiltrering av luncher,
  terminsgissning, GUID-dedup.
- Om vi får API:et blir Fas C:s guide **tre steg i stället för fyra** — lärarmatchningen faller
  bort om `Person.emails` är ifyllt.

## Att ta reda på — i den här ordningen

1. **Till Joel:** ingår SS 12000-integrationen i AG:s Royal Schedule-licens, och kan han godkänna
   Elevante som mottagare? Det är hans knapp, inte vår.
2. **Till Royal Schedule** (via Joel eller direkt): hur utfärdas token, finns dev-miljön öppen
   för test, kostar integrationen något?
3. **Empiriskt, så fort vi har en token mot dev:** är `Person.emails` ifyllt? Har `Group`
   några `groupMemberships`? Det avgör om elev- och lärarlistorna fortfarande måste komma
   från Joels egna filer.
4. **GDPR:** var ligger `backend.royalschedule.com`? Royal Schedule är svenskt, så sannolikt
   inget gränsöverskridande — men det ska verifieras mot principen "inget persondata utanför EU",
   och ett personuppgiftsbiträdesavtal behövs.
