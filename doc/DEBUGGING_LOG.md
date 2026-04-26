# Teknisk Dokumentation: Navigationsfejl og løsning

**Dato:** 24. maj 2024
**Emne:** Skift fra Native Stack til JS Stack Navigation
**Status:** Løst

## Problembeskrivelse

I forbindelse med udviklingen af chat-appen opstod der en kritisk fejl i navigationsflowet:

1. Brugeren befinder sig på `HomeScreen` (liste over chatrum).
2. Brugeren klikker ind på et specifikt chatrum (`ChatScreen`).
3. Brugeren sender en besked.
4. Ved afsendelse af besked opstod der en fejl, og når brugeren navigerede tilbage til `HomeScreen`, var skærmen "frosset". Det var ikke længere muligt at klikke på andre rum eller interagere med interfacet.

## Fejlsøgning (Debugging)

Der blev brugt ca. 8 timer på at løse problemet. Følgende blev undersøgt uden held:

- **State Management:** Gennemgang af om beskederne låste appens state.
- **AI-assisteret fejlfinding:** Forskellige løsningsforslag fra AI blev testet (re-renders, useEffect optimering, navigation listeners), men ingen af dem løste problemet.
- **Memory leaks:** Undersøgelse af om chat-lyttere ikke blev lukket korrekt.

## Løsning

Problemet blev identificeret som værende relateret til `@react-navigation/native-stack`. Selvom Native Stack yder bedre performance ved at bruge native OS komponenter, skabte det en uforklarlig fastlåsning af UI-tråden i det specifikke chat-flow.

**Handling:**
Hele navigationsstrukturen blev migreret fra `native-stack` til den standard JavaScript-baserede Stack Navigator (`@react-navigation/stack`).

```javascript
// Fra:
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Til:
import { createStackNavigator } from '@react-navigation/stack';

Resultat

Efter skiftet til JS Stack Navigation forsvandt fejlen øjeblikkeligt. Appen fryser ikke længere ved returnering til Home-skærmen, og navigationen mellem rum fungerer stabilt.

Læring: I tilfælde hvor Native Stack skaber uforudsigelig adfærd i komplekse chat-flows med mange state-opdateringer, kan JS Stack være en mere stabil løsning, da den giver React mere direkte kontrol over navigations-interaktionerne.
```
