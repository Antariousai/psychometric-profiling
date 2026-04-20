import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import { PERSONAS } from '../data/personas';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';
import BilingualLabel from '../components/BilingualLabel';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';
import { bn as toBn } from '../utils/format';

const DATA_SOURCES = [
  { icon: '◈', bn: 'মনস্তাত্ত্বিক স্কোর', en: 'Psychometric', weight: 35, score: 742, color: T.teal },
  { icon: '◉', bn: 'মোবাইল মানি', en: 'Mobile Money (bKash)', weight: 25, score: 680, color: T.gold },
  { icon: '◧', bn: 'ইউটিলিটি পেমেন্ট', en: 'Utility Payments', weight: 20, score: 720, color: T.violet },
  { icon: '◬', bn: 'PO ইতিহাস', en: 'PO Repayment History', weight: 15, score: 800, color: T.green },
  { icon: '◫', bn: 'সামাজিক নেটওয়ার্ক', en: 'Social Network Score', weight: 5, score: 650, color: T.amber },
];

const TIMELINE = [
  { month: 'জান', amount: 1200, onTime: true },
  { month: 'ফেব', amount: 1200, onTime: true },
  { month: 'মার', amount: 1200, onTime: true },
  { month: 'এপ্র', amount: 1200, onTime: false },
  { month: 'মে', amount: 1200, onTime: true },
  { month: 'জুন', amount: 1200, onTime: true },
];

export default function CreditScreen() {
  const router = useRouter();
  const { applicantId } = useApp();
  const persona = PERSONAS[applicantId || 'nasrin'];
  const [activeSource, setActiveSource] = useState(null);

  const hybridScore = Math.round(
    DATA_SOURCES.reduce((sum, s) => sum + (s.score * s.weight) / 100, 0)
  );
  const hybridPct = Math.round((hybridScore / 1000) * 100);
  const rating = hybridScore >= 780 ? 'A' : hybridScore >= 650 ? 'B' : hybridScore >= 500 ? 'C' : 'D';
  const ratingColor = rating === 'A' ? T.green : rating === 'B' ? T.teal : rating === 'C' ? T.amber : T.coral;

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'রিয়েল-টাইম ক্রেডিট স্কোর', en: 'Real-Time Credit Scoring' }}
        onBack={() => router.back()}
        right={<Chip color={T.gold}>AI</Chip>}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

        {/* Score hero */}
        <LinearGradient
          colors={[T.navy, '#0A1525']}
          style={{ borderRadius: 20, padding: 20, marginBottom: 14, alignItems: 'center' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, alignSelf: 'flex-start',
          }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: persona.tint + '33',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff' }}>{persona.avatar}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: '#fff' }}>{persona.name}</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
                হাইব্রিড ক্রেডিট প্রোফাইল
              </Text>
            </View>
          </View>

          <View style={{
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 8, borderColor: ratingColor,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ fontFamily: T.fHead, fontSize: 38, color: ratingColor, lineHeight: 40 }}>
              {toBn(hybridScore)}
            </Text>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>/ ১০০০</Text>
            <View style={{
              marginTop: 6, backgroundColor: ratingColor + '33',
              paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
            }}>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 12, color: ratingColor }}>
                {rating} RATING
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            {[
              { bn: 'হাইব্রিড স্কোর', val: toBn(hybridScore) },
              { bn: 'সম্ভাব্যতা', val: `${toBn(hybridPct)}%` },
              { bn: 'ডেটা সোর্স', val: toBn(DATA_SOURCES.length) },
            ].map((s, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: 10, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 18, color: '#fff' }}>{s.val}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' }}>{s.bn}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Data sources breakdown */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="ডেটা উৎস বিশ্লেষণ" en="Data source breakdown" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 14 }} />
          {DATA_SOURCES.map((src, i) => (
            <Pressable key={i} onPress={() => setActiveSource(activeSource === i ? null : i)}>
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <Text style={{ fontSize: 16, color: src.color }}>{src.icon}</Text>
                  <Text style={{ flex: 1, fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{src.bn}</Text>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: src.color }}>
                    {toBn(src.score)}
                  </Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4 }}>
                    ×{src.weight}%
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: T.cream2, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    width: `${(src.score / 1000) * 100}%`, height: '100%',
                    backgroundColor: src.color, borderRadius: 3,
                  }} />
                </View>
                {activeSource === i && (
                  <View style={{
                    marginTop: 8, backgroundColor: src.color + '10',
                    borderRadius: 8, padding: 10,
                  }}>
                    <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.ink2 }}>
                      {src.en}: এই উৎস থেকে স্কোর {toBn(src.score)} এবং ওজন {src.weight}% — মোট স্কোরে অবদান {toBn(Math.round(src.score * src.weight / 100))} পয়েন্ট।
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
          <View style={{
            marginTop: 8, padding: 10,
            backgroundColor: T.tealBg, borderRadius: 10,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.teal2 }}>মোট হাইব্রিড স্কোর</Text>
            <Text style={{ fontFamily: T.fHead, fontSize: 20, color: T.teal2 }}>{toBn(hybridScore)}</Text>
          </View>
        </View>

        {/* Payment history */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="মোবাইল মানি পেমেন্ট ইতিহাস" en="bKash / Nagad payment timeline" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TIMELINE.map((t, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <View style={{
                  width: '100%', height: 50, borderRadius: 8,
                  backgroundColor: t.onTime ? T.teal + '22' : T.coral + '22',
                  borderWidth: 1, borderColor: t.onTime ? T.teal + '55' : T.coral + '55',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14 }}>{t.onTime ? '✓' : '!'}</Text>
                </View>
                <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: T.ink3, textAlign: 'center' }}>{t.month}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.teal }} />
              <Text style={{ fontFamily: T.fBn, fontSize: 10, color: T.ink3 }}>সময়মতো</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.coral }} />
              <Text style={{ fontFamily: T.fBn, fontSize: 10, color: T.ink3 }}>বিলম্ব</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: T.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: '#fff' }}>স্কোর গ্রহণ করুন →</Text>
        </Pressable>
      </ScrollView>
      <FreyaButton screen="result" />
    </View>
  );
}
