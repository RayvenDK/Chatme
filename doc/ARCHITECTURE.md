# Arkitektur (ChatMe)

Dette dokument beskriver appens nuværende struktur og de vigtigste tekniske beslutninger.

## Tech stack

- **React Native** (0.85.x)
- **TypeScript**
- **React Navigation** (Native Stack)
- **Firebase**
  - Auth (`@react-native-firebase/auth`)
  - Firestore (`@react-native-firebase/firestore`)
  - Messaging / FCM (`@react-native-firebase/messaging`)
  - Storage (`@react-native-firebase/storage`)
  - Cloud Functions (server-side push-notifikationer)

## Mappestruktur (overblik)

- `src/screens/`
  - `ChatRoomsScreen.tsx` — liste over rooms
  - `ChatRoomScreen.tsx` — chat i et room (samler hooks/komponenter)
  - `LoginScreen.tsx`, `SettingsScreen.tsx`, `HomeScreen.tsx` (afhænger af flow)
  - `screens/chatRoom/`
    - `useRoomTitle.ts` — henter room name og sætter navigation title
    - `useRoomMessages.ts` — realtime + pagination + merge/dedup
    - `MessageBubble.tsx` — render af text/image + left/right layout + tap-to-view
    - `ChatInputBar.tsx` — input + send + kamera/galleri knapper
- `src/navigation/`
  - `AppNavigator*.tsx` — navigation og routes
- `src/services/`
  - `rooms.ts` — Firestore logik for rooms
  - `messages.ts` — Firestore logik for beskeder (realtime + pagination + send text)
  - `images.ts` — upload til Storage + opret message doc (`type: "image"`)
  - `roomMembers.ts` — room membership + notifikations-preference pr room
- `src/notifications/`
  - `registerFCM.ts` — registrerer FCM token og gemmer på bruger (`users/{uid}.fcmTokens`)
  - _(evt.) handlers til tap på notifikation -> navigation til ChatRoom_
- `src/utils/`
  - `format.ts` — fx `formatTime`
  - `user.ts` — fx `initials`
- `functions/`
  - `src/index.ts` — Cloud Function(s), bl.a. `notifyOnNewMessage` (push ved nye beskeder)
- `doc/`
  - `DEBUGGING_LOG.md` — fejl/noter og løsninger
  - `ARCHITECTURE.md` — dette dokument
  - `SETUP.md` — opsætning og test
  - `ACCEPTANCE.md` --
  - `OVERVIEW.md` --

---

## Data model (Firestore)

### `rooms/{roomId}`

Forventede felter:

- `name: string`
- `description?: string`
- `lastMessageAt?: Timestamp`
- `lastMessageText?: string`

### `rooms/{roomId}/members/{uid}`

Forventede felter:

- `subscribedToNotifications?: boolean`
- `promptedForNotificationsAt?: Timestamp` (bruges til kun at spørge én gang)

### `rooms/{roomId}/messages/{messageId}`

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
- `imagePath: string` (Storage path, bruges til evt. cleanup/sletning senere)

### `users/{uid}`

Forventede felter:

- `fcmTokens: { [token: string]: true }`

---

## Chat: realtime + pagination

Når `ChatRoomScreen` åbnes:

- Seneste **50** beskeder hentes realtime via `onSnapshot`
  - `orderBy(createdAt, 'desc') + limit(50)`
- Listen kører med `FlatList` + `inverted`, så UI starter ved nyeste beskeder.

Pagination (load more):

- Når brugeren scroller op, hentes ældre beskeder via:
  - `startAfter(cursor)` + `limit(50)`

Realtime + pagination merge:

- Realtime opdaterer de nyeste beskeder.
- Paginerede ældre beskeder bevares.
- Dedup sker på message-id.

---

## Upload af billeder

Bibliotek:

- `react-native-image-picker`

Flow:

1. Brugeren vælger billede fra galleri eller tager billede med kamera.
2. Filen uploades til Firebase Storage:
   - `rooms/{roomId}/images/{messageId}.jpg`
3. Appen opretter en message i Firestore med `type: "image"` og `imageUrl`.
4. ChatRoom viser image-beskeder i samme liste som tekstbeskeder.

---

## Image viewer (tap for stort billede)

- `MessageBubble` wrapper billeder i en `Pressable`.
- Ved tryk kaldes `onOpenImage(url)`.
- `ChatRoomScreen` viser en `Modal` med stor visning (`resizeMode="contain"`).
- Tap på backdrop lukker modal.

---

## Push-notifikationer

### Token registrering (client)

- Appen henter device FCM token (Messaging) og gemmer i:
  - `users/{uid}.fcmTokens = { [token]: true }`

### Room subscriptions (client)

- Ved første send i et room spørges brugeren om notifikationer for rummet.
- Valget gemmes pr room-member:
  - `rooms/{roomId}/members/{uid}.subscribedToNotifications = true/false`
- Brugeren bliver kun spurgt én gang via `promptedForNotificationsAt`.

### Udsendelse (server - Cloud Function)

Cloud Function trigger:

- `onDocumentCreated('rooms/{roomId}/messages/{messageId}')`

Flow:

1. Finder `senderUid` på message.
2. Finder room members med `subscribedToNotifications == true`.
3. Filtrerer afsender fra (sender får ikke push).
4. Henter tokens fra `users/{uid}.fcmTokens`.
5. Sender FCM multicast:
   - `notification.title = room.name` (fx "Help", "General")
   - `notification.body = "<sender>: <text>"`
   - `data.roomId = roomId`
6. Cleanup:
   - Tokens der er `not-registered` / `invalid` fjernes fra `users/{uid}.fcmTokens`.

### Tap på notifikation -> åbner rummet

- Når brugeren trykker på en notifikation, navigerer appen til:
  - `ChatRoom` med `{roomId}` fra `data.roomId`.
- ChatRoom header titel sættes ved at hente room doc (`useRoomTitle`).

---

## UI layout: incoming/outgoing

- Incoming (andre): venstre, avatar + grå bubble.
- Outgoing (mine): højre, blå bubble.
- Keyboard overlap på Android håndteres via `KeyboardAvoidingView` + `keyboardVerticalOffset`.
