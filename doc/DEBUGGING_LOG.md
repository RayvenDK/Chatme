# Debugging log

## 24.05.2026 — Navigationsfejl: UI fryser efter chat + tilbage-navigation

**Emne:** UI “fryser” efter afsendelse af besked og tilbage-navigation til room-listen.  
**Status:** Løst.

### Problembeskrivelse

Flow som udløste fejlen:

1. Brugeren er på `ChatRoomsScreen` (liste over chatrum).
2. Brugeren åbner et room (`ChatRoomScreen`).
3. Brugeren sender en besked.
4. Ved navigation tilbage til `ChatRoomsScreen` var UI “frosset”:
   - Tryk på andre rum virkede ikke
   - Interaktioner føltes låst / ingen respons

### Fejlsøgning (hvad der blev undersøgt)

- **Cleanup af keyboard/focus:** test af `useFocusEffect` cleanup, `beforeRemove` navigation listener, `Keyboard.dismiss()` og `blur()`.
- **Realtime listener:** gennemgang af om `onSnapshot` unsubscribe blev kaldt korrekt ved unmount / navigation.
- **State-opdateringer:** forsøg på at reducere re-renders og sikre at updates ikke skete på forkert tidspunkt.
- **Liste/scroll adfærd:** gennemgang af `FlatList` og keyboard-interaktioner.

### Årsag (konklusion)

Fejlen virkede bundet til brug af `@react-navigation/native-stack` i kombination med chat-flowet (mange state-opdateringer + keyboard/liste). Det gav en uforudsigelig låsning af UI-tråden i netop dette scenarie.

Der blev ikke fundet én enkel “kode-linje” der udløste fejlen; symptomet forsvandt ved ændring af navigator-implementation.

### Løsning

Navigationen blev migreret fra Native Stack til JavaScript Stack Navigator:

```ts
// Fra:
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Til:
import { createStackNavigator } from '@react-navigation/stack';
```

### Resultat

- UI fryser ikke længere efter tilbage-navigation.
- Navigation mellem rooms er stabil igen.

### Læring

Native Stack giver ofte bedre performance, men i visse flows (chat + keyboard + realtime state) kan JS Stack være mere stabil og lettere at debugge, fordi React styrer navigationen mere direkte.
