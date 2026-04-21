import React from 'react';
import { View } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import BottomNav from '../../components/BottomNav';

const ROUTE_TO_ACTIVE = {
  '/(tabs)/dashboard': 'dashboard',
  '/dashboard': 'dashboard',
  '/(tabs)/history': 'history',
  '/history': 'history',
  '/(tabs)/analytics': 'analytics',
  '/analytics': 'analytics',
  '/(tabs)/profile': 'profile',
  '/profile': 'profile',
};

export default function TabsLayout() {
  const pathname = usePathname();
  const active = ROUTE_TO_ACTIVE[pathname] || 'dashboard';
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <BottomNav active={active} />
    </View>
  );
}
