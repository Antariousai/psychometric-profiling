import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import BilingualLabel from '../components/BilingualLabel';
import Field from '../components/Field';
import PrimaryBtn from '../components/PrimaryBtn';
import AntariousLogo from '../components/AntariousLogo';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('01712-443219');
  const [pin, setPin] = useState('');

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
            <View style={{
              paddingVertical: 3, paddingHorizontal: 8,
              borderRadius: 10,
              backgroundColor: 'rgba(46,196,182,0.12)',
              borderWidth: 1, borderColor: 'rgba(46,196,182,0.2)',
            }}>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 8, color: T.teal, letterSpacing: 2 }}>
                × PKSF
              </Text>
            </View>
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
            আপনার মোবাইল নম্বর আর পিন দিয়ে ঢুকে পড়ুন ভাই। একদম সহজ।
          </Text>
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
          />
          <Field
            label={{ bn: '৪-সংখ্যার পিন', en: '4-digit PIN' }}
            value={pin}
            onChangeText={(v) => setPin(v.slice(0, 4))}
            secureTextEntry
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
          />
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 6, marginBottom: 20,
          }}>
            <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2 }}>
              ☑ এই ফোনটা মনে রাখবে
            </Text>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.teal2 }}>
              পিন ভুলে গেছেন?
            </Text>
          </View>
          <PrimaryBtn
            onPress={() => router.push('/otp')}
            label={{ bn: 'ওটিপি পাঠান', en: 'Send OTP' }}
          />
          <View style={{
            marginTop: 16,
            paddingVertical: 12, paddingHorizontal: 14,
            backgroundColor: '#fff',
            borderWidth: 1, borderStyle: 'dashed',
            borderColor: T.border2, borderRadius: 12,
          }}>
            <Text style={{
              fontFamily: T.fBn, fontSize: 12, color: T.ink3, lineHeight: 20, textAlign: 'center',
            }}>
              🔒 <Text style={{ color: T.ink2 }}>PKSF-সুরক্ষিত।</Text> আপনার তথ্য শুধু আপনার PO-তেই থাকবে।
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
