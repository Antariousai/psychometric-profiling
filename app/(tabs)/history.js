import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../../constants/tokens';
import { PERSONAS } from '../../data/personas';
import { useApp } from '../../context/AppContext';
import BrandHeader from '../../components/BrandHeader';
import Chip from '../../components/Chip';
import FreyaButton from '../../components/FreyaButton';
import { bn as toBn } from '../../utils/format';

const RECORDS = [
  { id: 'nasrin', score: 742, rating: 'B', flags: 1, dateEn: '25 Apr 2026', outcome: 'approved' },
  { id: 'shima',  score: 821, rating: 'A', flags: 0, dateEn: '24 Apr 2026', outcome: 'approved' },
  { id: 'rafiq',  score: 487, rating: 'D', flags: 3, dateEn: '22 Apr 2026', outcome: 'declined' },
  { id: 'nasrin', score: 710, rating: 'B', flags: 0, dateEn: '18 Apr 2026', outcome: 'approved' },
  { id: 'shima',  score: 625, rating: 'C', flags: 2, dateEn: '15 Apr 2026', outcome: 'review' },
];

const FILTERS = [
  { id: 'all', bn: 'সব', n: 5 },
  { id: 'approved', bn: 'অনুমোদিত', n: 3 },
  { id: 'review', bn: 'পুনর্বিবেচনা', n: 1 },
  { id: 'declined', bn: 'প্রত্যাখ্যাত', n: 1 },
];

function colorForRating(r) {
  return r === 'A' ? T.green : r === 'B' ? T.teal : r === 'C' ? T.amber : T.coral;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { setApplicant } = useApp();
  const [filter, setFilter] = useState('all');

  const open = (r) => {
    setApplicant(r.id);
    router.push('/result');
  };

  const visible = RECORDS.filter(r => filter === 'all' || r.outcome === filter);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'আবেদন ইতিহাস', en: 'Assessment History' }}
        onBack={() => router.back()}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 6 }}>
        {FILTERS.map(f => {
          const on = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20,
                backgroundColor: on ? T.navy : '#fff',
                borderWidth: on ? 0 : 1, borderColor: T.border,
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}>
              <Text style={{
                fontFamily: T.fBnBold, fontSize: 11,
                color: on ? '#fff' : T.ink2,
              }}>{f.bn}</Text>
              <Text style={{
                fontFamily: T.fMono, fontSize: 9,
                color: on ? 'rgba(255,255,255,0.6)' : T.ink4,
              }}>{toBn(f.n)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}>
        {visible.map((r, i) => {
          const p = PERSONAS[r.id];
          const color = colorForRating(r.rating);
          return (
            <Pressable
              key={i}
              onPress={() => open(r)}
              style={{
                backgroundColor: '#fff',
                borderWidth: 1, borderColor: T.border, borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row', alignItems: 'center', gap: 13,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
              }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12, backgroundColor: p.tint,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff' }}>{p.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink, marginBottom: 3 }}>{p.name}</Text>
                <Text style={{ fontFamily: T.fMono, fontSize: 9.5, color: T.ink4, letterSpacing: 0.3, marginBottom: 4 }}>
                  {r.dateEn}
                </Text>
                <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                  {r.outcome === 'approved' ? <Chip color={T.green} size={8.5}>✓ অনুমোদিত</Chip> : null}
                  {r.outcome === 'declined' ? <Chip color={T.coral} size={8.5}>✗ প্রত্যাখ্যাত</Chip> : null}
                  {r.outcome === 'review' ? <Chip color={T.amber} size={8.5}>⋯ পুনর্বিবেচনা</Chip> : null}
                  {r.flags > 0 ? <Chip color={T.coral} size={8.5}>⚑{toBn(r.flags)}</Chip> : null}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 22, color, lineHeight: 22 }}>{toBn(r.score)}</Text>
                <Chip color={color} size={8} style={{ marginTop: 4 }}>{r.rating}</Chip>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <FreyaButton screen="history" bottom={90} />
    </View>
  );
}
