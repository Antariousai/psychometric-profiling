import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';
import PrimaryBtn from '../components/PrimaryBtn';
import FreyaOrb from '../components/FreyaOrb';
import { finalizeProttoyAssessment } from '../services/prottoySupabase';
import { isProttoyBankEnabled } from '../lib/prottoyFlags';
import { save, K } from '../utils/storage';

/**
 * Field hand-back screen — NO scores, Freya score narrative, or approve-by-score.
 */
export default function CompletionScreen() {
  const router = useRouter();
  const { assessmentSessionId, applicant, setAnswers } = useApp();
  const [syncStatus, setSyncStatus] = useState('pending');
  const [statusLabel, setStatusLabel] = useState('SUBMITTED');
  const [error, setError] = useState(null);

  useEffect(() => {
    void save(K.assessmentDraftApplicant, null);
  }, []);

  useEffect(() => {
    if (!isProttoyBankEnabled()) {
      router.replace('/result');
      return;
    }
    let cancelled = false;
    (async () => {
      if (!assessmentSessionId) {
        if (!cancelled) {
          setSyncStatus('local');
          setStatusLabel('LOCAL_ONLY');
        }
        return;
      }
      try {
        const ack = await finalizeProttoyAssessment(assessmentSessionId);
        if (cancelled) return;
        setStatusLabel(ack.status || 'SUBMITTED');
        setSyncStatus('ok');
        setAnswers({});
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
        setSyncStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [assessmentSessionId]);

  const syncOk = syncStatus === 'ok' || syncStatus === 'local';

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'জমা সম্পন্ন', en: 'Submitted' }}
        subtitle="HAND-BACK · NO SCORES"
        onBack={() => router.replace('/(tabs)/dashboard')}
      />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <FreyaOrb size={72} pulse={syncStatus === 'pending'} />
        <Text style={{
          fontFamily: T.fBnBlack, fontSize: 22, color: T.navy,
          textAlign: 'center', marginTop: 20, lineHeight: 32,
        }}>
          মূল্যায়ন জমা হয়েছে
        </Text>
        <Text style={{
          fontFamily: T.fBody, fontSize: 13, color: T.ink3,
          textAlign: 'center', marginTop: 8, marginBottom: 20,
        }}>
          Assessment submitted · Hand device back to officer
        </Text>

        <View style={{
          width: '100%',
          backgroundColor: '#fff',
          borderWidth: 1.5,
          borderColor: syncOk ? T.teal : syncStatus === 'error' ? T.coral : T.border,
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
        }}>
          {syncStatus === 'pending' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={T.teal} />
              <Text style={{ fontFamily: T.fBn, color: T.ink2 }}>সিঙ্ক হচ্ছে…</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: T.navy, marginBottom: 6 }}>
                {syncOk ? 'সিঙ্ক OK' : 'সিঙ্ক ব্যর্থ — পরে আবার চেষ্টা করুন'}
              </Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 10, color: T.ink4, letterSpacing: 1 }}>
                STATUS · {statusLabel}
              </Text>
              {applicant?.name ? (
                <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3, marginTop: 8 }}>
                  আবেদনকারী: {applicant.name}
                </Text>
              ) : null}
              {error ? (
                <Text style={{ fontFamily: T.fBody, fontSize: 11, color: T.coral, marginTop: 8 }}>
                  {error}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <Text style={{
          fontFamily: T.fBn, fontSize: 12, color: T.ink3,
          textAlign: 'center', lineHeight: 20, marginBottom: 24,
        }}>
          স্কোর এই ডিভাইসে দেখানো হয় না। শাখা ব্যবস্থাপক/কমিটি সিদ্ধান্ত নেবেন।
        </Text>

        <PrimaryBtn
          label={{ bn: 'ড্যাশবোর্ডে ফিরুন', en: 'Back to dashboard' }}
          onPress={() => router.replace('/(tabs)/dashboard')}
        />
      </View>
    </View>
  );
}
