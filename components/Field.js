import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { T } from '../constants/tokens';
import BilingualLabel from './BilingualLabel';

export default function Field({
  label,
  value,
  onChangeText,
  prefix,
  secureTextEntry,
  keyboardType,
  placeholder,
  maxLength,
  editable = true,
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <BilingualLabel
        bn={label.bn}
        en={label.en}
        sizeBn={13}
        sizeEn={10}
        weight="600"
        style={{ marginBottom: 7 }}
      />
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: T.border,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
      }}>
        {prefix ? (
          <Text style={{
            paddingLeft: 12,
            paddingVertical: 12,
            fontFamily: T.fMonoBold,
            fontSize: 12,
            color: T.ink3,
          }}>{prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={T.ink4}
          maxLength={maxLength}
          editable={editable}
          style={{
            flex: 1,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontFamily: T.fBn,
            fontSize: 14,
            color: T.ink,
          }}
        />
      </View>
    </View>
  );
}
