import React from 'react';
import {ActivityIndicator, Pressable, Text, TextInput, View} from 'react-native';

export function ChatInputBar({
  styles,
  text,
  setText,
  inputRef,
  sending,
  onSendText,
  onTakePhoto,
  onPickFromGallery,
}: {
  styles: any;
  text: string;
  setText: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;
  sending: boolean;
  onSendText: () => void;
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
}) {
  return (
    <View style={styles.inputBar}>
      <Pressable onPress={onTakePhoto} style={styles.iconBtn} hitSlop={10}>
        <Text style={styles.iconBtnText}>📷</Text>
      </Pressable>

      <Pressable onPress={onPickFromGallery} style={styles.iconBtn} hitSlop={10}>
        <Text style={styles.iconBtnText}>🖼️</Text>
      </Pressable>

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
        onPress={onSendText}
        disabled={sending || text.trim().length === 0}
        style={({pressed}) => [
          styles.sendBtn,
          sending || text.trim().length === 0 ? styles.sendBtnDisabled : null,
          pressed ? {opacity: 0.85} : null,
        ]}>
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
      </Pressable>
    </View>
  );
}