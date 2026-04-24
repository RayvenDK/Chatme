import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '113481042376-4i07purf3j1ug3baublrac8bm881ine8.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});


export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  await GoogleSignin.signIn();

  const tokens = await GoogleSignin.getTokens();
  const idToken = tokens.idToken;
  if (!idToken) throw new Error('No idToken returned from Google Sign-In');

  const credential = auth.GoogleAuthProvider.credential(idToken);
  await auth().signInWithCredential(credential);
}