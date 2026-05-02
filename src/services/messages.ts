import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  writeBatch,
  QueryDocumentSnapshot, // Tilføjet denne
} from '@react-native-firebase/firestore';

export type Message = {
  id: string;
  type?: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp;
  uid?: string;
  displayName?: string;
  photoURL?: string | null;
};

export type Cursor =
  QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData> | null;

export type LatestMessagesResult = {
  newestDesc: Message[];
  cursor: Cursor;
  hasMore: boolean;
};

export function listenToLatestMessages(roomId: string, pageSize: number) {
  const db = getFirestore();
  const messagesCol = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(pageSize));

  return onSnapshot(q, snap => {
    const newestDesc: Message[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Message, 'id'>),
    }));

    const cursor: Cursor = snap.docs.length
      ? snap.docs[snap.docs.length - 1]
      : null;
    const hasMore = snap.docs.length === pageSize;

    const result: LatestMessagesResult = { newestDesc, cursor, hasMore };
    return result;
  });
}

/**
 * Safer wrapper: returns unsubscribe and uses callbacks (easier in screens)
 */
export function subscribeToLatestMessages(
  roomId: string,
  pageSize: number,
  onNext: (result: LatestMessagesResult) => void,
  onError?: (err: unknown) => void,
) {
  const db = getFirestore();
  const messagesCol = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(pageSize));

  return onSnapshot(
    q,
    snap => {
      const newestDesc: Message[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));

      const cursor: Cursor = snap.docs.length
        ? snap.docs[snap.docs.length - 1]
        : null;
      const hasMore = snap.docs.length === pageSize;

      onNext({ newestDesc, cursor, hasMore });
    },
    err => onError?.(err),
  );
}

export async function loadOlderMessages(
  roomId: string,
  cursor: Cursor,
  pageSize: number,
) {
  if (!cursor)
    return {
      olderDesc: [] as Message[],
      nextCursor: null as Cursor,
      hasMore: false,
    };

  const db = getFirestore();
  const messagesCol = collection(db, 'rooms', roomId, 'messages');

  const qMore = query(
    messagesCol,
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(pageSize),
  );

  const snap = await getDocs(qMore);

  const olderDesc: Message[] = snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<Message, 'id'>),
  }));

  const nextCursor: Cursor = snap.docs.length
    ? snap.docs[snap.docs.length - 1]
    : cursor;
  const hasMore = snap.docs.length === pageSize;

  return { olderDesc, nextCursor, hasMore };
}

export function getCurrentUserOrThrow(): FirebaseAuthTypes.User {
  const user = auth().currentUser;
  if (!user) throw new Error('Not logged in');
  return user;
}

export async function sendMessageToRoom(
  roomId: string,
  text: string,
  user: FirebaseAuthTypes.User,
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const db = getFirestore();
  const now = Timestamp.now();

  const roomRef = doc(db, 'rooms', roomId);
  const msgRef = doc(collection(db, 'rooms', roomId, 'messages'));

  const batch = writeBatch(db);

  batch.set(msgRef, {
    type: 'text',
    text: trimmed,
    createdAt: now,
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? 'Unknown',
    photoURL: user.photoURL ?? null,
  });

  batch.set(
    roomRef,
    { lastMessageAt: now, lastMessageText: trimmed },
    { merge: true },
  );

  await batch.commit();
}
