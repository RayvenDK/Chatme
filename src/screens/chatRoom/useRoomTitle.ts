import { useEffect } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { getRoom } from '../../services/rooms';

export function useRoomTitle(
  roomId: string,
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>,
) {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const room = await getRoom(roomId);
        const name = (room as any)?.name;

        if (!alive) return;

        if (typeof name === 'string' && name.trim().length > 0) {
          navigation.setOptions({ title: name });
        } else {
          navigation.setOptions({ title: 'Chat room' });
        }
      } catch {
        if (!alive) return;
        navigation.setOptions({ title: 'Chat room' });
      }
    })();

    return () => {
      alive = false;
    };
  }, [roomId, navigation]);
}
