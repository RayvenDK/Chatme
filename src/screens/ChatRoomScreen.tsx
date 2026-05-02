import React, {useEffect, useRef, useState} from 'react';
import auth from '@react-native-firebase/auth';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  Image,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';


import type {RootStackParamList} from '../navigation/AppNavigator';
import {sendImageToRoom} from '../services/images';
import {getRoomMember, setRoomNotificationPreference} from '../services/roomMembers';
import {getCurrentUserOrThrow, type Message, sendMessageToRoom} from '../services/messages';

import {useRoomTitle} from './chatRoom/useRoomTitle';
import {useRoomMessages} from './chatRoom/useRoomMessages';
import {MessageBubble} from './chatRoom/MessageBubble';
import {ChatInputBar} from './chatRoom/ChatInputBar';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

const Wrapper: React.FC<React.PropsWithChildren> = ({children}) => {
  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // Justér hvis nødvendigt (typisk 0-80)
      // Samsung/Android 15/16 needs larger offset so input stays visible above keyboard
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 105}>
      {children}
    </KeyboardAvoidingView>
  );
};

export default function ChatRoomScreen({route, navigation}: Props) {
  const {roomId} = route.params;

  useRoomTitle(roomId, navigation);

  const {loading, messagesDesc, loadingMore, hasMore, loadMoreOlder} = useRoomMessages(roomId);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Message>>(null);

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

  const maybePromptRoomNotifications = async (uid: string) => {
    try {
      const member = await getRoomMember(roomId, uid);
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
      console.warn('maybePromptRoomNotifications error', e);
    }
  };

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({offset: 0, animated: true});
    });
  };

  const pickFromGallery = async () => {
    try {
      const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1});
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      const user = getCurrentUserOrThrow();
      await maybePromptRoomNotifications(user.uid);
      await sendImageToRoom(roomId, uri, user);
      scrollToTop();
    } catch (e) {
      console.warn('pickFromGallery error', e);
    }
  };

  const takePhoto = async () => {
    try {
      const res = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        saveToPhotos: true,
      });
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      const user = getCurrentUserOrThrow();
      await maybePromptRoomNotifications(user.uid);
      await sendImageToRoom(roomId, uri, user);
      scrollToTop();
    } catch (e) {
      console.warn('takePhoto error', e);
    }
  };

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    inputRef.current?.blur();
    Keyboard.dismiss();
    setText('');

    try {
      setSending(true);
      const user = getCurrentUserOrThrow();
      await maybePromptRoomNotifications(user.uid);
      await sendMessageToRoom(roomId, trimmed, user);
      scrollToTop();
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
            renderItem={({item}) => {
              const myUid = auth().currentUser?.uid;
              const isMine = !!myUid && item.uid === myUid;
              return <MessageBubble item={item} isMine={isMine} styles={styles} onOpenImage={setViewerUrl}/>;
            }}
            ItemSeparatorComponent={() => <View style={{height: 10}} />}
            ListEmptyComponent={
              <Text style={{color: '#666', paddingTop: 16}}>Ingen beskeder endnu.</Text>
            }
          />
        )}

        <ChatInputBar
          styles={styles}
          text={text}
          setText={setText}
          inputRef={inputRef}
          sending={sending}
          onSendText={sendText}
          onTakePhoto={takePhoto}
          onPickFromGallery={pickFromGallery}
        />
      <Modal
          visible={!!viewerUrl}
            transparent
            animationType="fade"
            onRequestClose={() => setViewerUrl(null)}>
        <Pressable
          style={styles.viewerBackdrop}
          onPress={() => setViewerUrl(null)}>
          {viewerUrl ? (
          <Image source={{uri: viewerUrl}} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
      </Wrapper>
    </SafeAreaView>

  );
}


const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  listContent: {padding: 16, paddingBottom: 10},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  avatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee'},
  avatarFallback: {alignItems: 'center', justifyContent: 'center'},
  avatarInitials: {fontWeight: '700', color: '#333'},

  metaRow: {flexDirection: 'row', alignItems: 'baseline', gap: 8},

  chatMessageRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 10},
  chatRowMine: {justifyContent: 'flex-end'},
  chatRowTheirs: {justifyContent: 'flex-start'},

  chatBubble: {
    flexShrink: 1,
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chatBubbleMine: {backgroundColor: '#1877F2'},
  chatBubbleTheirs: {backgroundColor: '#f2f2f2'},

  chatName: {flex: 1, fontWeight: '700', color: '#111'},
  chatTime: {color: '#888', fontSize: 12},
  chatMessageText: {marginTop: 6, color: '#111'},

  chatImage: {
    marginTop: 8,
    width: 240,
    height: 240,
    borderRadius: 12,
    backgroundColor: '#ddd',
  },

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
    color: '#f5f5f5',
    backgroundColor: '#d3cfcf',
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

  iconBtn: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  iconBtnText: {fontSize: 18},

  viewerBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.9)',
  justifyContent: 'center',
  alignItems: 'center',
},
viewerImage: {
  width: '100%',
  height: '80%',
},
});