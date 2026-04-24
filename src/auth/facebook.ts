import {LoginManager, AccessToken} from 'react-native-fbsdk-next';
import auth from '@react-native-firebase/auth';

export async function signInWithFacebook() {
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  if (result.isCancelled) return {cancelled: true};

  const data = await AccessToken.getCurrentAccessToken();
  if (!data?.accessToken) throw new Error('No Facebook access token');

  const credential = auth.FacebookAuthProvider.credential(data.accessToken);
  await auth().signInWithCredential(credential);

  return {cancelled: false};
}