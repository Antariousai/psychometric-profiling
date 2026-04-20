import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import BilingualLabel from '../components/BilingualLabel';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';

const STEPS = [
  {
    id: 'nid', icon: '⊡', bn: 'NID স্ক্যান', en: 'NID Card Scan',
    desc: 'ক্যামেরা দিয়ে জাতীয় পরিচয়পত্র স্ক্যান করুন',
    status: 'done', color: T.teal,
    detail: 'NIDS ডাটাবেজে মিলেছে ✓',
  },
  {
    id: 'face', icon: '◉', bn: 'মুখমণ্ডল যাচাই', en: 'Facial Biometric',
    desc: 'আবেদনকারীর সেলফি NID-এর ছবির সাথে মেলানো হবে',
    status: 'done', color: T.teal,
    detail: '৯৬.৪% নিশ্চিততা ✓',
  },
  {
    id: 'doc', icon: '◧', bn: 'দলিল যাচাই', en: 'Document Verification',
    desc: 'ব্যবসার নথি ও জমির কাগজ AI দিয়ে যাচাই হবে',
    status: 'pending', color: T.gold,
    detail: 'অপেক্ষায় আছে...',
  },
  {
    id: 'liveness', icon: '◎', bn: 'লাইভনেস চেক', en: 'Liveness Detection',
    desc: 'ছবি জাল কিনা AI দিয়ে পরীক্ষা করা হবে',
    status: 'pending', color: T.ink4,
    detail: 'এখনো শুরু হয়নি',
  },
];

const RESULT_ITEMS = [
  { label: 'NID নম্বর', value: '1993xxxxxxx412', ok: true },
  { label: 'জন্মতারিখ', value: '১৫ মার্চ ১৯৯২', ok: true },
  { label: 'পিতার নাম', value: 'আবদুল করিম', ok: true },
  { label: 'ঠিকানা মিল', value: 'কমলগঞ্জ, সিলেট', ok: true },
  { label: 'ব্ল্যাকলিস্ট', value: 'পাওয়া যায়নি', ok: true },
  { label: 'মামলা রেকর্ড', value: 'পাওয়া যায়নি', ok: true },
];

export default function KYCScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'ডিজিটাল KYC', en: 'Digital KYC & Verification' }}
        onBack={() => router.back()}
        right={<Chip color={T.teal}>LIVE</Chip>}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient
          colors={[T.navy, '#162C42']}
          style={{ borderRadius: 18, padding: 18, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: 'rgba(46,196,182,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 24, color: T.teal }}>⊛</Text>
            </View>
            <View>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal, letterSpacing: 1.5 }}>
                AI-POWERED · NIDS INTEGRATED
              </Text>
              <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff', marginTop: 2 }}>
                স্বয়ংক্রিয় পরিচয় যাচাই
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { n: '৩০%', label: 'জালিয়াতি কম' },
              { n: '৪৫ সে', label: 'যাচাই সময়' },
              { n: '৯৮%', label: 'নির্ভুলতা' },
            ].map((s, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 10, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 20, color: T.teal }}>{s.n}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Mock camera scanner */}
        <Pressable
          onPress={() => { setScanning(true); setTimeout(() => { setScanning(false); setScanned(true); }, 1500); }}
          style={{
            backgroundColor: '#000',
            borderRadius: 18, height: 180,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, overflow: 'hidden',
          }}>
          <View style={{
            position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(46,196,182,0.06)',
          }} />
          {/* Corner guides */}
          {[
            { top: 20, left: 20 }, { top: 20, right: 20 },
            { bottom: 20, left: 20 }, { bottom: 20, right: 20 },
          ].map((pos, i) => (
            <View key={i} style={{
              position: 'absolute', width: 24, height: 24,
              borderColor: T.teal, borderWidth: 2,
              borderTopRightRadius: pos.right !== undefined && pos.top !== undefined ? 6 : 0,
              borderTopLeftRadius: pos.left !== undefined && pos.top !== undefined ? 6 : 0,
              borderBottomRightRadius: pos.right !== undefined && pos.bottom !== undefined ? 6 : 0,
              borderBottomLeftRadius: pos.left !== undefined && pos.bottom !== undefined ? 6 : 0,
              ...pos,
            }} />
          ))}
          {scanning ? (
            <View style={{ height: 2, width: '70%', backgroundColor: T.teal, opacity: 0.8 }} />
          ) : scanned ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, color: T.teal }}>✓</Text>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff', marginTop: 6 }}>NID স্ক্যান সম্পন্ন</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                VERIFIED · TAP TO RE-SCAN
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff', marginTop: 6 }}>NID ক্যামেরায় ধরুন</Text>
            </View>
          )}
        </Pressable>

        {/* Verification steps */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="যাচাই ধাপসমূহ" en="Verification steps" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          {STEPS.map((step, i) => (
            <View key={step.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 10,
              borderBottomWidth: i < STEPS.length - 1 ? 1 : 0,
              borderBottomColor: T.border,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: step.status === 'done' ? step.color + '22' : T.cream2,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 16, color: step.status === 'done' ? step.color : T.ink4 }}>{step.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{step.bn}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3, marginTop: 2 }}>{step.desc}</Text>
              </View>
              <View>
                <Chip
                  color={step.status === 'done' ? T.teal : step.status === 'pending' ? T.gold : T.ink4}
                  size={8}>
                  {step.status === 'done' ? '✓ হয়েছে' : 'অপেক্ষা'}
                </Chip>
                <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 3, textAlign: 'right' }}>
                  {step.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* NIDS result */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <BilingualLabel bn="NIDS ফলাফল" en="National ID database result" sizeBn={13} sizeEn={10} weight="700" />
            <Chip color={T.teal} size={8.5}>NIDS ✓</Chip>
          </View>
          {RESULT_ITEMS.map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: i < RESULT_ITEMS.length - 1 ? 1 : 0,
              borderBottomColor: T.border,
            }}>
              <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: T.ink3 }}>{item.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 11.5, color: T.ink }}>{item.value}</Text>
                <Text style={{ color: item.ok ? T.green : T.coral, fontSize: 12 }}>{item.ok ? '✓' : '✗'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action button */}
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: T.teal, borderRadius: 14,
            paddingVertical: 14, alignItems: 'center',
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: '#fff' }}>যাচাই সম্পন্ন — পরবর্তী ধাপে যান →</Text>
        </Pressable>
      </ScrollView>
      <FreyaButton screen="intake" />
    </View>
  );
}
