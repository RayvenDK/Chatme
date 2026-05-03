import auth from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { doc, setDoc } from '@react-native-firebase/firestore';

import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';

export async function registerForPushNotificationsAndroid() {
  const user = auth().currentUser;
  if (!user) return;

  const messaging = getMessaging();

  // Android 13+ permission (og i praksis “granted” på < 13)
  const status = await requestPermission(messaging);
  const enabled =
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL;

  if (!enabled) return;

  const token = await getToken(messaging);
  if (!token) return;

  const db = getFirestore();
  const userRef = doc(db, 'users', user.uid);

  await setDoc(userRef, { fcmTokens: { [token]: true } }, { merge: true });

  onTokenRefresh(messaging, async newToken => {
    await setDoc(userRef, { fcmTokens: { [newToken]: true } }, { merge: true });
  });
}
