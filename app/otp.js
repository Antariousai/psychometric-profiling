import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { T } from '../constants/tokens';
import BilingualLabel from '../components/BilingualLabel';
import BrandHeader from '../components/BrandHeader';
import PrimaryBtn from '../components/PrimaryBtn';
import { bn } from '../utils/format';

export default function OtpScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);
  const [timer, setTimer] = useState(42);

  useEffect(() => {
    const t = setInterval(() => setTimer(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const complete = otp.every(d => d.length === 1);

  const set = (i, v) => {
    const digit = v.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <BrandHeader
        title={{ bn: 'ওটিপি যাচাই', en: 'OTP Verification' }}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
        <BilingualLabel
          bn="নিরাপত্তা কোডটা লিখুন"
          en="Enter security code"
          sizeBn={22}
          sizeEn={12}
          weight="800"
          style={{ marginBottom: 8 }}
        />
        <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink3, lineHeight: 21, marginBottom: 24 }}>
          +৮৮০১৭১২-৪৪৩২১৯ নম্বরে যে ৬-সংখ্যার কোডটা পাঠানো হয়েছে, সেটা এখানে বসান।
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 }}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              onChangeText={(v) => set(i, v)}
              maxLength={1}
              keyboardType="number-pad"
              style={{
                flex: 1, height: 56, textAlign: 'center',
                fontFamily: T.fMonoBold, fontSize: 22, color: T.ink,
                borderWidth: 1.5,
                borderColor: d ? T.teal : T.border,
                borderRadius: 12,
                backgroundColor: '#fff',
                shadowColor: T.teal,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: d ? 0.12 : 0,
                shadowRadius: 6,
                elevation: d ? 2 : 0,
              }}
            />
          ))}
        </View>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          {timer > 0 ? (
            <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3 }}>
              পুনরায় পাঠান <Text style={{ fontFamily: T.fMonoBold, color: T.teal2 }}>{bn(timer)}s</Text>
            </Text>
          ) : (
            <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.teal2 }}>কোড পুনরায় পাঠান</Text>
          )}
        </View>
        <PrimaryBtn
          label={{ bn: 'যাচাই করুন', en: 'Verify & Enter' }}
          onPress={() => router.replace('/(tabs)/dashboard')}
          disabled={!complete}
        />
        <Pressable onPress={() => router.replace('/(tabs)/dashboard')} style={{ marginTop: 12, paddingVertical: 10 }}>
          <Text style={{
            fontFamily: T.fBn, fontSize: 12, color: T.ink3, textAlign: 'center',
            textDecorationLine: 'underline',
          }}>
            demo: skip verification →
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
