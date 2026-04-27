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

import auth from '@react-native-firebase/auth';
import {getFirestore} from '@react-native-firebase/firestore';
import type {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query as fsQuery,
  startAfter,
  writeBatch,
  Timestamp,
} from '@react-native-firebase/firestore';

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

  const PAGE_SIZE = 50;
  const MORE_SIZE = 50;

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [messagesDesc, setMessagesDesc] = useState<Message[]>([]); // <-- DESC: nyeste først
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // cursor til pagination (sidste doc i DESC query = ældst i de hentede)
  const oldestDescDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const db = useMemo(() => getFirestore(), []);

  const messagesQuery = useMemo(() => {
    const messagesCol = collection(db, 'rooms', roomId, 'messages');
    return fsQuery(messagesCol, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
  }, [db, roomId, PAGE_SIZE]);

  useEffect(() => {
    const unsub = onSnapshot(
      messagesQuery,
      snap => {
        const newestDesc: Message[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Message, 'id'>),
        }));

        oldestDescDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
        setHasMore(snap.docs.length === PAGE_SIZE);

        // Merge: behold allerede-paginerede ældre beskeder, men erstat/opdatér de nyeste
        setMessagesDesc(prev => {
          const newestIds = new Set(newestDesc.map(m => m.id));
          const olderOnly = prev.filter(m => !newestIds.has(m.id));
          return [...newestDesc, ...olderOnly];
        });

        setLoading(false);
      },
      err => {
        console.warn('messages onSnapshot error', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [messagesQuery, PAGE_SIZE]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        inputRef.current?.blur();
        Keyboard.dismiss();
      };
    }, [])
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      inputRef.current?.blur();
      Keyboard.dismiss();
    });
    return unsub;
  }, [navigation]);

  const loadMoreOlder = async () => {
    if (loadingMore || !hasMore) return;

    const cursor = oldestDescDocRef.current;
    if (!cursor) return;

    try {
      setLoadingMore(true);

      const messagesCol = collection(db, 'rooms', roomId, 'messages');
      const qMore = fsQuery(
        messagesCol,
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(MORE_SIZE)
      );

      const snap = await getDocs(qMore);

      if (snap.docs.length) {
        oldestDescDocRef.current = snap.docs[snap.docs.length - 1];
      }
      if (snap.docs.length < MORE_SIZE) {
        setHasMore(false);
      }

      const olderDesc: Message[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));

      // Append i bunden (array er DESC)
      setMessagesDesc(prev => {
        const prevIds = new Set(prev.map(m => m.id));
        const dedupOlder = olderDesc.filter(m => !prevIds.has(m.id));
        return [...prev, ...dedupOlder];
      });
    } catch (e) {
      console.warn('loadMoreOlder error', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const user = auth().currentUser;
    if (!user) return;

    inputRef.current?.blur();
    Keyboard.dismiss();

    const now = Timestamp.now();
    setText('');

    try {
      setSending(true);

      const roomRef = doc(db, 'rooms', roomId);
      const msgRef = doc(collection(db, 'rooms', roomId, 'messages'));

      const batch = writeBatch(db);

      batch.set(msgRef, {
        text: trimmed,
        createdAt: now,
        uid: user.uid,
        displayName: user.displayName ?? user.email ?? 'Unknown',
        photoURL: user.photoURL ?? null,
      });

      batch.set(
        roomRef,
        {lastMessageAt: now, lastMessageText: trimmed},
        {merge: true}
      );

      await batch.commit();

      // scroll til “bund” (som er top i inverted)
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({offset: 0, animated: true});
      });
    } catch (e) {
      console.warn('sendMessage error', e);
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
            inverted
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            data={messagesDesc}
            keyExtractor={item => item.id}
            onEndReached={() => loadMoreOlder()}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingMore ? (
                <View style={{paddingVertical: 10}}>
                  <ActivityIndicator />
                </View>
              ) : hasMore ? (
                <Pressable onPress={loadMoreOlder} style={{paddingVertical: 10}}>
                  <Text style={{textAlign: 'center', color: '#1877F2', fontWeight: '600'}}>
                    Indlæs flere…
                  </Text>
                </Pressable>
              ) : (
                <Text style={{textAlign: 'center', color: '#888', paddingVertical: 10}}>
                  Ingen flere beskeder
                </Text>
              )
            }
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