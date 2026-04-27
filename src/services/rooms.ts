import {getFirestore} from '@react-native-firebase/firestore';
import type {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';

export type Room = {
  id: string;
  name: string;
  description: string;
  lastMessageAt?: FirebaseFirestoreTypes.Timestamp;
  lastMessageText?: string;
};

const db = getFirestore();
const roomsCol = () => collection(db, 'rooms');

export function listenToRooms(
  onChange: (rooms: Room[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(roomsCol(), orderBy('lastMessageAt', 'desc'));

  return onSnapshot(
    q,
    snap => {
      const rooms = snap.docs.map(d => ({id: d.id, ...(d.data() as any)}));
      onChange(rooms as Room[]);
    },
    err => onError?.(err)
  );
}

export async function refreshRooms() {
  const q = query(roomsCol(), orderBy('lastMessageAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id: d.id, ...(d.data() as any)})) as Room[];
}

export function listenToRoom(roomId: string, onChange: (room: any) => void) {
  const ref = doc(db, 'rooms', roomId);

  return onSnapshot(ref, snap => {
    onChange({id: snap.id, ...snap.data()});
  });
}

export async function getRoom(roomId: string) {
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  return {id: snap.id, ...snap.data()};
}