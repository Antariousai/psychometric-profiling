import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { T } from '../constants/tokens';

const ITEMS = [
  { id: 'dashboard', bn: 'হোম', en: 'Home', icon: '⌂', route: '/(tabs)/dashboard' },
  { id: 'history',   bn: 'ইতিহাস', en: 'History', icon: '◷', route: '/(tabs)/history' },
  { id: 'intake',    bn: 'নতুন', en: 'New', icon: '＋', primary: true, route: '/intake' },
  { id: 'analytics', bn: 'বিশ্লেষণ', en: 'Stats', icon: '◫', route: '/(tabs)/analytics' },
  { id: 'profile',   bn: 'প্রোফাইল', en: 'Profile', icon: null, route: '/(tabs)/profile' },
];

export default function BottomNav({ active }) {
  const router = useRouter();

  return (
    <View style={{
      backgroundColor: '#fff',
      borderTopWidth: 1, borderTopColor: T.border,
      paddingTop: 8, paddingHorizontal: 10, paddingBottom: 16,
      flexDirection: 'row', alignItems: 'flex-end', gap: 4,
    }}>
      {ITEMS.map(it => {
        const on = active === it.id;

        if (it.primary) {
          return (
            <Pressable
              key={it.id}
              onPress={() => router.push(it.route)}
              style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: T.teal,
                alignItems: 'center', justifyContent: 'center',
                marginTop: -18, marginHorizontal: 2,
                shadowColor: T.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6,
              }}>
              <Text style={{ fontSize: 26, color: '#fff', marginTop: -3 }}>{it.icon}</Text>
            </Pressable>
          );
        }

        if (it.id === 'profile') {
          return (
            <Pressable
              key={it.id}
              onPress={() => router.navigate(it.route)}
              style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 18, color: on ? T.teal2 : T.ink4 }}>◎</Text>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 10, color: on ? T.teal2 : T.ink3 }}>{it.bn}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={it.id}
            onPress={() => router.navigate(it.route)}
            style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 18, color: on ? T.teal2 : T.ink4 }}>{it.icon}</Text>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 10, color: on ? T.teal2 : T.ink3 }}>{it.bn}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
