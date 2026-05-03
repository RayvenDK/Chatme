# Chatme (React Native CLI + TypeScript + Firebase)

Chatme er en lille chat-app lavet i **React Native CLI** med **TypeScript** og **Firebase Authentication**.
Projektet er lavet som en praktik-/læringsopgave med fokus på projektstruktur, læsbar kode og stabil login-flow.

## Funktioner (status)

- [x] Login screen (Google Sign-In)
- [x] Login screen (Facebook Login) _(kræver Meta setup)_
- [x] Home screen + Sign out
- [x] Chat rooms
- [x] Open chat room
- [ ] Send/receive messages
- [ ] Push notifications _(bonus)_

## Tech stack

- React Native CLI
- TypeScript
- Firebase Auth: `@react-native-firebase/auth`
- Google Sign-In: `@react-native-google-signin/google-signin`
- Facebook Login: `react-native-fbsdk-next`
- Navigation: `@react-navigation/native` + `@react-navigation/native-stack`

## Projektstruktur

- `src/auth/`
  Login-logik pr. provider (Google/Facebook). UI kalder bare `signInWithGoogle()` / `signInWithFacebook()`.
- `src/navigation/`
  Navigation / stack.
- `src/screens/`
  Skærme (Login, Home, osv.)

## Kom i gang

### 1) Installér dependencies

```bash
npm install
```

### 2) Kør Android

```bash
npx react-native run-android
```

## Firebase setup (Android)

1. Opret et Firebase-projekt.
2. Tilføj en Android-app i Firebase med jeres package name (skal matche `android/app/build.gradle`).
3. Download `google-services.json` og placer den her:
   - `android/app/google-services.json`

### SHA-1 (debug) – vigtigt for Google login

Hvis du får `DEVELOPER_ERROR`, mangler der næsten altid SHA-1 eller korrekt `webClientId`.

1. Find SHA-1:

```bash
cd android
./gradlew signingReport
```

2. Kopiér **SHA1** fra `variant: debug` ind i Firebase Console:

- Project settings → Your apps → Android app → Add fingerprint (SHA-1)

3. Download `google-services.json` igen og erstat filen i `android/app/`.

## Google Sign-In

- `webClientId` er sat i `src/auth/google.ts`.
- Login-flow:
  1. `GoogleSignin.signIn()` → `idToken`
  2. `auth().signInWithCredential(...)`

**Typiske fejl**

- `DEVELOPER_ERROR`: forkert/manglende `webClientId`, manglende SHA-1 i Firebase, forkert package name, eller gammel `google-services.json`.

## Facebook Login (Meta)

Facebook kan blokere login, indtil app-oplysninger er udfyldt (privacy policy + data deletion).

Vi hoster de nødvendige sider via GitHub Pages:

- Privacy Policy: `https://rayvendk.github.io/chatme-legal/privacy.html`
- Data Deletion: `https://rayvendk.github.io/chatme-legal/deletion.html`

**Meta checklist (minimum)**

- Udfyld “Settings → Basic” (privacy policy URL, data deletion URL, category, kontakt-email)
- Tilføj Android package name + key hash i Meta
- Sørg for at test-bruger er tilføjet under Roles (Development mode)

## Kodekvalitet / vurderingspunkter

- **Separation of concerns:** auth-logik ligger i `src/auth`, UI ligger i `src/screens`.
- **Error handling:** login-skærmen viser fejl via `Alert` og har loading state.
- **Native look & feel:** der bruges standard RN-komponenter og native-stack navigation.

## Roadmap

1. Splash Screen.
2. Chat rooms screen (liste over rooms)
3. Chat room screen (åbne rum + beskeder)
4. Firestore realtime messages
5. Push notifications (FCM).
6. Upload Billeder i chat rum.
