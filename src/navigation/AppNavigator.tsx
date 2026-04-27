import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {Pressable, Text} from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ChatRoom: {roomId: string; title?: string};
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator({signedIn}: {signedIn: boolean}) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: '#111', // <-- gør back-pilen synlig
      }}>
      {signedIn ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={({navigation}) => ({
              title: 'Chat rooms',
              headerRight: () => (
                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  style={{paddingHorizontal: 8, paddingVertical: 4}}>
                  <Text style={{fontSize: 18}}>⚙</Text>
                </Pressable>
              ),
            })}
          />

          <Stack.Screen
  name="ChatRoom"
  component={ChatRoomScreen}
  options={({route, navigation}) => ({
    title: route.params.title ?? 'Chat room',
    headerLeft: () => (
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        style={{paddingHorizontal: 12, paddingVertical: 6}}>
        <Text style={{fontSize: 22, color: '#111'}}>{"‹"}</Text>
      </Pressable>
    ),
  })}
/>

          <Stack.Screen name="Settings" component={SettingsScreen} options={{title: 'Settings'}} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Sign in'}} />
      )}
    </Stack.Navigator>
  );
}