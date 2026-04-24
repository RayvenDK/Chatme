import React from 'react';
import {View, Text, Button} from 'react-native';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

export default function HomeScreen() {
  const user = auth().currentUser;

  const signOut = async () => {
    await auth().signOut();
    try { await GoogleSignin.signOut(); } catch {}
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', padding: 16, gap: 12}}>
      <Text style={{fontSize: 16}}>
        {user ? `Logget ind: ${user.email ?? user.uid}` : 'Ingen bruger'}
      </Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}