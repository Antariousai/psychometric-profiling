import React from 'react';
import { Image } from 'react-native';

const WHITE = require('../assets/images/antarious-white.png');
const DARK = require('../assets/images/antarious-dark.png');

export default function AntariousLogo({ variant = 'dark', height = 22, style }) {
  return (
    <Image
      source={variant === 'white' ? WHITE : DARK}
      style={[{ height, width: height * 4.2, resizeMode: 'contain' }, style]}
    />
  );
}
