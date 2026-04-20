import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { T } from '../constants/tokens';
import { PERSONAS } from '../data/personas';
import Chip from './Chip';
import { bn as toBn } from '../utils/format';
import { fmtTk } from '../utils/format';

export default function ApplicantRow({ row, onPress }) {
  const p = PERSONAS[row.id];
  if (!p) return null;
  const color = row.status === 'completed'
    ? (row.rating === 'A' ? T.green : row.rating === 'B' ? T.teal : row.rating === 'C' ? T.amber : T.coral)
    : T.gold;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: T.border, borderRadius: 14,
        paddingVertical: 13, paddingHorizontal: 14,
        marginBottom: 10,
        flexDirection: 'row', alignItems: 'center', gap: 13,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        transform: [{ translateY: pressed ? -1 : 0 }],
      })}>
      <View style={{
        width: 44, height: 44, borderRadius: 12, backgroundColor: p.tint,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff' }}>{p.avatar}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: T.ink }}>{p.name}</Text>
          {row.status === 'completed' ? <Chip color={color} size={8.5}>{row.rating}</Chip> : null}
          {row.status === 'in-progress' ? <Chip color={T.gold} size={8.5}>চলমান</Chip> : null}
        </View>
        <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.ink3, marginBottom: 3 }}>
          {p.village} · {fmtTk(p.loanAsk)}
        </Text>
        <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, letterSpacing: 0.3 }}>{row.whenEn}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {row.status === 'completed' ? (
          <>
            <Text style={{ fontFamily: T.fHead, fontSize: 22, color, lineHeight: 22 }}>{toBn(row.score)}</Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, marginTop: 2 }}>/ 1000</Text>
            {row.flags > 0 ? <Chip color={T.coral} size={8} style={{ marginTop: 5 }}>⚑ {toBn(row.flags)}</Chip> : null}
          </>
        ) : (
          <>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 12, color: T.gold }}>
              {toBn(row.step)}/{toBn(row.total)}
            </Text>
            <View style={{ width: 50, height: 4, backgroundColor: T.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <View style={{ width: `${(row.step / row.total) * 100}%`, height: '100%', backgroundColor: T.gold }} />
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}
