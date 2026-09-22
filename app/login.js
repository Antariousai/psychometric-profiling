import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import BilingualLabel from '../components/BilingualLabel';
import Field from '../components/Field';
import PrimaryBtn from '../components/PrimaryBtn';
import AntariousLogo from '../components/AntariousLogo';
import { isSupabaseConfigured } from '../lib/supabase';
import { mustRequireStaffLogin } from '../lib/requireStaffAuth';
import { bdPhoneToE164, sendStaffPhoneOtp, signInStaffPassword } from '../services/authSupabase';

const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_AUTH_EMAIL || '';
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_AUTH_PASSWORD || '';
const ALLOW_DEV_PW = Boolean(DEV_EMAIL && DEV_PASSWORD);

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('01712-443219');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState(null);

  /** Staging shortcut — OTP flow still shown in UI until SMS is wired. */
  const [showDev, setShowDev] = useState(false);
  const [devEmailState, setDevEmailState] = useState(DEV_EMAIL);
  const [devPasswordState, setDevPasswordState] = useState(DEV_PASSWORD);

  const navigateAfterAuth = () => {
    router.replace('/(tabs)/dashboard');
  };

  const onSendOtp = async () => {
    setAuthError(null);
    /** Demo: show OTP UI only; no SMS, no JWT required. */
    if (!mustRequireStaffLogin()) {
      try {
        const formatted = bdPhoneToE164(phone);
        router.push({ pathname: '/otp', params: { phone: formatted } });
      } catch (e) {
        setAuthError(e?.message || 'মোবাইল নম্বরটি যাচাই করুন');
      }
      return;
    }

    if (!isSupabaseConfigured) {
      setAuthError('Supabase কনফিগ নেই — দয়া করে `.env` সেট করুন।');
      return;
    }

    setBusy(true);
    try {
      const formatted = bdPhoneToE164(phone);
      const { error } = await sendStaffPhoneOtp(formatted);
      if (error) throw error;
      router.push({ pathname: '/otp', params: { phone: formatted } });
    } catch (e) {
      setAuthError(e?.message || 'Could not send OTP. Check SMS provider in Supabase.');
    } finally {
      setBusy(false);
    }
  };

  const onDevPassword = async () => {
    if (!ALLOW_DEV_PW) return;
    setBusy(true);
    setAuthError(null);
    try {
      const { error } = await signInStaffPassword(devEmailState.trim(), devPasswordState);
      if (error) throw error;
      await navigateAfterAuth();
    } catch (e) {
      setAuthError(e?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const quickDemo = () => navigateAfterAuth();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      style={{ flex: 1, backgroundColor: T.navy }}
    >
      <StatusBar style="light" backgroundColor={T.navy} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['rgba(46,196,182,0.2)', T.navy]}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.3, y: 0.6 }}
          style={{
            paddingTop: 56, paddingHorizontal: 24, paddingBottom: 40,
            borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <AntariousLogo variant="white" height={28} />
            <Image
              source={require('../assets/images/pksf-logo.png')}
              style={{ height: 28, width: 80 }}
              resizeMode="contain"
            />
          </View>
          <BilingualLabel
            bn="সাইকোমেট্রিক প্রোফাইলিং"
            en="Psychometric Profiling · PO Officer Login"
            sizeBn={26}
            sizeEn={11}
            color="#fff"
            enColor="rgba(255,255,255,0.5)"
            weight="800"
            style={{ marginBottom: 6 }}
          />
          <Text style={{ fontFamily: T.fBn, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 22, marginTop: 10 }}>
            আপনার মোবাইল নম্বর আর পিন দিয়ে প্রবেশ করুন
          </Text>
          {!mustRequireStaffLogin() ? (
            <Text style={{ marginTop: 10, fontFamily: T.fMono, fontSize: 10, color: 'rgba(46,196,182,0.95)' }}>
              ডেমো মোড: SMS/OTP সত্যিকারের চালু নয় — ওটিপি স্ক্রিন আর সরাসরি ড্যাশবোর্ড শুধু প্রদর্শনের জন্য।
            </Text>
          ) : (
            <Text style={{ marginTop: 10, fontFamily: T.fMono, fontSize: 9.5, color: 'rgba(255,182,142,0.95)' }}>
              প্রোডাকশন: Supabase ফোন + SMS ও `EXPO_PUBLIC_REQUIRE_AUTH=true` প্রয়োজন।
            </Text>
          )}
        </LinearGradient>

        <View style={{
          flex: 1, padding: 24,
          backgroundColor: T.cream,
          borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -12,
        }}>
          <Field
            label={{ bn: 'মোবাইল নম্বর', en: 'Mobile number' }}
            value={phone}
            onChangeText={setPhone}
            prefix="+88"
            keyboardType="phone-pad"
            editable={!busy}
          />
          <Field
            label={{ bn: '৪-সংখ্যার পিন (ভবিষ্যত PIN)', en: '4-digit PIN (future PIN auth)' }}
            value={pin}
            onChangeText={(v) => setPin(v.slice(0, 4))}
            secureTextEntry
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
            editable={!busy}
          />
          {authError ? (
            <Text style={{ marginTop: 10, marginBottom: 8, fontFamily: T.fBnBold, fontSize: 13, color: T.coral, lineHeight: 20 }}>
              {authError}
            </Text>
          ) : null}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 6, marginBottom: 20,
          }}>
            <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2 }}>
              এই ফোনটা ডিভাইসেই সংরক্ষিত থাকবে
            </Text>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.teal2 }}>
              পিন ভুলে গেছেন?
            </Text>
          </View>
          <PrimaryBtn
            onPress={onSendOtp}
            label={{
              bn: busy ? 'পাঠাচ্ছি…' : 'ওটিপি পাঠান',
              en: busy ? 'Sending…' : 'Send OTP',
            }}
            disabled={busy}
          />
          {busy ? (
            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <ActivityIndicator color={T.teal} />
            </View>
          ) : null}

          {ALLOW_DEV_PW ? (
            <View style={{ marginTop: 28, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: T.border2 }}>
              <Text
                onPress={() => setShowDev(!showDev)}
                style={{ paddingHorizontal: 14, fontFamily: T.fBnBold, fontSize: 13, color: T.teal2 }}
              >
                {showDev ? '− লুকান' : '+ স্ট্যাফ পাসওয়ার্ড (শুধু স্টেজিং)'}
              </Text>
              {showDev ? (
                <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 12 }}>
                  <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.ink3 }}>
                    Supabase ড্যাশবোর্ড থেকে ব্যবহারকারী তৈরি করুন এবং `.env`-এ ডেভ ইমেইল/পাসযোগ করুন।
                  </Text>
                  <TextInput
                    editable={!busy}
                    value={devEmailState}
                    onChangeText={setDevEmailState}
                    placeholder="staff@organization.org"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{
                      borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12,
                      fontFamily: T.fMono, fontSize: 13,
                    }}
                  />
                  <TextInput
                    editable={!busy}
                    value={devPasswordState}
                    onChangeText={setDevPasswordState}
                    placeholder="password"
                    secureTextEntry
                    style={{
                      borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12,
                      fontFamily: T.fMono, fontSize: 13,
                    }}
                  />
                  <PrimaryBtn
                    onPress={onDevPassword}
                    label={{ bn: 'সাইন ইন করুন', en: 'Staff sign-in' }}
                    disabled={busy}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {!mustRequireStaffLogin() ? (
            <Text onPress={quickDemo} style={{ marginTop: 18, textAlign: 'center', fontFamily: T.fBn, fontSize: 13, color: T.teal2, textDecorationLine: 'underline' }}>
              ডেমো: লগইন এড়িয়ে সরাসরি ড্যাশবোর্ডে যান →
            </Text>
          ) : null}

          <View style={{
            marginTop: 20,
            paddingVertical: 12, paddingHorizontal: 14,
            backgroundColor: '#fff',
            borderWidth: 1, borderStyle: 'dashed',
            borderColor: T.border2, borderRadius: 12,
          }}>
            <Text style={{
              fontFamily: T.fBn, fontSize: 12, color: T.ink3, lineHeight: 20, textAlign: 'center',
            }}>
              PKSF-সুরক্ষিত। ডেটা সংগ্রহ করে শুধু আপনার সংস্থার Supabase টেন্যান্টেই সংরক্ষিত হয়।
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
