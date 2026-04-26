import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ActivityIndicator, FlatList, Keyboard, Pressable, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {RootStackParamList} from '../navigation/AppNavigator';
import {listenToRooms, refreshRooms, type Room} from '../services/rooms';
import firestore, {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ChatRoomsScreen() {
  const navigation = useNavigation<Nav>();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Keyboard.dismiss();
    }, [])
  );

  useEffect(() => {
    const unsub = listenToRooms(
      next => {
        setRooms(next);
        setLoading(false);
      },
      message => {
        setLoading(false);
        Alert.alert('Fejl', typeof message === 'string' ? message : 'Ukendt fejl');
      }
    );

    return unsub;
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setRooms(await refreshRooms());
    } catch (e: any) {
      Alert.alert('Fejl', e?.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator />
        <Text style={{marginTop: 8}}>Indlæser rooms…</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: 16}}
        data={rooms}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => <View style={{height: 12}} />}
        renderItem={({item}) => (
          <Pressable
            onPress={() => navigation.navigate('ChatRoom', {roomId: item.id, title: item.name})}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '600'}}>{item.name}</Text>
              <Text style={{color: '#555', marginTop: 2}} numberOfLines={1}>
                {item.description}
              </Text>
            </View>

            <Text style={{fontSize: 22, color: '#999'}}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={{color: '#666'}}>
            Ingen rooms fundet. Opret nogle i Firestore collection &quot;rooms&quot;.
          </Text>
        }
      />
    </View>
  );
}