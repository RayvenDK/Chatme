import React, {useState} from 'react';
import {View, Button, Alert, ActivityIndicator} from 'react-native';
import {signInWithGoogle} from "../auth/google";
import {signInWithFacebook} from '../auth/facebook';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<any>) => {
    try {
      setLoading(true);
      await fn();
    } catch (e: any) {
      Alert.alert('Login fejl', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', padding: 16, gap: 12}}>
      {loading ? <ActivityIndicator /> : null}
      <Button title="Sign in with Google" onPress={() => run(signInWithGoogle)} />
      <Button title="Sign in with Facebook" onPress={() => run(signInWithFacebook)} />
    </View>
  );
}