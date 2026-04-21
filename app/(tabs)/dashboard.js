import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { T } from '../../constants/tokens';
import { useApp } from '../../context/AppContext';
import BilingualLabel from '../../components/BilingualLabel';
import ApplicantRow from '../../components/ApplicantRow';
import FreyaButton from '../../components/FreyaButton';
import { OfflineBanner, TrainingBanner } from '../../components/Banners';

const STATS = [
  { bn: 'আজ যতজনকে দেখলাম', en: "Today's assessments", val: '৭', accent: T.teal },
  { bn: 'এখনো বাকি আছে', en: 'Pending review', val: '৩', accent: T.gold },
  { bn: 'সন্দেহের ঘর', en: 'Risk flags', val: '২', accent: T.coral },
];

const APPLICANTS = [
  { id: 'nasrin', status: 'completed', score: 742, rating: 'B', flags: 1, whenEn: 'Today · 2:14 PM' },
  { id: 'rafiq', status: 'in-progress', step: 14, total: 25, whenEn: 'Today · 11:20 AM' },
  { id: 'shima', status: 'completed', score: 821, rating: 'A', flags: 0, whenEn: 'Yesterday · 3:45 PM' },
];

const MODULES = [
  {
    id: 'kyc',
    icon: '⊛',
    bn: 'ডিজিটাল KYC',
    en: 'Digital KYC & Verification',
    desc: 'AI দিয়ে NID ও বায়োমেট্রিক যাচাই',
    color: T.teal,
    bgColor: T.tealBg,
    route: '/kyc',
    badge: 'LIVE',
  },
  {
    id: 'credit',
    icon: '◈',
    bn: 'ক্রেডিট স্কোরিং',
    en: 'Real-Time Credit Score',
    desc: 'মোবাইল মানি + মনস্তাত্ত্বিক হাইব্রিড স্কোর',
    color: T.gold,
    bgColor: T.goldBg,
    route: '/credit',
    badge: 'AI',
  },
  {
    id: 'repayment',
    icon: '◎',
    bn: 'পরিশোধ পূর্বাভাস',
    en: 'Repayment Prediction',
    desc: 'WhatsApp/SMS রিমাইন্ডার ও JLG সমন্বয়',
    color: T.violet,
    bgColor: 'rgba(123,45,139,0.10)',
    route: '/repayment',
    badge: 'AUTO',
  },
  {
    id: 'field',
    icon: '◬',
    bn: 'ফিল্ড ভিজিট',
    en: 'Geo-Tracked Field Visits',
    desc: 'GPS লগিং, ছবি যাচাই ও IMIS সিঙ্ক',
    color: T.leaf,
    bgColor: 'rgba(94,140,65,0.10)',
    route: '/fieldvisit',
    badge: 'GPS',
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { setApplicant, tweaks, setTweaks, pendingSync } = useApp();

  const openApplicant = (a) => {
    setApplicant(a.id);
    if (a.status === 'completed') router.push('/result');
    else router.push('/assessment');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="light" />
      {tweaks.offline ? <OfflineBanner pendingSync={pendingSync} /> : null}
      {tweaks.trainingMode ? <TrainingBanner /> : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Pressable onLongPress={() => setTweaks({ offline: !tweaks.offline })} delayLongPress={700}>
          <LinearGradient
            colors={[T.navy, T.navy2]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ paddingTop: 54, paddingHorizontal: 20, paddingBottom: 68 }}>
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18,
            }}>
              <View>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.teal, letterSpacing: 2, marginBottom: 6 }}>
                  PKSF · BURO-BANGLADESH PO
                </Text>
                <Text style={{ fontFamily: T.fBnBlack, fontSize: 22, color: '#fff', lineHeight: 29 }}>
                  আসসালামু আলাইকুম, কামরুল ভাই
                </Text>
                <Text style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>
                  Kamrul Hossain · Loan Officer · ID 21047
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {STATS.map((s, i) => (
                <View key={i} style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12,
                }}>
                  <Text style={{ fontFamily: T.fHead, fontSize: 26, color: s.accent, lineHeight: 28 }}>{s.val}</Text>
                  <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 5, lineHeight: 14 }}>{s.bn}</Text>
                  <Text style={{ fontFamily: T.fBody, fontSize: 8.5, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{s.en}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Pressable>

        {/* New applicant CTA */}
        <View style={{
          marginHorizontal: 16, marginTop: -48,
          backgroundColor: '#fff', borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: T.border,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
        }}>
          <View style={{
            width: 52, height: 52, borderRadius: 14, backgroundColor: T.tealBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24, color: T.teal2 }}>＋</Text>
          </View>
          <View style={{ flex: 1 }}>
            <BilingualLabel bn="নতুন আবেদনকারী" en="New applicant" sizeBn={16} sizeEn={11} weight="800" />
            <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.ink3, marginTop: 4 }}>চলুন, একজনকে নিয়ে বসি</Text>
          </View>
          <Pressable
            onPress={() => router.push('/intake')}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.teal }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>শুরু →</Text>
          </Pressable>
        </View>

        {/* Recent applicants */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
            paddingHorizontal: 4, paddingBottom: 10,
          }}>
            <BilingualLabel bn="সাম্প্রতিক আবেদনকারী" en="Recent applicants" sizeBn={14} sizeEn={10} weight="700" />
            <Pressable onPress={() => router.navigate('/(tabs)/history')}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: T.teal2 }}>সবগুলো দেখুন →</Text>
            </Pressable>
          </View>
          {APPLICANTS.map(a => (
            <ApplicantRow key={a.id + a.whenEn} row={a} onPress={() => openApplicant(a)} />
          ))}
        </View>

        {/* Core Add-On Modules */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
            <Text style={{ fontFamily: T.fBnBlack, fontSize: 14, color: T.ink, marginBottom: 2 }}>
              কোর মডিউলসমূহ
            </Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, letterSpacing: 0.5 }}>
              CORE ADD-ON MODULES
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {MODULES.map(m => (
              <Pressable
                key={m.id}
                onPress={() => router.push(m.route)}
                style={({ pressed }) => ({
                  width: '47%', flexGrow: 1,
                  backgroundColor: pressed ? m.bgColor : '#fff',
                  borderWidth: 1, borderColor: T.border,
                  borderRadius: 16, padding: 14,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
                })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: m.bgColor,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18, color: m.color }}>{m.icon}</Text>
                  </View>
                  <View style={{
                    backgroundColor: m.color + '22', borderRadius: 6,
                    paddingHorizontal: 6, paddingVertical: 2,
                  }}>
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 7.5, color: m.color, letterSpacing: 0.5 }}>
                      {m.badge}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink, marginBottom: 4 }}>{m.bn}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3, lineHeight: 15 }}>{m.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <FreyaButton screen="dashboard" bottom={90} />
    </View>
  );
}
