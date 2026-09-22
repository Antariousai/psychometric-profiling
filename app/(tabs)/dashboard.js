import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { T } from '../../constants/tokens';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { PERSONAS } from '../../data/personas';
import BilingualLabel from '../../components/BilingualLabel';
import ApplicantRow from '../../components/ApplicantRow';
import FreyaButton from '../../components/FreyaButton';
import { OfflineBanner, TrainingBanner, SyncQueueBanner } from '../../components/Banners';
import { load, save, K } from '../../utils/storage';
import { bn as toBn } from '../../utils/format';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signOutStaff } from '../../services/authSupabase';
import { fetchRecentSessions, fetchOfficerStats } from '../../services/psympSupabase';

const DEMO_APPLICANTS = [
  { id: 'nasrin', status: 'completed', score: 742, rating: 'B', flags: 1, whenEn: 'Today · 2:14 PM' },
  { id: 'rafiq',  status: 'in-progress', step: 14, total: 41, whenEn: 'Today · 11:20 AM' },
  { id: 'shima',  status: 'completed', score: 821, rating: 'A', flags: 0, whenEn: 'Yesterday · 3:45 PM' },
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

/** Convert a raw session row from fetchRecentSessions into an ApplicantRow shape. */
function sessionToRow(s) {
  const profile = s.applicants?.profile ?? {};
  const result = Array.isArray(s.psychometric_assessment_results)
    ? s.psychometric_assessment_results[0]
    : s.psychometric_assessment_results;
  const decision = Array.isArray(s.credit_decisions)
    ? s.credit_decisions[0]
    : s.credit_decisions;

  const slug = s.applicants?.slug ?? s.applicant_id ?? 'unknown';
  const completed = Boolean(s.completed_at);
  const flags = Array.isArray(result?.flags) ? result.flags.length : 0;

  const when = new Date(s.created_at);
  const today = new Date().toDateString() === when.toDateString();
  const whenEn = today
    ? `Today · ${when.getHours()}:${String(when.getMinutes()).padStart(2, '0')}`
    : when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return {
    id: slug,
    sessionId: s.id,
    status: completed ? 'completed' : 'in-progress',
    score: result?.overall ?? null,
    rating: result?.rating ?? null,
    flags,
    outcome: decision?.outcome ?? null,
    whenEn,
    displayName: profile.name ?? profile.nameEn ?? slug,
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setApplicant, tweaks, setTweaks, pendingSync, decisions, applicant, applicantId, hydrated, flushSyncAndRefresh } = useApp();

  const [dbSessions, setDbSessions] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncingDash, setSyncingDash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      const seen = await load(K.onboardingSeen, false);
      if (!seen) setShowOnboarding(true);
    })();
  }, [hydrated]);

  const dismissOnboarding = async (markDone = true) => {
    setShowOnboarding(false);
    if (markDone) await save(K.onboardingSeen, true);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    setLoading(true);
    Promise.all([fetchRecentSessions(10), fetchOfficerStats()])
      .then(([sessions, stats]) => {
        if (!alive) return;
        setDbSessions(sessions);
        setDbStats(stats);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const activeName = applicant?.name?.trim() || applicant?.nameEn?.trim() || applicantId;

  const stats = useMemo(() => {
    if (dbStats) {
      const todayDecs = decisions.filter(d => new Date(d.timestamp).toDateString() === new Date().toDateString());
      return [
        { bn: 'মোট মূল্যায়ন', en: 'Total assessments', val: toBn(dbStats.total + todayDecs.length), accent: T.teal },
        { bn: 'অনুমোদন হার', en: 'Approval rate', val: `${toBn(dbStats.approvalRate)}%`, accent: T.green },
        { bn: 'সন্দেহের ঘর', en: 'Risk flags', val: `${toBn(dbStats.flagRate)}%`, accent: T.coral },
      ];
    }
    const todayStr = new Date().toDateString();
    const todayDecs = decisions.filter(d => new Date(d.timestamp).toDateString() === todayStr);
    const flaggedTotal = decisions.filter(d => d.outcome === 'review').length;
    return [
      { bn: 'আজ যতজনকে দেখলাম', en: "Today's assessments", val: toBn(7 + todayDecs.length), accent: T.teal },
      { bn: 'এখনো বাকি আছে', en: 'Pending review', val: toBn(Math.max(0, 3 - todayDecs.length)), accent: T.gold },
      { bn: 'সন্দেহের ঘর', en: 'Risk flags', val: toBn(2 + flaggedTotal), accent: T.coral },
    ];
  }, [decisions, dbStats]);

  const recentApplicants = useMemo(() => {
    if (dbSessions && dbSessions.length > 0) {
      return dbSessions.slice(0, 5).map(sessionToRow);
    }
    return DEMO_APPLICANTS;
  }, [dbSessions]);

  const openApplicant = (a) => {
    setApplicant(a.id);
    if (a.status === 'completed') router.push('/result');
    else router.push('/assessment');
  };

  const onDashboardSync = async () => {
    setSyncingDash(true);
    try {
      await flushSyncAndRefresh();
    } finally {
      setSyncingDash(false);
    }
  };

  const ONBOARDING_SLIDES = [
    { bn: 'নতুন আবেদনকারী যোগ করুন', en: 'Start from “New applicant” — intake through assessment.', icon: '＋' },
    { bn: 'উত্তর ডিভাইসে সংরক্ষিত', en: 'Answers stay on device; resume if something interrupts.', icon: '✓' },
    { bn: 'ফলে নিশ্চিত সিদ্ধান্ত', en: 'Approve, decline, or flag — with a confirmation step.', icon: '◈' },
    { bn: 'প্রশিক্ষণ ও অফলাইন', en: 'Profile: training mode & offline when you need them.', icon: '◉' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="light" />
      {tweaks.offline ? <OfflineBanner pendingSync={pendingSync} /> : null}
      {tweaks.trainingMode ? <TrainingBanner /> : null}
      {isSupabaseConfigured && !tweaks.offline && pendingSync > 0 ? (
        <SyncQueueBanner
          pendingSync={pendingSync}
          onSyncPress={onDashboardSync}
          syncing={syncingDash}
        />
      ) : null}
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
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.teal, letterSpacing: 2, marginBottom: 6 }}>
                  PKSF · BURO-BANGLADESH PO
                </Text>
                <Text style={{ fontFamily: T.fBnBlack, fontSize: 22, color: '#fff', lineHeight: 29 }}>
                  আসসালামু আলাইকুম, কামরুল ভাই
                </Text>
                <Text style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>
                  Kamrul Hossain · Loan Officer · ID 21047
                </Text>
                {isSupabaseConfigured && user && (user.phone ?? user.email) ? (
                  <Text style={{ fontFamily: T.fMono, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 8 }} numberOfLines={1}>
                    {user.phone ?? user.email}
                  </Text>
                ) : null}
              </View>
              {isSupabaseConfigured && user ? (
                <Pressable
                  onPress={() => void signOutStaff()}
                  style={{
                    paddingVertical: 9, paddingHorizontal: 12, borderRadius: 11,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 11.5, color: 'rgba(255,255,255,0.9)' }}>সাইন আউট</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 8, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Sign out</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {stats.map((s, i) => (
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

        <View style={{
          marginHorizontal: 16, marginTop: 10,
          paddingVertical: 10, paddingHorizontal: 12,
          backgroundColor: T.cream2, borderRadius: 12,
          borderWidth: 1, borderColor: T.border,
        }}>
          <Text style={{ fontFamily: T.fMonoBold, fontSize: 8, color: T.ink4, letterSpacing: 0.6, marginBottom: 4 }}>
            ACTIVE APPLICANT
          </Text>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink }} numberOfLines={2}>{activeName}</Text>
          <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink3, marginTop: 2 }} numberOfLines={1}>
            {applicantId}{!PERSONAS[applicantId] ? ' · custom' : ''}
          </Text>
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

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={T.teal} />
            </View>
          ) : (
            recentApplicants.map((a, i) => (
              <ApplicantRow key={a.sessionId ?? (a.id + i)} row={a} onPress={() => openApplicant(a)} />
            ))
          )}

          {!loading && isSupabaseConfigured && dbSessions?.length === 0 ? (
            <View style={{
              paddingVertical: 20, alignItems: 'center',
              borderWidth: 1, borderColor: T.border, borderRadius: 12, borderStyle: 'dashed',
            }}>
              <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink4 }}>
                এখনো কোনো মূল্যায়ন নেই — নতুন আবেদনকারী দিয়ে শুরু করুন
              </Text>
            </View>
          ) : null}
        </View>

        {/* Core Add-On Modules */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
            <Text style={{ fontFamily: T.fBnBlack, fontSize: 14, color: T.ink, marginBottom: 2 }}>কোর মডিউলসমূহ</Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, letterSpacing: 0.5 }}>CORE ADD-ON MODULES</Text>
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
                    backgroundColor: m.bgColor, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18, color: m.color }}>{m.icon}</Text>
                  </View>
                  <View style={{ backgroundColor: m.color + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 7.5, color: m.color, letterSpacing: 0.5 }}>{m.badge}</Text>
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

      <Modal visible={showOnboarding} transparent animationType="fade" onRequestClose={() => dismissOnboarding(true)}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(15,23,42,0.72)',
          justifyContent: 'center', paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 22,
            borderWidth: 1, borderColor: T.border,
          }}>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.teal, letterSpacing: 1.5, marginBottom: 8 }}>
              QUICK TOUR · {onboardingStep + 1}/4
            </Text>
            <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>{ONBOARDING_SLIDES[onboardingStep].icon}</Text>
            <Text style={{ fontFamily: T.fBnBlack, fontSize: 17, color: T.navy, textAlign: 'center', marginBottom: 8 }}>
              {ONBOARDING_SLIDES[onboardingStep].bn}
            </Text>
            <Text style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, textAlign: 'center', lineHeight: 19, marginBottom: 22 }}>
              {ONBOARDING_SLIDES[onboardingStep].en}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {onboardingStep > 0 ? (
                <Pressable
                  onPress={() => setOnboardingStep(s => s - 1)}
                  style={{
                    flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: T.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink2 }}>পেছনে</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => dismissOnboarding(true)}
                  style={{
                    flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: T.border2,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink4 }}>বাদ দিন</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  if (onboardingStep < ONBOARDING_SLIDES.length - 1) setOnboardingStep(s => s + 1);
                  else dismissOnboarding(true);
                }}
                style={{
                  flex: 1.2, minHeight: 48, borderRadius: 12, backgroundColor: T.teal,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>
                  {onboardingStep < ONBOARDING_SLIDES.length - 1 ? 'পরের ধাপ' : 'বুঝেছি'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
