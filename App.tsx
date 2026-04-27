import React, {useEffect, useState} from 'react';
import type {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {getAuth, onAuthStateChanged} from '@react-native-firebase/auth';
import {NavigationContainer} from '@react-navigation/native';
import {enableScreens} from 'react-native-screens';

import AppNavigator from './src/navigation/AppNavigator';
import {registerForPushNotificationsAndroid} from './src/notifications/registerFCM';
import { onTokenChanged } from '@react-native-firebase/app/dist/module/internal/web/firebaseAppCheck';
import { getToken } from '@react-native-firebase/messaging';

enableScreens(false);

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const a = getAuth();
    return onAuthStateChanged(a, setUser);
  }, []);

  // Register FCM token when signed in
  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAndroid().catch(e => {
      console.warn('registerForPushNotificationsAndroid error', e);
      console.log('FCM token:', getToken);
    });
  }, [user]);

  return (
    <NavigationContainer>
      <AppNavigator signedIn={!!user} />
    </NavigationContainer>
  );
}