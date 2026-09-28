import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';
import PrimaryBtn from '../components/PrimaryBtn';
import { recordProttoyConsent } from '../services/prottoySupabase';
import { isProttoyBankEnabled } from '../lib/prottoyFlags';

const CONSENT_VERSION = 'bn-1.2';

export default function ConsentScreen() {
  const router = useRouter();
  const { assessmentSessionId, setProttoyConsentAccepted } = useApp();
  const [busy, setBusy] = useState(false);

  if (!isProttoyBankEnabled()) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontFamily: T.fBn, color: T.ink2 }}>
          Prottoy path is off. Set EXPO_PUBLIC_PROTTOY_BANK=true.
        </Text>
        <PrimaryBtn label={{ bn: 'ফিরে যান', en: 'Back' }} onPress={() => router.back()} />
      </View>
    );
  }

  const accept = async () => {
    setBusy(true);
    try {
      if (assessmentSessionId) {
        await recordProttoyConsent(assessmentSessionId, { accepted: true, version: CONSENT_VERSION });
      }
      setProttoyConsentAccepted?.(true);
      router.replace('/assessment');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      if (assessmentSessionId) {
        await recordProttoyConsent(assessmentSessionId, { accepted: false, version: CONSENT_VERSION });
      }
      setProttoyConsentAccepted?.(false);
      router.replace('/(tabs)/dashboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'সম্মতি', en: 'Consent' }}
        subtitle="PROTTOY · BEFORE QUESTIONS"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{
          backgroundColor: '#fff',
          borderWidth: 1.5, borderColor: T.border, borderRadius: 14,
          padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 16, color: T.navy, marginBottom: 10, lineHeight: 26 }}>
            এই মূল্যায়নে অংশ নেওয়ার আগে আপনার সম্মতি প্রয়োজন
          </Text>
          <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink2, lineHeight: 22, marginBottom: 12 }}>
            প্রত্যয় (PROTTOY) একটি মনস্তাত্ত্বিক প্রশ্নমালা। এতে আয়, সম্পদ বা ঋণ ইতিহাস জিজ্ঞাসা করা হয় না।
            উত্তরগুলো শাখা ব্যবস্থাপক/কমিটি দেখতে পারেন; মাঠকর্মী বা আবেদনকারীকে স্কোর দেখানো হয় না।
            আপনি যেকোনো সময় থামতে পারেন — তাতে কোনো জরিমানা নেই।
          </Text>
          <Text style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, lineHeight: 18, fontStyle: 'italic' }}>
            Consent is required before any question. Scores are never shown on this device.
            Declining ends the session with no penalty.
          </Text>
          <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginTop: 12 }}>
            CONSENT {CONSENT_VERSION}
          </Text>
        </View>

        {busy ? <ActivityIndicator color={T.teal} /> : null}

        <PrimaryBtn
          label={{ bn: 'সম্মতি দিচ্ছি · প্রশ্ন শুরু', en: 'I consent · Start questions' }}
          icon="→"
          onPress={accept}
          disabled={busy}
        />
        <Pressable
          onPress={decline}
          disabled={busy}
          style={{ paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.coral }}>
            সম্মতি দিচ্ছি না · থামুন
          </Text>
          <Text style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, marginTop: 4 }}>
            Decline consent · End session
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
