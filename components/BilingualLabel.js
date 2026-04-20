import React from 'react';
import { View, Text } from 'react-native';
import { T } from '../constants/tokens';

export default function BilingualLabel({
  bn,
  en,
  sizeBn = 15,
  sizeEn = 11,
  color = T.ink,
  enColor = T.ink3,
  align = 'left',
  weight = '600',
  style,
}) {
  const bnFont = weight === '800' || weight === 800 ? T.fBnBlack
    : weight === '700' || weight === 700 ? T.fBnBold
    : T.fBn;
  return (
    <View style={[{ alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }, style]}>
      <Text style={{ fontFamily: bnFont, fontSize: sizeBn, color, lineHeight: sizeBn * 1.5, textAlign: align }}>
        {bn}
      </Text>
      {en ? (
        <Text style={{
          fontFamily: T.fBody, fontSize: sizeEn, color: enColor,
          letterSpacing: 0.2, marginTop: 3, lineHeight: sizeEn * 1.35, textAlign: align,
        }}>
          {en}
        </Text>
      ) : null}
    </View>
  );
}
