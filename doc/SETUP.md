# Setup & kørsel (Android)

Dette dokument beskriver hvordan projektet installeres, køres og testes.

## Krav

- Node.js (LTS anbefalet)
- Android Studio + Android SDK
- Java 17 (typisk)
- En Android emulator eller fysisk Android device
- Firebase projekt opsat (Auth + Firestore + Cloud Messaging + Storage + Functions)
- `google-services.json` i `android/app/`

## Installation

```bash
npm install
```

## Kør appen (Android)

Start Metro:

```bash
npx react-native start
```

Kør Android build:

```bash
npx react-native run-android
```

## Splash screen (BootSplash)

Splash screen genereres fra:

- `assets/LogoSplash.png`

Kommando (Windows/PowerShell – én linje):

```bash
npx react-native-bootsplash generate assets/LogoSplash.png --background-color=FFFFFF --logo-width=140
```

Bemærk:

- Hvis du får advarslen om at logo kan blive “cropped” på Android, så prøv fx `--logo-width=120`.
- Kør derefter en clean build:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Hvis du oplever mærkelige bundler/build fejl

Reset Metro cache:

```bash
npx react-native start --reset-cache
```

Rens gradle build:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Fejlfinding: ADB version mismatch / kan ikke installere APK

Symptomer kan være:

- `adb server version (40) doesn't match this client (41)`
- `Cannot reach ADB server`
- `Connection reset by peer`

Fix:

```bash
adb kill-server
adb start-server
adb devices
```

Hvis du har flere ADB-installationer, så brug Android SDK’s `adb.exe` og ryd op i PATH.

## Firebase / Firestore

Appen forventer:

- En `rooms` collection i Firestore.
- Under hvert room: `rooms/{roomId}/messages` subcollection.
- Under hvert room: `rooms/{roomId}/members` subcollection (til notification preferences).
- `users/{uid}` docs (til FCM tokens).

### Testdata

Opret et room:

- `rooms/{roomId}` med felter:
  - `name` (string)
  - `description` (valgfri)
  - `lastMessageAt` (valgfri)
  - `lastMessageText` (valgfri)

## Test: chat funktionalitet

Acceptance (chat):

1. Åbn et room → seneste 50 beskeder vises.
2. Scroll op → load flere (pagination).
3. Når en ny besked kommer (fra anden klient) → opdateres listen automatisk (realtime).
4. Inputfelt i bunden → kan skrive og sende besked.
5. Besked viser avatar/initialer, navn, tidspunkt og tekst.

## Test: upload af billeder i chat

1. Tryk 📷 → tag billede → sendes og vises i chat
2. Tryk 🖼️ → vælg billede fra galleri → sendes og vises i chat
3. Tryk på et billede i chat → åbner stor preview (Modal)

## Test: Push / FCM

### Token registrering (Android)

1. Log ind.
2. Appen registrerer FCM token og gemmer det i:
   - `users/{uid}.fcmTokens`
3. På Android 13+ kan der komme en runtime permission prompt for notifikationer.
   - På Android < 13 kommer der typisk ingen prompt.

### Test: push til andre brugere

Kræver Cloud Function der sender push ved nye beskeder:

- Trigger på nye docs i `rooms/{roomId}/messages/{messageId}`
- Filtrer afsender fra
- Send til medlemmer med `subscribedToNotifications == true`

## Noter om keyboard på Android

På nyere Android/Samsung kan input blive dækket af keyboard.
Løsning i appen:

- `android:windowSoftInputMode="adjustResize"` i `AndroidManifest.xml`
- `KeyboardAvoidingView` bruges
