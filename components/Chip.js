import React from 'react';
import { View, Text } from 'react-native';
import { T } from '../constants/tokens';

function rgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function Chip({ children, color = T.teal, bg, size = 10, style }) {
  return (
    <View style={[{
      paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20,
      backgroundColor: bg || rgba(color, 0.1),
      alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center',
    }, style]}>
      <Text style={{
        fontFamily: T.fMonoBold, fontSize: size, color, letterSpacing: 0.5,
      }}>
        {children}
      </Text>
    </View>
  );
}

export { rgba };
