# Chatme – Overblik

## Formål

Chatme er en simpel chat-app bygget i React Native CLI med Firebase som backend.

Appen understøtter:

- Login (Firebase Auth)
- Chat rooms (Firestore)
- Beskeder (Firestore)
- Push-notifikationer ved nye beskeder (Cloud Functions + FCM)
- Upload af billeder fra kamera og galleri (Firebase Storage)
- Åbning af korrekt chat room når man trykker på notifikation (Deep link via FCM data)

## Firebase services i brug

- **Firebase Auth**: Brugersession
- **Cloud Firestore**: Rooms, members og messages
- **Cloud Functions (2nd gen)**: Sender push ved nye beskeder
- **Firebase Cloud Messaging (FCM)**: Tokens og push-notifikationer
- **Firebase Storage**: Gemmer billeder, beskeder gemmer URL i Firestore

## Data model (Firestore)

### Rooms

`rooms/{roomId}`

- `name: string`
- `description: string`
- `lastMessageAt: Timestamp`
- `lastMessageText: string`

### Room members

`rooms/{roomId}/members/{uid}`

- `subscribedToNotifications: boolean`
- `promptedForNotificationsAt: Timestamp` (eller et flag/eksistens, afhænger af implementation)

### Messages

`rooms/{roomId}/messages/{messageId}`
Fælles felter:

- `type: "text" | "image"`
- `createdAt: Timestamp`
- `uid: string`
- `displayName: string`
- `photoURL: string | null`

Text message:

- `text: string`

Image message:

- `imageUrl: string`
- `imagePath: string` (Storage path til evt. cleanup/sletning)

### Users

`users/{uid}`

- `fcmTokens: { [token: string]: true }` (map)

## Push-notifikationer – flow

1. Appen registrerer FCM token efter login og gemmer det i `users/{uid}.fcmTokens`.
2. Når der oprettes et nyt message dokument i `rooms/{roomId}/messages/*`, kører en Cloud Function:
   - Finder room members der har `subscribedToNotifications=true`
   - Filtrerer afsenderen fra (sender får ikke sin egen push)
   - Finder modtagernes FCM tokens
   - Sender push med `data.roomId`
   - Fjerner invalide tokens (not-registered/invalid) fra Firestore
3. Appen lytter efter “tap på notifikation” (background + cold start) og navigerer til `ChatRoom` med `roomId`.

## Upload af billeder – flow

1. Brugeren vælger billede fra galleri eller tager billede med kamera (react-native-image-picker).
2. Appen uploader filen til Storage: `rooms/{roomId}/images/{messageId}.jpg`
3. Appen opretter en message i Firestore med `type: "image"` og `imageUrl`.
4. ChatRoom viser image-beskeder i samme liste som tekstbeskeder.

## UI adfærd i chat

- Egne beskeder vises til højre (blå bubble)
- Andre brugeres beskeder vises til venstre (grå bubble + avatar)
- Room-navn vises i header og hentes fra Firestore
