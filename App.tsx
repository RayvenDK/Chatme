import React, {useEffect, useState} from 'react';
import {SafeAreaView, Text, TextInput, Button, View, Alert} from 'react-native';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';

export default function App() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('Password123!');
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged(u => setUser(u));
    return unsub;
  }, []);

  const signUp = async () => {
    try {
      await auth().createUserWithEmailAndPassword(email.trim(), password);
      Alert.alert('OK', 'User created');
    } catch (e: any) {
      Alert.alert('Sign up error', e?.message ?? String(e));
    }
  };

  const signIn = async () => {
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      Alert.alert('OK', 'Signed in');
    } catch (e: any) {
      Alert.alert('Sign in error', e?.message ?? String(e));
    }
  };

  const signOut = async () => {
    try {
      await auth().signOut();
      Alert.alert('OK', 'Signed out');
    } catch (e: any) {
      Alert.alert('Sign out error', e?.message ?? String(e));
    }
  };

  return (
    <SafeAreaView style={{flex: 1, padding: 16}}>
      <Text style={{fontSize: 20, fontWeight: '600'}}>Firebase Auth Test</Text>

      <View style={{height: 12}} />

      <Text>Current user:</Text>
      <Text selectable style={{marginBottom: 12}}>
        {user ? `${user.uid} (${user.email ?? 'no email'})` : 'Signed out'}
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="email"
        style={{borderWidth: 1, padding: 10, marginBottom: 10}}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="password"
        style={{borderWidth: 1, padding: 10, marginBottom: 10}}
      />

      <View style={{gap: 8}}>
        <Button title="Sign up" onPress={signUp} />
        <Button title="Sign in" onPress={signIn} />
        <Button title="Sign out" onPress={signOut} />
      </View>

      <View style={{height: 12}} />
      <Text style={{opacity: 0.7}}>
        Tip: skift email til noget unikt når du tester Sign up.
      </Text>
    </SafeAreaView>
  );
}