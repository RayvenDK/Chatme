import firestore from '@react-native-firebase/firestore';

export type Room = {
  id: string;
  name: string;
  description: string;
  lastMessageAt: FirebaseFirestoreTypes.Timestamp;
  lastMessageText?: string;
};

const roomsRef = () => firestore().collection('rooms');

export function listenToRooms(
  onChange: (rooms: Room[]) => void,
  onError?: (err: unknown) => void
) {
  return roomsRef()
    .orderBy('lastMessageAt', 'desc')
    .onSnapshot(
      snap => {
        const rooms = snap.docs.map(d => ({id: d.id, ...(d.data() as any)}));
        onChange(rooms as Room[]);
      },
      err => onError?.(err)
    );
}

export async function refreshRooms() {
  const snap = await roomsRef().orderBy('lastMessageAt', 'desc').get();
  return snap.docs.map(d => ({id: d.id, ...(d.data() as any)})) as Room[];
}

export function listenToRoom(roomId: string, onChange: (room: any) => void) {
  return roomsRef()
    .doc(roomId)
    .onSnapshot(doc => onChange({id: doc.id, ...doc.data()}));
}