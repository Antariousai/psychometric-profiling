import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { T } from '../constants/tokens';
import BilingualLabel from './BilingualLabel';

export default function BrandHeader({ title, subtitle, onBack, right, accent = T.teal, dark = false, onLongPress }) {
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={700}
      style={{
        paddingTop: 14, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: dark ? 'rgba(255,255,255,0.08)' : T.border,
        backgroundColor: dark ? T.navy : '#fff',
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: dark ? 'rgba(255,255,255,0.08)' : T.cream2,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 22, color: dark ? '#fff' : T.ink, marginTop: -3 }}>‹</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <BilingualLabel
          bn={title.bn}
          en={title.en}
          sizeBn={17}
          sizeEn={10}
          weight="700"
          color={dark ? '#fff' : T.navy}
          enColor={dark ? 'rgba(255,255,255,0.45)' : T.ink3}
        />
        {subtitle ? (
          <Text style={{
            fontFamily: T.fMonoBold, fontSize: 9, color: accent,
            letterSpacing: 1.5, marginTop: 3,
          }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}
