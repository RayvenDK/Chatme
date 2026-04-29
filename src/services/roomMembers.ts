import { getFirestore } from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

export type RoomMember = {
  subscribedToNotifications?: boolean;
  promptedForNotificationsAt?: FirebaseFirestoreTypes.Timestamp;
  updatedAt?: FirebaseFirestoreTypes.Timestamp;
};

export function roomMemberRef(roomId: string, uid: string) {
  const db = getFirestore();
  return doc(db, 'rooms', roomId, 'members', uid);
}

export async function getRoomMember(roomId: string, uid: string) {
  const ref = roomMemberRef(roomId, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as RoomMember) : null;
}

export async function setRoomNotificationPreference(
  roomId: string,
  uid: string,
  subscribedToNotifications: boolean,
) {
  const ref = roomMemberRef(roomId, uid);

  await setDoc(
    ref,
    {
      subscribedToNotifications,
      promptedForNotificationsAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
