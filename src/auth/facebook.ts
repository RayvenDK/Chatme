import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import {
  FacebookAuthProvider,
  getAuth,
  signInWithCredential,
} from '@react-native-firebase/auth';

export async function signInWithFacebook() {
  // Force web login (prevents inconsistent behavior across devices)
  try {
    // Available in newer versions of react-native-fbsdk-next
    LoginManager.setLoginBehavior('web_only');
  } catch {
    // ignore if not supported
  }

  // (Optional) Ensure we don't reuse old sessions:
  // try { LoginManager.logOut(); } catch {}

  const result = await LoginManager.logInWithPermissions(['public_profile']);
  if (result.isCancelled) return { cancelled: true };

  const data = await AccessToken.getCurrentAccessToken();
  if (!data?.accessToken) throw new Error('No Facebook access token');

  const credential = FacebookAuthProvider.credential(data.accessToken);

  const a = getAuth();
  await signInWithCredential(a, credential);

  return { cancelled: false };
}
