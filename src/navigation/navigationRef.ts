import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ChatRoom: { roomId: string; title?: string };
  Settings: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
