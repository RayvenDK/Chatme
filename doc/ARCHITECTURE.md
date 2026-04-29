# Arkitektur (ChatMe)

Dette dokument beskriver appens nuværende struktur og de vigtigste tekniske beslutninger.

## Tech stack

- **React Native** (0.85.x)
- **TypeScript**
- **React Navigation** (Stack Navigator – JS stack)
- **Firebase**
  - Auth (`@react-native-firebase/auth`)
  - Firestore (`@react-native-firebase/firestore`)
  - Messaging / FCM (`@react-native-firebase/messaging`) – kun token-registrering pt.

## Mappestruktur (overblik)

- `src/screens/`
  - `ChatRoomsScreen.tsx` — liste over rooms
  - `ChatRoomScreen.tsx` — beskeder i et room + input + send
  - `LoginScreen.tsx`, `SettingsScreen.tsx`, `HomeScreen.tsx` (afhænger af flow)
- `src/navigation/`
  - `AppNavigator*.tsx` — navigation og routes (der bør kun være én “source of truth”)
- `src/services/`
  - `rooms.ts` — Firestore logik for rooms
  - `messages.ts` — Firestore logik for beskeder (realtime + pagination + send)
- `src/notifications/`
  - `registerFCM.ts` — registrerer FCM token og gemmer det på brugeren
- `src/utils/`
  - `format.ts` — fx `formatTime`
  - `user.ts` — fx `initials`
- `doc/`
  - `DEBUGGING_LOG.md` — fejl/noter og løsninger
  - `ARCHITECTURE.md` — dette dokument
  - `SETUP.md` — opsætning og test

## Data model (Firestore)

### `rooms/{roomId}`

Forventede felter:

- `name: string`
- `description: string`
- `lastMessageAt?: Timestamp`
- `lastMessageText?: string`

### `rooms/{roomId}/messages/{messageId}`

Forventede felter:

- `text: string`
- `createdAt: Timestamp`
- `uid: string`
- `displayName: string`
- `photoURL: string | null`

### `users/{uid}`

Forventede felter:

- `fcmTokens: { [token: string]: true }`

> Bemærk: Push-notifikationer til andre brugere kræver server-side logik (Cloud Functions). Det er ikke implementeret endnu.

## Chat: realtime + pagination

- Når `ChatRoomScreen` åbnes:
- Seneste **50** beskeder hentes realtime via `onSnapshot` (`orderBy(createdAt, 'desc') + limit(50)`).
- Listen kører med `FlatList` + `inverted`, så UI starter ved nyeste beskeder.
- Pagination:
- Når brugeren scroller op, hentes ældre beskeder via `startAfter(cursor)` + `limit(50)`.
- Realtime + pagination merge:
- Realtime opdaterer de nyeste beskeder.
- Paginerede ældre beskeder bevares (dedup via message-id).

## Notifications (status)

- ✅ Appen kan hente og gemme FCM token i `users/{uid}.fcmTokens`.
- ⏳ “Room subscription” (spørg brugeren og gem subscription pr room) er ikke implementeret endnu.
- ⏳ Server-side push udsendelse (Cloud Functions) er ikke implementeret endnu.
- ⏳ “Tap på notifikation -> åbner rummet” er ikke implementeret endnu.
