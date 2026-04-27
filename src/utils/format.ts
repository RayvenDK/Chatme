import type {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

export function formatTime(ts?: FirebaseFirestoreTypes.Timestamp) {
  if (!ts || typeof (ts as any).toDate !== 'function') return '--:--';
  const d = ts.toDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}