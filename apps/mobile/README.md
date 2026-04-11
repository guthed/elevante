# Elevante Mobile

React Native + Expo-app för lärare. Skanna QR-koden med Expo Go (iOS App Store / Play Store) eller bygg native via EAS.

## Kom igång

```bash
# Från repo-roten
corepack pnpm install

# Skapa .env från mall och fyll i Supabase-nyckeln
cd apps/mobile
cp .env.example .env
# Redigera .env och sätt EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# Starta dev-servern
corepack pnpm --filter @elevante/mobile start
# eller
npx expo start
```

## Skärmar

- `app/(auth)/login.tsx` — Logga in med samma Supabase-konto som webben
- `app/(app)/index.tsx` — Dagens lektioner (hämtas från `elevante.timeslots`)
- `app/(app)/record.tsx` — REC/STOP, skapar `lessons`-rad och köar audio för upload

## Inspelningsflöde

1. Läraren öppnar appen, ser dagens lektioner från sitt schema
2. Trycker på en lektion → REC-skärm
3. Trycker REC-knappen — `expo-audio` startar inspelning
4. Tryck STOP — `lessons`-rad skapas, audio läggs i `lib/queue.ts`-kön
5. Kön försöker ladda upp direkt via Supabase Storage; om offline ligger filen kvar tills nästa öppning av appen
6. Pipelinen i Fas 6 plockar upp audio_path från lessons-tabellen och kör KB-Whisper

## Stack

- Expo SDK 52 + Expo Router 4 (file-based routing)
- React Native 0.76 + React 19
- Supabase JS v2 med expo-secure-store-adapter (Keychain på iOS, Keystore på Android)
- expo-audio för inspelning
- expo-file-system + AsyncStorage för upload-queue

## Säkerhet

- Audio-filer hamnar i privat bucket `elevante-audio` med RLS som låter bara samma skola läsa/skriva.
- Rådljud raderas av pipelinen i Fas 6 efter transkribering.
- Sessions lagras i Keychain/Keystore via `expo-secure-store`. Autorefresh aktiverat.
