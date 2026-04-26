import React, {useEffect, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {enableScreens} from 'react-native-screens';
import AppNavigator1 from './src/navigation/AppNavigator1';
enableScreens(false);

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => auth().onAuthStateChanged(setUser), []);

  return (
    <NavigationContainer>
      <AppNavigator1 signedIn={!!user} />
    </NavigationContainer>
  );
}