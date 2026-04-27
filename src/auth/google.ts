import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {getAuth, GoogleAuthProvider, signInWithCredential} from '@react-native-firebase/auth';

GoogleSignin.configure({
  webClientId: '113481042376-4i07purf3j1ug3baublrac8bm881ine8.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Denne returnerer typisk idToken direkte (afhænger lidt af lib version)
  const result = await GoogleSignin.signIn();

  // Foretræk idToken fra signIn-resultatet hvis det findes, ellers fallback til getTokens
  let idToken = (result as any)?.idToken as string | undefined;
  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();
    idToken = tokens.idToken ?? undefined;
  }

  if (!idToken) throw new Error('No idToken returned from Google Sign-In');

  const credential = GoogleAuthProvider.credential(idToken);

  const a = getAuth();
  await signInWithCredential(a, credential);
}