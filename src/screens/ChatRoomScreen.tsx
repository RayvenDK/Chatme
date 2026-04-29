import React, {useEffect, useRef, useState} from 'react';
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
  Alert,
  View,
} from 'react-native';
import {getRoom} from "../services/rooms";
import {getRoomMember, setRoomNotificationPreference} from '../services/roomMembers';
import {formatTime} from '../utils/format';
import {initials} from '../utils/user';
import type {RootStackParamList} from '../navigation/AppNavigator';

import {
  getCurrentUserOrThrow,
  loadOlderMessages,
  type Message,
  type MessagesCursor,
  sendMessageToRoom,
  subscribeToLatestMessages,
} from '../services/messages';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;



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

useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const room = await getRoom(roomId);
      const name = (room as any)?.name;
      if (!alive) return;

      if (typeof name === "string" && name.trim().length > 0) {
        navigation.setOptions({title: name});
      } else {
        navigation.setOptions({title: "Chat room"});
      }
    } catch (e) {
      if (!alive) return;
      navigation.setOptions({title: "Chat room"});
    }
  })();

  return () => {
    alive = false;
  };
}, [roomId, navigation]);

  const PAGE_SIZE = 50;
  const MORE_SIZE = 50;

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [messagesDesc, setMessagesDesc] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const cursorRef = useRef<MessagesCursor>(null);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const unsub = subscribeToLatestMessages(
      roomId,
      PAGE_SIZE,
      ({newestDesc, cursor, hasMore}) => {
        cursorRef.current = cursor;
        setHasMore(hasMore);

        // merge newest into existing (keep older loaded)
        setMessagesDesc(prev => {
          const newestIds = new Set(newestDesc.map(m => m.id));
          const olderOnly = prev.filter(m => !newestIds.has(m.id));
          return [...newestDesc, ...olderOnly];
        });

        setLoading(false);
      },
      err => {
        console.warn('messages subscribe error', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [roomId]);

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

    const cursor = cursorRef.current;
    if (!cursor) return;

    try {
      setLoadingMore(true);

      const {olderDesc, nextCursor, hasMore: more} = await loadOlderMessages(
        roomId,
        cursor,
        MORE_SIZE
      );

      cursorRef.current = nextCursor;
      setHasMore(more);

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

  const maybePromptRoomNotifications = async (uid: string) => {
  try {
    const member = await getRoomMember(roomId, uid);

    // Hvis vi allerede har spurgt før, så gør ingenting
    if (member?.promptedForNotificationsAt) return;

    return new Promise<void>(resolve => {
      Alert.alert(
        'Notifikationer',
        'Vil du have push-notifikationer fra dette chatrum?',
        [
          {
            text: 'Nej tak',
            style: 'cancel',
            onPress: async () => {
              await setRoomNotificationPreference(roomId, uid, false);
              resolve();
            },
          },
          {
            text: 'Ja',
            onPress: async () => {
              await setRoomNotificationPreference(roomId, uid, true);
              resolve();
            },
          },
        ],
        {cancelable: false}
      );
    });
  } catch (e) {
    // Hvis noget går galt, skal det ikke blokere for at sende beskeden
    console.warn('maybePromptRoomNotifications error', e);
  }
};

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    inputRef.current?.blur();
    Keyboard.dismiss();

    setText('');

    try {
      setSending(true);


      const user = getCurrentUserOrThrow();
      // prompt (kun første gang)
      await maybePromptRoomNotifications(user.uid);
      await sendMessageToRoom(roomId, trimmed, user);


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
            onEndReached={loadMoreOlder}
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