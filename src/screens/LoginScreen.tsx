import React, {useState} from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {signInWithGoogle} from '../auth/google';
import {signInWithFacebook} from '../auth/facebook';

export default function LoginScreen() {
  const [loading, setLoading] = useState<null | 'google' | 'facebook'>(null);

  const run = async (provider: 'google' | 'facebook', fn: () => Promise<void>) => {
    try {
      setLoading(provider);
      await fn();
    } catch (e: any) {
      Alert.alert('Login fejl', e?.message ?? String(e));
    } finally {
      setLoading(null);
    }
  };

  const disabled = loading !== null;


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top / logo */}
        <View style={styles.hero}>
          <Image
            source={require('../assets/chatme-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Velkoommen til Chatme Log ind for at fortsætte</Text>
        </View>

        {/* Bottom buttons */}
        <View style={styles.bottom}>
          <Pressable
            disabled={disabled}
            onPress={() => run('google', signInWithGoogle)}
            style={({pressed}) => [
              styles.btn,
              styles.googleBtn,
              (pressed && !disabled) ? styles.pressed : null,
              disabled ? styles.disabled : null,
            ]}>
            <View style={styles.btnRow}>
              <View style={[styles.iconCircle, {backgroundColor: '#fff'}]}>
                <Text style={[styles.iconText, {color: '#111'}]}>G</Text>
              </View>
              <Text style={styles.googleText}>Fortsæt med Google</Text>
              {loading === 'google' ? <ActivityIndicator /> : <View style={{width: 20}} />}
            </View>
          </Pressable>

          <Pressable
            disabled={disabled}
            onPress={() => run('facebook', signInWithFacebook)}
            style={({pressed}) => [
              styles.btn,
              styles.facebookBtn,
              (pressed && !disabled) ? styles.pressed : null,
              disabled ? styles.disabled : null,
            ]}>
            <View style={styles.btnRow}>
              <View style={[styles.iconCircle, {backgroundColor: '#1877F2'}]}>
                <Text style={[styles.iconText, {color: '#fff'}]}>f</Text>
              </View>
              <Text style={styles.facebookText}>Fortsæt med Facebook</Text>
              {loading === 'facebook' ? <ActivityIndicator color="#fff" /> : <View style={{width: 20}} />}
            </View>
          </Pressable>

          <Text style={styles.terms}>
            Ved at fortsætte accepterer du vores betingelser og privatlivspolitik.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  container: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'space-between', // <- vigtig
  },

  hero: {
    alignItems: 'center',
    paddingTop: 24,
    flexGrow: 1,              // <- i stedet for flex:1 der kan overlappe
    justifyContent: 'center',
    gap: 12,
  },

  bottom: {
    paddingBottom: 18,
    gap: 12,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  pressed: {transform: [{scale: 0.99}]},
  disabled: {opacity: 0.6},

  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {fontWeight: '800', fontSize: 14},

  googleBtn: {backgroundColor: '#F2F2F2'},
  googleText: {flex: 1, color: '#111', fontSize: 15, fontWeight: '600'},

  facebookBtn: {backgroundColor: '#1877F2'},
  facebookText: {flex: 1, color: '#fff', fontSize: 15, fontWeight: '600'},

  terms: {marginTop: 4, color: '#888', fontSize: 12, textAlign: 'center'},
});