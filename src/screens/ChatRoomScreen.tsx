import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

import type {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

type Message = {
  id: string;
  text: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp;
  uid?: string;
  displayName?: string;
  photoURL?: string | null;
};

function formatTime(ts?: FirebaseFirestoreTypes.Timestamp) {
  if (!ts || typeof (ts as any).toDate !== 'function') return '--:--';
  const d = ts.toDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (a + b).toUpperCase();
}

const Wrapper: React.FC<React.PropsWithChildren> = ({children}) => {
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={{flex: 1}} behavior="padding" keyboardVerticalOffset={80}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={{flex: 1}}>{children}</View>;
};

export default function ChatRoomScreen({route, navigation}: Props) {
  const {roomId} = route.params;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const query = useMemo(() => {
    return firestore()
      .collection('rooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(50);
  }, [roomId]);

  // Realtime messages
  useEffect(() => {
    const unsub = query.onSnapshot(
      snap => {
        const nextDesc: Message[] = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, 'id'>),
        }));

        // UI: ældste -> nyeste
        setMessages(nextDesc.slice().reverse());
        setLoading(false);
      },
      err => {
        console.warn('messages onSnapshot error', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [query]);

  // Cleanup når screen mister fokus / unmount
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        inputRef.current?.blur();
        Keyboard.dismiss();
      };
    }, [])
  );

  // Cleanup præcis når man trykker tilbage (vigtig på Android)
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      inputRef.current?.blur();
      Keyboard.dismiss();
    });
    return unsub;
  }, [navigation]);

  const sendMessage = async () => {
  const trimmed = text.trim();
  if (!trimmed || sending) return;

  const user = auth().currentUser;
  if (!user) return;

  // Luk fokus/keyboard med det samme
  inputRef.current?.blur();
  Keyboard.dismiss();

  // Tag en client-timestamp nu (så UI ikke venter på serverTimestamp)
  const now = firestore.Timestamp.now();

  // Ryd input med det samme (UI føles mere stabilt)
  setText('');

  try {
    setSending(true);

    const roomRef = firestore().collection('rooms').doc(roomId);
    const msgRef = roomRef.collection('messages').doc(); // pre-generate id

    const batch = firestore().batch();

    batch.set(msgRef, {
      text: trimmed,
      createdAt: now, // client time (stabilt)
      uid: user.uid,
      displayName: user.displayName ?? user.email ?? 'Unknown',
      photoURL: user.photoURL ?? null,
    });

    batch.set(
      roomRef,
      {
        lastMessageAt: now,
        lastMessageText: trimmed,
      },
      {merge: true}
    );

    await batch.commit();
  } catch (e) {
    console.warn('sendMessage error', e);
    // Hvis du vil: gendan teksten ved fejl
    setText(trimmed);
  } finally {
    setSending(false);
  }
};

  return (
    <SafeAreaView style={styles.safe}>
      <Wrapper>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={{marginTop: 8, color: '#666'}}>Indlæser beskeder…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <View style={styles.row}>
                {item.photoURL ? (
                  <Image source={{uri: item.photoURL}} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitials}>{initials(item.displayName)}</Text>
                  </View>
                )}

                <View style={{flex: 1}}>
                  <View style={styles.metaRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.displayName ?? 'Unknown'}
                    </Text>
                    <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                  </View>

                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{height: 10}} />}
            ListEmptyComponent={
              <Text style={{color: '#666', paddingTop: 16}}>Ingen beskeder endnu.</Text>
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Skriv en besked…"
            style={styles.input}
            multiline={false}
            editable={!sending}
            blurOnSubmit
          />

          <Pressable
            onPress={sendMessage}
            disabled={sending || text.trim().length === 0}
            style={({pressed}) => [
              styles.sendBtn,
              sending || text.trim().length === 0 ? styles.sendBtnDisabled : null,
              pressed ? {opacity: 0.85} : null,
            ]}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
          </Pressable>
        </View>
      </Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  listContent: {padding: 16, paddingBottom: 10},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  row: {flexDirection: 'row', gap: 12},
  avatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee'},
  avatarFallback: {alignItems: 'center', justifyContent: 'center'},
  avatarInitials: {fontWeight: '700', color: '#333'},

  metaRow: {flexDirection: 'row', alignItems: 'baseline', gap: 8},
  name: {flex: 1, fontWeight: '700', color: '#111'},
  time: {color: '#888', fontSize: 12},
  messageText: {marginTop: 2, color: '#222'},

  inputBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  sendBtn: {
    height: 40,
    minWidth: 70,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {opacity: 0.5},
  sendText: {color: '#fff', fontWeight: '700'},
});