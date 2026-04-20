import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { T } from '../constants/tokens';

export default function PrimaryBtn({ label, onPress, disabled, small, icon, variant = 'teal' }) {
  const bg = disabled ? T.border
    : variant === 'navy' ? T.navy
    : variant === 'gold' ? T.gold
    : T.teal;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        width: '100%',
        paddingVertical: small ? 12 : 15,
        paddingHorizontal: small ? 12 : 15,
        borderRadius: 14,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: bg,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: disabled ? 0 : 0.32,
        shadowRadius: 14,
        elevation: disabled ? 0 : 4,
        opacity: disabled ? 0.65 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      })}
    >
      <Text style={{ fontFamily: T.fBnBold, fontSize: small ? 14 : 16, color: '#fff' }}>
        {label.bn}
      </Text>
      {label.en ? (
        <Text style={{
          fontFamily: T.fBody, fontSize: small ? 10 : 11,
          color: 'rgba(255,255,255,0.78)', letterSpacing: 0.3,
        }}>/ {label.en}</Text>
      ) : null}
      {icon ? (
        <Text style={{ fontSize: 14, color: '#fff', marginLeft: 4 }}>{icon}</Text>
      ) : null}
    </Pressable>
  );
}
