# Setup & kørsel (Android)

Dette dokument beskriver hvordan projektet installeres, køres og testes.

## Krav

- Node.js (LTS anbefalet)
- Android Studio + Android SDK
- Java 17 (typisk)
- En Android emulator eller fysisk Android device
- Firebase projekt opsat (Auth + Firestore + evt. Cloud Messaging)

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

### Hvis du oplever mærkelige bundler/build fejl

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

## Firebase / Firestore

Appen forventer:

- En `rooms` collection i Firestore.
- Under hvert room: `rooms/{roomId}/messages` subcollection.

### Testdata

Opret et room:

- `rooms/{roomId}` med felter:
- `name`
- `description`
- `lastMessageAt` (valgfri)
- `lastMessageText` (valgfri)

## Test: chat funktionalitet

Acceptance (chat):

1. Åbn et room → seneste 50 beskeder vises.
2. Scroll op → load flere (pagination).
3. Når en ny besked kommer (fra anden klient) → opdateres listen automatisk (realtime).
4. Inputfelt i bunden → kan skrive og sende besked.
5. Besked viser avatar/initialer, navn, tidspunkt og tekst.

## Test: FCM token registrering (Android)

1. Log ind.
2. Appen registrerer FCM token og gemmer det i:
   - `users/{uid}.fcmTokens`
3. På Android 13+ kan der komme en runtime permission prompt for notifikationer.
   - På Android < 13 kommer der typisk ingen prompt.

### Fejlfinding hvis token ikke gemmes

- Check Metro logs for `FCM token: ...`
- Check Firestore rules: brugeren skal have lov at skrive til `users/{uid}`.
- Check at `google-services.json` er korrekt sat op til Android appen.

## Notifikationer (kommende arbejde)

For at sende push notifikationer til andre brugere kræves server-side udsendelse:

- Firebase Cloud Functions (ikke sat op endnu i projektet)
- Trigger på nye docs i `rooms/{roomId}/messages/{messageId}`
