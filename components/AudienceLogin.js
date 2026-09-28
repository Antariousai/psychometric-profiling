import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { T } from '../constants/tokens';
import Field from './Field';
import PrimaryBtn from './PrimaryBtn';

export default function AudienceLogin({
  titleBn,
  titleEn,
  hint,
  busy,
  error,
  onSubmit,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontFamily: T.fBnBlack, fontSize: 22, color: T.navy }}>{titleBn}</Text>
      <Text style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginTop: 4, marginBottom: 8 }}>
        {titleEn}
      </Text>
      <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink2, lineHeight: 22, marginBottom: 18 }}>
        {hint}
      </Text>
      <Field
        label={{ bn: 'ইমেইল', en: 'Email' }}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="name@antarious.com"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label={{ bn: 'পাসওয়ার্ড', en: 'Password' }}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      {error ? (
        <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.coral, marginBottom: 12 }}>{error}</Text>
      ) : null}
      <PrimaryBtn
        label={{ bn: 'প্রবেশ', en: 'Sign in' }}
        disabled={busy || !email.trim() || !password}
        onPress={() => onSubmit(email, password)}
      />
    </View>
  );
}
