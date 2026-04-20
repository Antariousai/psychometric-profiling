import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import FreyaOrb from './FreyaOrb';
import FreyaChat from './FreyaChat';

export default function FreyaButton({ screen = 'dashboard', bottom = 18, right = 16, onPress }) {
  const [open, setOpen] = useState(false);
  const handlePress = onPress || (() => setOpen(true));
  return (
    <>
      <Pressable
        onPress={handlePress}
        style={{ position: 'absolute', bottom, right, width: 52, height: 52, zIndex: 20 }}>
        <FreyaOrb size={52} pulse />
        <View style={{
          position: 'absolute', top: -2, right: -2,
          backgroundColor: '#E87461', width: 18, height: 18, borderRadius: 9,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
        }}>
          <Text style={{ color: '#fff', fontFamily: 'JetBrainsMono_700Bold', fontSize: 10, fontWeight: '700' }}>
            AI
          </Text>
        </View>
      </Pressable>
      <FreyaChat screen={screen} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
