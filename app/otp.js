import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { T } from '../constants/tokens';
import BilingualLabel from '../components/BilingualLabel';
import BrandHeader from '../components/BrandHeader';
import PrimaryBtn from '../components/PrimaryBtn';
import { bn } from '../utils/format';
import { verifyStaffPhoneOtp } from '../services/authSupabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { mustRequireStaffLogin } from '../lib/requireStaffAuth';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const phoneParam = typeof phone === 'string' ? phone : phone?.[0] || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);
  const [timer, setTimer] = useState(42);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTimer(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  /** Demo UX: ওটিপি ছয় ঘর পূর্ণ করলেই ড্যাশবোর্ডে। */
  useEffect(() => {
    const full = otp.every(d => d.length === 1);
    if (mustRequireStaffLogin() || !full) return undefined;
    const t = setTimeout(() => {
      router.replace('/(tabs)/dashboard');
    }, 500);
    return () => clearTimeout(t);
  }, [otp, router]);

  const complete = otp.every(d => d.length === 1);
  const otpString = otp.join('');

  const set = (i, v) => {
    const digit = v.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const goDashboard = async () => {
    router.replace('/(tabs)/dashboard');
  };

  const onVerify = async () => {
    setErr(null);
    /** Demo login: skip real OTP verification. */
    if (!mustRequireStaffLogin()) {
      await goDashboard();
      return;
    }
    if (!isSupabaseConfigured) {
      setErr('Supabase এখনও কনফিগ করা নেই।');
      return;
    }
    if (!phoneParam) {
      setErr('ফোন নম্বর পাওয়া যায়নি — লগইনে ফিরুন।');
      return;
    }
    setBusy(true);
    try {
      const { error } = await verifyStaffPhoneOtp(phoneParam, otpString);
      if (error) throw error;
      await goDashboard();
    } catch (e) {
      setErr(e?.message || 'কোড সঠিক নয় অথবা মেয়াদ ফুরিয়েছে।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      style={{ flex: 1, backgroundColor: T.cream }}
    >
      <BrandHeader
        title={{ bn: 'ওটিপি যাচাই', en: 'OTP Verification' }}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <BilingualLabel
          bn="নিরাপত্তা কোডটা লিখুন"
          en="Enter security code"
          sizeBn={22}
          sizeEn={12}
          weight="800"
          style={{ marginBottom: 8 }}
        />
        <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink3, lineHeight: 21, marginBottom: 24 }}>
          {phoneParam
            ? `${phoneParam} নম্বরে পাঠানো কোডটি লিখুন।`
            : '+৮৮০… নম্বরে যে ৬-সংখ্যার কোডটা পাঠানো হয়েছে, সেটা এখানে বসান। এটি লগইন পেজ থেকে ফোন পাঠানোর পরে কাজ করবে।'}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8, width: '100%' }}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              editable={!busy}
              onChangeText={(v) => set(i, v)}
              maxLength={1}
              keyboardType="number-pad"
              inputMode="numeric"
              style={{
                flex: 1, minWidth: 0, height: 56, textAlign: 'center',
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
        {err ? (
          <Text style={{ marginBottom: 14, fontFamily: T.fBnBold, fontSize: 13, color: T.coral, lineHeight: 21 }}>
            {err}
          </Text>
        ) : null}
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
          label={{ bn: busy ? 'যাচাই করা হচ্ছে…' : 'যাচাই করুন', en: busy ? 'Verifying…' : 'Verify & Enter' }}
          onPress={() => void onVerify()}
          disabled={busy || (mustRequireStaffLogin() ? !complete : false)}
        />
        {busy ? (
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <ActivityIndicator color={T.teal} />
          </View>
        ) : null}
        {!mustRequireStaffLogin() ? (
          <Pressable onPress={() => void goDashboard()} style={{ marginTop: 14, paddingVertical: 10 }}>
            <Text style={{
              fontFamily: T.fBn, fontSize: 12, color: T.ink3, textAlign: 'center',
              textDecorationLine: 'underline',
            }}>
              ডেমো: ওটিপি ছাড়াই ড্যাশবোর্ড →
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
