import React, {useMemo, useState} from 'react';
import {View, Button, Alert, ActivityIndicator, Text} from 'react-native';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
// Hvis I bruger Facebook:
// import {LoginManager} from 'react-native-fbsdk-next';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);

  const email = useMemo(() => auth().currentUser?.email ?? '(ingen email)', []);

  const signOut = async () => {
    try {
      setLoading(true);

      // Firebase sign out
      await auth().signOut();

      // Provider sign out (så Google ikke auto-vælger samme bruger næste gang)
      try {
        await GoogleSignin.signOut();
      } catch {}

      // Facebook (valgfrit)
      // try { LoginManager.logOut(); } catch {}
    } catch (e: any) {
      Alert.alert('Fejl', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{flex: 1, padding: 16, gap: 12}}>
      <Text style={{fontSize: 16, fontWeight: '600'}}>Konto</Text>
      <Text style={{color: '#444'}}>{email}</Text>

      {loading ? <ActivityIndicator /> : null}

      <Button title="Log ud" onPress={signOut} disabled={loading} />
    </View>
  );
}