import storage from '@react-native-firebase/storage';
import {
  getFirestore,
  collection,
  doc,
  Timestamp,
  writeBatch,
} from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export async function sendImageToRoom(
  roomId: string,
  localUri: string,
  user: FirebaseAuthTypes.User,
) {
  const db = getFirestore();
  const now = Timestamp.now();

  // Create message id first (so we can use it in Storage path)
  const msgRef = doc(collection(db, 'rooms', roomId, 'messages'));
  const messageId = msgRef.id;

  // Upload to Storage
  const imagePath = `rooms/${roomId}/images/${messageId}.jpg`;
  const ref = storage().ref(imagePath);

  await ref.putFile(localUri);

  const imageUrl = await ref.getDownloadURL();

  const batch = writeBatch(db);

  batch.set(msgRef, {
    type: 'image',
    imageUrl,
    imagePath,
    createdAt: now,
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? 'Unknown',
    photoURL: user.photoURL ?? null,
  });

  batch.set(
    doc(db, 'rooms', roomId),
    { lastMessageAt: now, lastMessageText: '📷 Image' },
    { merge: true },
  );

  await batch.commit();
}
