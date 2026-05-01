import React, {useEffect, useState} from 'react';
import type {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {getAuth, onAuthStateChanged} from '@react-native-firebase/auth';
import {NavigationContainer} from '@react-navigation/native';
import {enableScreens} from 'react-native-screens';
import BootSplash from 'react-native-bootsplash';

import AppNavigator from './src/navigation/AppNavigator';
import {registerForPushNotificationsAndroid} from './src/notifications/registerFCM';
import {navigationRef} from './src/navigation/navigationRef';
import {registerNotificationOpenHandlers} from './src/notifications/notificationOpen';
import SplashOverlay from './src/screens/SplashOverlay';

enableScreens(false);

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);

  // Fade overlay: true = keep overlay visible; false = fade it away
  const [overlayHide, setOverlayHide] = useState(false);

  useEffect(() => {
    const a = getAuth();
    return onAuthStateChanged(a, nextUser => {
      setUser(nextUser);
      setAuthInitializing(false);
    });
  }, []);

  // Register FCM token when signed in
  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAndroid().catch(e => {
      console.warn('registerForPushNotificationsAndroid error', e);
    });
  }, [user]);

  // Handle tapping notifications -> navigate to room
  useEffect(() => {
    const unsubscribe = registerNotificationOpenHandlers();
    return unsubscribe;
  }, []);

  // Hide native splash when auth state is resolved, then fade in UI
  useEffect(() => {
    if (authInitializing) return;

    BootSplash.hide({fade: false})
      .catch(() => {
        // ignore
      })
      .finally(() => {
        // start fade-in of next screen by fading overlay out
        setOverlayHide(true);
      });
  }, [authInitializing]);

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Gate navigation until auth is resolved to avoid Login "flash" */}
      {!authInitializing ? <AppNavigator signedIn={!!user} /> : null}

      {/* Fade overlay on top of everything */}
      <SplashOverlay hide={overlayHide} />
    </NavigationContainer>
  );
}