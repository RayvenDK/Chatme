import React, {useEffect, useState} from "react";
import type {FirebaseAuthTypes} from "@react-native-firebase/auth";
import {getAuth, onAuthStateChanged} from "@react-native-firebase/auth";
import {NavigationContainer} from "@react-navigation/native";
import {enableScreens} from "react-native-screens";

import AppNavigator from "./src/navigation/AppNavigator";
import {registerForPushNotificationsAndroid} from "./src/notifications/registerFCM";
import {navigationRef} from "./src/navigation/navigationRef";
import {registerNotificationOpenHandlers} from "./src/notifications/notificationOpen";


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

    registerForPushNotificationsAndroid().catch((e) => {
      console.warn("registerForPushNotificationsAndroid error", e);
    });
  }, [user]);

  // Handle tapping notifications -> navigate to room
  useEffect(() => {
    const unsubscribe = registerNotificationOpenHandlers();
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator signedIn={!!user} />
    </NavigationContainer>
  );
}