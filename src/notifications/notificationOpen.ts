import { getMessaging } from '@react-native-firebase/messaging';
import { navigate } from '../navigation/navigationRef';

type RemoteData = {
  roomId?: string;
};

export function registerNotificationOpenHandlers() {
  const messaging = getMessaging();

  // App i baggrund -> åbnet ved tap
  const unsubOpened = messaging.onNotificationOpenedApp(remoteMessage => {
    const data = remoteMessage?.data as RemoteData | undefined;
    const roomId = data?.roomId;
    if (roomId) {
      navigate('ChatRoom', { roomId });
    }
  });

  // App helt lukket -> åbnet ved tap (cold start)
  messaging
    .getInitialNotification()
    .then(remoteMessage => {
      const data = remoteMessage?.data as RemoteData | undefined;
      const roomId = data?.roomId;
      if (roomId) {
        setTimeout(() => navigate('ChatRoom', { roomId }), 250);
      }
    })
    .catch(() => {
      // ignore
    });

  return () => {
    unsubOpened();
  };
}
