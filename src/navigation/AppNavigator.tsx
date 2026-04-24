import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator({signedIn}: {signedIn: boolean}) {
  return (
    <Stack.Navigator>
      {signedIn ? (
        <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Chatme'}} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Sign in'}} />
      )}
    </Stack.Navigator>
  );
}