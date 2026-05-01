import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import type {Message} from '../../services/messages';
import {formatTime} from '../../utils/format';
import {initials} from '../../utils/user';

export function MessageBubble({
  item,
  isMine,
  styles,
  onOpenImage,
}: {
  item: Message;
  isMine: boolean;
  styles: any;
  onOpenImage?: (url: string) => void;
}) {
  const open = () => {
    if (item.type === 'image' && item.imageUrl) onOpenImage?.(item.imageUrl);
  };

  return (
    <View style={[styles.chatMessageRow, isMine ? styles.chatRowMine : styles.chatRowTheirs]}>
      {!isMine ? (
        item.photoURL ? (
          <Image source={{uri: item.photoURL}} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials(item.displayName)}</Text>
          </View>
        )
      ) : (
        <View style={{width: 40}} />
      )}

      <View style={[styles.chatBubble, isMine ? styles.chatBubbleMine : styles.chatBubbleTheirs]}>
        <View style={styles.metaRow}>
          {!isMine ? (
            <Text style={styles.chatName} numberOfLines={1}>
              {item.displayName ?? 'Unknown'}
            </Text>
          ) : (
            <View style={{flex: 1}} />
          )}
          <Text style={styles.chatTime}>{formatTime(item.createdAt)}</Text>
        </View>

        {item.type === 'image' && item.imageUrl ? (
          <Pressable onPress={open}>
            <Image source={{uri: item.imageUrl}} style={styles.chatImage} />
          </Pressable>
        ) : (
          <Text style={[styles.chatMessageText, isMine ? {color: '#fff'} : null]}>{item.text}</Text>
        )}
      </View>
    </View>
  );
}