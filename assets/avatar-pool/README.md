# Avatar-pool — reservporträtt

Oanvända syntetiska (AI-genererade) ansikten. **Inga riktiga personer.** Ligger
utanför `apps/web/public/` med flit: de publiceras inte, de ligger här för att
kunna plockas in när en ny demo-elev eller demo-lärare behöver ett ansikte.

## Så använder du dem

1. Kopiera bilden till `apps/web/public/avatars/<fornamn-efternamn>.jpg`
   (gemener, å/ä → a, ö → o — samma slugg-form som de befintliga).
2. Lägg till raden i `apps/web/lib/avatars.ts`, nyckeln är hela namnet i gemener.

Avatar-komponenten slår upp namnet automatiskt; personer utan porträtt får
initialer i stället.

## Innehåll

Filnamnen beskriver kön och ungefärlig ålder, så att könet blir rätt mot namnet
och åldern rimlig mot rollen (gymnasieelev ≈ 16–19, lärare vuxen).

| Fil | Läser som |
|---|---|
| `pojke-morkt-har-13ar.jpg` | kille, ~13 — ung för gymnasiet |
| `man-beige-krage-28ar.jpg` | man, ~28 |
| `man-bakatkammat-30ar.jpg` | man, ~30 |
| `man-glasogon-30ar.jpg` | man, ~30, glasögon |
| `kvinna-mork-bob-35ar.jpg` | kvinna, ~35 |
| `kvinna-blond-40ar.jpg` | kvinna, ~40 — passar lärare |
| `kvinna-brunt-har-30ar.jpg` | kvinna, ~30 |
| `kvinna-orhangen-32ar.jpg` | kvinna, ~32 |
| `neutral-*.jpg` (4 st) | könsmässigt tvetydiga |

De fyra `neutral-`bilderna går inte att para ihop med ett tydligt kille- eller
tjejnamn utan att det riskerar att se fel ut. Använd dem bara till namn som
fungerar oavsett, eller låt bli.
