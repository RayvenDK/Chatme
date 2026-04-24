import React, {useEffect, useState} from 'react';
import {SafeAreaView, Text, Button, View} from 'react-native';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {signInWithFacebook} from './src/auth/facebook';

GoogleSignin.configure({
  webClientId: '113481042376-4i07purf3j1ug3baublrac8bm881ine8.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => auth().onAuthStateChanged(setUser), []);

  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    await GoogleSignin.signIn();

    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;
    if (!idToken) throw new Error('No idToken returned from Google Sign-In');

    const credential = auth.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(credential);
  };

  const signInWithFacebookPress = async () => {
    const res = await signInWithFacebook();
    if (res.cancelled) return;
  };

  const signOut = async () => {
    await auth().signOut();
    try {
      await GoogleSignin.signOut();
    } catch {}
    // (valgfrit) LoginManager.logOut(); kan tilføjes senere
  };

  return (
    <SafeAreaView style={{flex: 1, padding: 16}}>
      <Text style={{fontSize: 18, marginBottom: 12}}>
        {user ? `Logget ind: ${user.email ?? user.uid}` : 'Ikke logget ind'}
      </Text>

      <View style={{gap: 10}}>
        <Button title="Sign in with Google" onPress={signInWithGoogle} />
        <Button title="Sign in with Facebook" onPress={signInWithFacebookPress} />
        <Button title="Sign out" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}