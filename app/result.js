import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import { QUESTIONS } from '../data/questions';
import { computeScore } from '../data/scoring';
import { isSupabaseConfigured } from '../lib/supabase';
import { saveCreditDecision, savePsychometricAssessmentResult } from '../services/psympSupabase';
import { useApp } from '../context/AppContext';
import BilingualLabel from '../components/BilingualLabel';
import BrandHeader from '../components/BrandHeader';
import Chip from '../components/Chip';
import FreyaOrb from '../components/FreyaOrb';
import FreyaButton from '../components/FreyaButton';
import RadarChart from '../components/RadarChart';
import { bn as toBn, fmtTk } from '../utils/format';

const PRESET = {
  nasrin: { overall: 742, rating: 'B', flagCount: 1 },
  rafiq: { overall: 487, rating: 'D', flagCount: 3 },
  shima: { overall: 821, rating: 'A', flagCount: 0 },
};

const PRESET_DIMS = {
  A: [85, 72, 88, 78, 82, 75, 90],
  B: [78, 65, 70, 72, 68, 60, 82],
  C: [60, 52, 55, 58, 50, 55, 60],
  D: [45, 38, 42, 58, 40, 52, 48],
};

const PRESET_FLAG_TEMPLATES = [
  {
    q: 'q5', type: 'inconsistent',
    bn: 'প্রশ্ন ৯ ও ১০-এর উত্তর মিলছে না',
    en: "Q9 & Q10 answers don't align",
    answerGiven: { bn: 'গ্রহণ করুন', en: 'Accept' },
    expected: { bn: 'বিস্তারিত জিজ্ঞেস করব', en: 'Ask for details first' },
    explanation: { bn: 'সঞ্চয়ের অভ্যাস আছে বলেছেন কিন্তু কিস্তি দেরিতে দিয়েছেন — এই দুটো উত্তর একসাথে মেলে না।', en: 'Claims regular saving but has late instalments — the two answers contradict each other.' },
  },
  {
    q: 'q10', type: 'too-fast',
    bn: 'প্রশ্ন ১৯-এ অস্বাভাবিক দ্রুত উত্তর',
    en: 'Q19 answered too fast',
    answerGiven: { bn: 'কোনো বড় ধাক্কা হয়নি', en: 'No major setback' },
    expected: null,
    explanation: { bn: 'এই প্রশ্নের উত্তর মাত্র ০.৮ সেকেন্ডে দেওয়া হয়েছে। সাধারণত এই ধরনের প্রশ্নে ৫+ সেকেন্ড লাগে।', en: 'This question was answered in only 0.8 seconds. Typical response time is 5+ seconds.' },
  },
  {
    q: 'q19', type: 'social-desirability',
    bn: 'প্রশ্ন ২১-এ "সর্বোচ্চ" উত্তর দ্রুত',
    en: 'Q21 max-score answered too fast',
    answerGiven: { bn: 'সম্পূর্ণ একমত', en: 'Strongly agree' },
    expected: null,
    explanation: { bn: 'সর্বোচ্চ সম্মতির উত্তর মাত্র ১.২ সেকেন্ডে দেওয়া হয়েছে। এটি সামাজিক কাম্যতা পক্ষপাত নির্দেশ করতে পারে।', en: 'Maximum agreement selected in just 1.2 seconds. This may indicate social desirability bias.' },
  },
];

function colorForRating(r) {
  return r === 'A' ? T.green : r === 'B' ? T.teal : r === 'C' ? T.amber : T.coral;
}

export default function ResultScreen() {
  const router = useRouter();
  const {
    applicantId,
    applicant,
    answers,
    addDecision,
    assessmentQuestions,
    assessmentSessionId,
    assessmentApplicantUuid,
    dimensions: dimensionList,
  } = useApp();
  const [tab, setTab] = useState('summary');
  const [flagModal, setFlagModal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const questionBank = assessmentQuestions ?? QUESTIONS;

  const result = useMemo(() => {
    if (answers && Object.keys(answers).length > 0) {
      return computeScore(answers, questionBank, dimensionList);
    }
    const p = PRESET[applicantId] || PRESET.nasrin;
    const rating = p.rating;
    const tenure = rating === 'A' ? 24 : rating === 'B' ? 18 : rating === 'C' ? 12 : 9;
    const risk = rating === 'A' ? 'Low' : rating === 'B' ? 'Moderate' : rating === 'C' ? 'Elevated' : 'High';
    const dims = PRESET_DIMS[rating];
    return {
      overall: p.overall,
      rating, tenure, risk,
      flags: PRESET_FLAG_TEMPLATES.slice(0, p.flagCount),
      dimScores: dimensionList.map((d, i) => ({ ...d, pct: dims[i] })),
      totalPct: dims.reduce((a, b) => a + b, 0) / dims.length,
    };
  }, [applicantId, answers, questionBank, dimensionList]);

  useEffect(() => {
    if (!isSupabaseConfigured || !assessmentSessionId) return;
    if (!answers || Object.keys(answers).length === 0) return;
    const r = computeScore(answers, questionBank, dimensionList);
    void savePsychometricAssessmentResult({
      sessionId: assessmentSessionId,
      applicantUuid: assessmentApplicantUuid,
      result: r,
      answers,
    });
  }, [
    assessmentSessionId,
    assessmentApplicantUuid,
    answers,
    questionBank,
    dimensionList,
  ]);

  const scoreColor = colorForRating(result.rating);
  const recLoanAmt =
    result.rating === 'A' ? applicant.loanAsk
      : result.rating === 'B' ? Math.round(applicant.loanAsk * 0.85)
      : result.rating === 'C' ? Math.round(applicant.loanAsk * 0.6)
      : Math.round(applicant.loanAsk * 0.35);
  const emi = Math.round((recLoanAmt * 1.18) / result.tenure);

  const TOAST_CONFIG = {
    approved: {
      bn: `✓ ${applicant.name}-এর আবেদন অনুমোদন করা হয়েছে`,
      en: `${applicant.nameEn}'s application has been approved`,
      color: T.green,
    },
    declined: {
      bn: `✗ ${applicant.name}-এর আবেদন প্রত্যাখ্যান করা হয়েছে`,
      en: `${applicant.nameEn}'s application has been declined`,
      color: T.coral,
    },
    review: {
      bn: `⚑ প্রোফাইলটি ম্যানেজারের কাছে পাঠানো হয়েছে`,
      en: `Profile has been flagged and sent to manager`,
      color: T.amber,
    },
  };

  const makeDecision = (outcome) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    if (isSupabaseConfigured && assessmentSessionId) {
      void saveCreditDecision({
        sessionId: assessmentSessionId,
        applicantUuid: assessmentApplicantUuid,
        outcome,
        result: {
          ...result,
          rating: String(result.rating).charAt(0),
        },
      });
    }
    addDecision({
      applicantId,
      outcome,
      score: result.overall,
      rating: result.rating,
      flags: result.flags.length,
      timestamp: now.getTime(),
      dateEn: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
    });
    setToast(TOAST_CONFIG[outcome]);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => router.replace('/(tabs)/dashboard'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="light" />
      <BrandHeader
        title={{ bn: 'মূল্যায়ন ফলাফল', en: 'Assessment Result' }}
        onBack={() => router.replace('/(tabs)/dashboard')}
        right={<Chip color={T.teal}>✓ সম্পন্ন</Chip>}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[T.navy, T.navy2]}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{
            position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130,
            backgroundColor: `${scoreColor}33`,
          }} />
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20,
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 12, backgroundColor: applicant.tint,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: T.fBnBlack, fontSize: 18, color: '#fff' }}>{applicant.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 16, color: '#fff' }}>{applicant.name}</Text>
              <Text style={{ fontFamily: T.fBody, fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>
                {applicant.nameEn} · {applicant.occupationEn}
              </Text>
            </View>
            <View style={{
              paddingVertical: 5, paddingHorizontal: 12,
              backgroundColor: `${scoreColor}33`,
              borderWidth: 1, borderColor: scoreColor,
              borderRadius: 20,
            }}>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 11, color: scoreColor }}>
                {result.risk.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={{
            fontFamily: T.fMonoBold, fontSize: 9, color: T.teal,
            letterSpacing: 2, marginBottom: 4,
          }}>CREDIT SCORE · 0–1000</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: T.fHead, fontSize: 72, color: scoreColor, lineHeight: 72 }}>
              {toBn(result.overall)}
            </Text>
            <Text style={{ fontFamily: T.fHead, fontSize: 28, color: '#fff' }}>
              / {result.rating}
            </Text>
          </View>
          <View style={{
            marginTop: 14, height: 5,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 3, overflow: 'hidden', position: 'relative',
          }}>
            <View style={{
              width: `${result.overall / 10}%`, height: '100%',
              backgroundColor: scoreColor, borderRadius: 3,
            }} />
            {[250, 500, 750].map(m => (
              <View
                key={m}
                style={{
                  position: 'absolute', left: `${m / 10}%`, top: 0,
                  width: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </View>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', marginTop: 5,
          }}>
            {['D · HIGH', 'C', 'B', 'A · LOW'].map(s => (
              <Text key={s} style={{ fontFamily: T.fMono, fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{s}</Text>
            ))}
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={{
          flexDirection: 'row', gap: 4,
          paddingHorizontal: 12, paddingTop: 10,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: T.border,
        }}>
          {[
            { id: 'summary', bn: 'সারাংশ', en: 'Summary' },
            { id: 'dims', bn: 'মাত্রা', en: 'Dimensions' },
            { id: 'flags', bn: 'অসঙ্গতি', en: 'Discrepancy', n: result.flags.length },
            { id: 'loan', bn: 'ঋণ', en: 'Loan' },
          ].map(tt => {
            const on = tab === tt.id;
            return (
              <Pressable key={tt.id} onPress={() => setTab(tt.id)} style={{
                flex: 1, paddingVertical: 10,
                borderBottomWidth: 2.5,
                borderBottomColor: on ? T.teal : 'transparent',
                alignItems: 'center', gap: 2,
              }}>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: on ? T.navy : T.ink3 }}>{tt.bn}</Text>
                  {tt.n > 0 ? (
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.coral }}>{toBn(tt.n)}</Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: T.fBody, fontSize: 9, color: T.ink4, letterSpacing: 0.3 }}>{tt.en}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ padding: 16, backgroundColor: T.cream }}>
          {tab === 'summary' ? <ResultSummary result={result} applicant={applicant} recLoanAmt={recLoanAmt} emi={emi} /> : null}
          {tab === 'dims' ? <ResultDims result={result} /> : null}
          {tab === 'flags' ? <ResultFlags result={result} /> : null}
          {tab === 'loan' ? <ResultLoan result={result} applicant={applicant} recLoanAmt={recLoanAmt} emi={emi} /> : null}
        </View>

      </ScrollView>

      {/* Toast sits directly above buttons, in normal layout flow */}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            paddingHorizontal: 16, paddingTop: 10,
            backgroundColor: T.cream,
          }}>
          <View style={{
            backgroundColor: toast.color,
            borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            shadowColor: toast.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff', lineHeight: 19 }}>
                {toast.bn}
              </Text>
              <Text style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginTop: 2 }}>
                {toast.en}
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Action buttons — fixed outside ScrollView */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, flexDirection: 'row', gap: 8, backgroundColor: T.cream }}>
        <Pressable
          onPress={() => setFlagModal(true)}
          style={{
            flex: 1, paddingVertical: 13, borderRadius: 12,
            borderWidth: 1.5, borderColor: T.amber, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.amber }}>⚑ ফ্ল্যাগ করুন</Text>
        </Pressable>
        <Pressable
          onPress={() => makeDecision('approved')}
          style={{
            flex: 1.3, paddingVertical: 13, borderRadius: 12,
            backgroundColor: T.teal,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: T.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>✓ অনুমোদন করুন</Text>
        </Pressable>
        <Pressable
          onPress={() => makeDecision('declined')}
          style={{
            flex: 1.3, paddingVertical: 13, borderRadius: 12,
            backgroundColor: T.coral,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: T.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>✗ প্রত্যাখ্যান করুন</Text>
        </Pressable>
      </View>

      {/* Flag confirmation modal */}
      <Modal visible={flagModal} transparent animationType="fade" onRequestClose={() => setFlagModal(false)}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 20,
            padding: 24, width: '100%',
            shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: 'rgba(245,158,11,0.12)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Text style={{ fontSize: 22 }}>⚑</Text>
            </View>
            <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: T.ink, marginBottom: 4 }}>
              ফ্ল্যাগ ও ম্যানেজারকে পাঠান
            </Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, letterSpacing: 1, marginBottom: 14 }}>
              FLAG & SEND TO MANAGER
            </Text>
            <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink2, lineHeight: 21, marginBottom: 6 }}>
              আপনার অনুমতিতে <Text style={{ fontFamily: T.fBnBold, color: T.ink }}>{applicant.name}</Text>-এর প্রোফাইলটি ম্যানেজারের কাছে পাঠানো হবে এবং পুনর্বিবেচনার জন্য ফ্ল্যাগ করা হবে।
            </Text>
            <Text style={{ fontFamily: T.fBody, fontSize: 10.5, color: T.ink3, fontStyle: 'italic', lineHeight: 17, marginBottom: 22 }}>
              With your permission, {applicant.nameEn}'s profile will be sent to the manager and flagged for review.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setFlagModal(false)}
                style={{
                  flex: 1, paddingVertical: 13, borderRadius: 12,
                  borderWidth: 1.5, borderColor: T.border, backgroundColor: '#fff',
                  alignItems: 'center',
                }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink2 }}>বাতিল করুন</Text>
              </Pressable>
              <Pressable
                onPress={() => { setFlagModal(false); makeDecision('review'); }}
                style={{
                  flex: 1.4, paddingVertical: 13, borderRadius: 12,
                  backgroundColor: T.amber,
                  alignItems: 'center',
                  shadowColor: T.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
                }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>⚑ পাঠিয়ে দিন</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FreyaButton screen="result" />
    </View>
  );
}


function ResultSummary({ result, applicant, recLoanAmt, emi }) {
  const flagLine = result.flags.length > 0
    ? ` তবে ${toBn(result.flags.length)}টি অসঙ্গতি ধরা পড়েছে — সাক্ষাৎকারে যাচাই না করে সিদ্ধান্ত নেবেন না।`
    : ' কোনো অসঙ্গতি নেই — প্রোফাইল পরিষ্কার।';
  const freyaText = {
    A: `${applicant.name}-এর প্রোফাইল দারুণ। ${fmtTk(recLoanAmt)} টাকা পুরোটাই দেওয়া যায়।${flagLine}`,
    B: `${applicant.name}-এর সামগ্রিক অবস্থা ভালোই। ${fmtTk(recLoanAmt)} পর্যন্ত বিবেচনা করুন।${flagLine}`,
    C: `${applicant.name}-এর প্রোফাইলে দুর্বল জায়গা আছে। ${fmtTk(recLoanAmt)} দিয়ে ছোট করে শুরু করুন।${flagLine}`,
    D: `${applicant.name}-এর ক্ষেত্রে এখনই ঋণ দেওয়া ঠিক হবে না।${flagLine}`,
  };
  const ratingColor = colorForRating(result.rating);
  const metrics = [
    { label: { bn: 'সুপারিশকৃত ঋণ', en: 'Recommended' }, val: fmtTk(recLoanAmt), sub: `${toBn(result.tenure)} মাসে`, color: T.teal },
    { label: { bn: 'মাসিক কিস্তি', en: 'Monthly EMI' }, val: fmtTk(emi), sub: `${toBn(result.tenure)} মাস`, color: T.gold },
    { label: { bn: 'ঝুঁকি স্তর', en: 'Risk tier' }, val: result.risk, sub: `Rating ${result.rating}`, color: ratingColor },
    { label: { bn: 'অসঙ্গতি', en: 'Discrepancies' }, val: toBn(result.flags.length), sub: result.flags.length === 0 ? 'পরিষ্কার' : 'পর্যালোচনা', color: result.flags.length === 0 ? T.green : T.coral },
  ];
  const probes = [
    { bn: 'গত ৬ মাসে কোনো কিস্তি কেন দেরি হয়েছিল?', en: 'Probe payment discipline history' },
    { bn: 'সবচেয়ে বেশি বিক্রি হয় এমন ৩টা জিনিস কী কী?', en: 'Verify stated market knowledge' },
    { bn: 'আশেপাশে অন্য কোন দোকান আছে, কেমন চলে?', en: 'Test business awareness claims' },
  ];
  return (
    <View>
      <View style={{
        backgroundColor: T.navy, borderRadius: 14, padding: 14, marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <FreyaOrb size={36} pulse={false} />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal,
              letterSpacing: 1.5, marginBottom: 3,
            }}>FREYA · পরামর্শ</Text>
            <Text style={{ fontFamily: T.fBn, fontSize: 12.5, color: 'rgba(255,255,255,0.92)', lineHeight: 21 }}>
              {freyaText[result.rating]}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {metrics.map((m, i) => (
          <View key={i} style={{
            width: '48%', flexGrow: 1,
            backgroundColor: '#fff',
            borderWidth: 1, borderColor: T.border,
            borderLeftWidth: 3, borderLeftColor: m.color,
            borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13,
          }}>
            <Text style={{ fontFamily: T.fBn, fontSize: 10, color: T.ink3, marginBottom: 3 }}>{m.label.bn}</Text>
            <Text style={{ fontFamily: T.fHead, fontSize: 18, color: m.color, lineHeight: 20 }}>{m.val}</Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, letterSpacing: 0.2, marginTop: 3 }}>{m.sub}</Text>
          </View>
        ))}
      </View>

      <View style={{
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <BilingualLabel bn="বসে একটু কথা বলুন এগুলো নিয়ে" en="Ask during interview" sizeBn={13} sizeEn={10} weight="700" />
        </View>
        {probes.map((p, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row', gap: 10,
              paddingVertical: 10,
              borderTopWidth: i > 0 ? 1 : 0, borderTopColor: T.border,
            }}>
            <View style={{
              width: 22, height: 22, borderRadius: 6,
              backgroundColor: T.goldBg,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: T.gold }}>{toBn(i + 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink, lineHeight: 19 }}>{p.bn}</Text>
              <Text style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontStyle: 'italic', marginTop: 2 }}>{p.en}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResultDims({ result }) {
  return (
    <View>
      <View style={{
        backgroundColor: '#fff', borderWidth: 1, borderColor: T.border,
        borderRadius: 14, padding: 14, marginBottom: 12,
      }}>
        <BilingualLabel bn="৭ মাত্রার স্কোর" en="7-dimension radar" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 6 }} />
        <RadarChart dimScores={result.dimScores} size={260} />
      </View>
      <View style={{
        backgroundColor: '#fff', borderWidth: 1, borderColor: T.border,
        borderRadius: 14, paddingHorizontal: 14,
      }}>
        {result.dimScores.map((d, i) => (
          <View key={d.id} style={{
            paddingVertical: 10,
            borderTopWidth: i > 0 ? 1 : 0, borderTopColor: T.border,
          }}>
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 5,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, color: d.color }}>{d.icon}</Text>
                <View>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink }}>{d.bn}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, letterSpacing: 0.3 }}>
                    {d.en.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: T.fHead, fontSize: 22, color: d.color }}>
                {toBn(d.pct)}
                <Text style={{ fontSize: 12 }}>%</Text>
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: T.cream2, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${d.pct}%`, height: '100%', backgroundColor: d.color }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProbeRow({ c, bn, en }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c, marginTop: 6 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: T.fBnBold, fontSize: 11.5, color: T.ink, lineHeight: 18 }}>{bn}</Text>
        <Text style={{ fontFamily: T.fBody, fontSize: 9.5, color: T.ink3, fontStyle: 'italic', lineHeight: 14 }}>{en}</Text>
      </View>
    </View>
  );
}

function ResultFlags({ result }) {
  const [expanded, setExpanded] = useState(null);

  if (result.flags.length === 0) {
    return (
      <View style={{
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: 'rgba(22,163,74,0.25)',
        borderRadius: 14, padding: 24, alignItems: 'center',
      }}>
        <Text style={{ fontSize: 42, marginBottom: 10 }}>✓</Text>
        <BilingualLabel bn="কোনো অসঙ্গতি নেই" en="No discrepancies found" sizeBn={15} sizeEn={11} weight="800" align="center" color={T.green} />
        <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3, marginTop: 8, lineHeight: 19, textAlign: 'center' }}>
          উত্তরে কোনো অসামঞ্জস্য বা সময়গত সন্দেহ পাওয়া যায়নি।
        </Text>
      </View>
    );
  }

  const typeColor = { inconsistent: T.violet, 'too-fast': T.amber, 'social-desirability': T.coral };
  const typeLabel = {
    inconsistent: { bn: 'অসামঞ্জস্যপূর্ণ', en: 'Inconsistent pair' },
    'too-fast': { bn: 'অতি দ্রুত উত্তর', en: 'Answered too fast' },
    'social-desirability': { bn: 'সামাজিক পক্ষপাত', en: 'Social desirability bias' },
  };

  return (
    <View>
      {/* Summary banner — tap to expand first item */}
      <Pressable
        onPress={() => setExpanded(expanded === 'summary' ? null : 'summary')}
        style={{
          backgroundColor: 'rgba(224,79,79,0.08)',
          borderWidth: 1, borderColor: 'rgba(224,79,79,0.25)',
          borderLeftWidth: 3, borderLeftColor: T.coral,
          borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink, marginBottom: 4 }}>
            ⚑ {toBn(result.flags.length)}টি অসঙ্গতি ধরা পড়েছে
          </Text>
          <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.ink2, lineHeight: 17 }}>
            এগুলো প্রত্যাখ্যানের কারণ নয় — সাক্ষাৎকারে অতিরিক্ত যাচাই প্রয়োজন।
          </Text>
        </View>
        <Text style={{ fontFamily: T.fMonoBold, fontSize: 16, color: T.coral, marginLeft: 8 }}>
          {expanded === 'summary' ? '▲' : '▼'}
        </Text>
      </Pressable>

      {result.flags.map((f, i) => {
        const c = typeColor[f.type] || T.amber;
        const tl = typeLabel[f.type] || { bn: f.type, en: f.type };
        const isOpen = expanded === i;
        return (
          <Pressable
            key={i}
            onPress={() => setExpanded(isOpen ? null : i)}
            style={{
              backgroundColor: '#fff',
              borderWidth: 1, borderColor: isOpen ? c : T.border,
              borderRadius: 12,
              marginBottom: 10,
              overflow: 'hidden',
            }}>
            {/* Header row */}
            <View style={{ padding: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 6,
                  }}>
                    <Chip color={c} size={9}>{tl.en.toUpperCase()}</Chip>
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4 }}>
                      Q{f.q?.slice(1) || '?'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink, lineHeight: 19, marginBottom: 2 }}>
                    {f.bn}
                  </Text>
                  <Text style={{ fontFamily: T.fBody, fontSize: 10.5, color: T.ink3, fontStyle: 'italic' }}>
                    {f.en}
                  </Text>
                </View>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 14, color: c, marginLeft: 10, marginTop: 18 }}>
                  {isOpen ? '▲' : '▼'}
                </Text>
              </View>
              {f.explanation?.bn ? (
                <View style={{
                  marginTop: 10,
                  backgroundColor: `${c}0D`,
                  borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 8,
                  borderLeftWidth: 2.5, borderLeftColor: c,
                }}>
                  {f.answerGiven && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
                      <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: T.ink, flex: 1 }}>
                        {f.answerGiven.bn}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: T.ink2, lineHeight: 18 }}>
                    {f.explanation.bn}
                  </Text>
                  <Text style={{ fontFamily: T.fBody, fontSize: 9.5, color: T.ink3, fontStyle: 'italic', marginTop: 3, lineHeight: 15 }}>
                    {f.explanation.en}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Expanded detail — interview probes */}
            {isOpen && (
              <View style={{
                borderTopWidth: 1, borderTopColor: `${c}33`,
                padding: 13,
              }}>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4, letterSpacing: 0.5, marginBottom: 8 }}>
                  সাক্ষাৎকারে জিজ্ঞেস করুন / INTERVIEW PROBE
                </Text>
                {f.type === 'too-fast' && (
                  <View style={{ gap: 6 }}>
                    <ProbeRow c={c} bn="উত্তর কি নিজে থেকে দিয়েছেন, নাকি কেউ পাশে ছিল?" en="Did you answer this yourself, or was someone nearby?" />
                    <ProbeRow c={c} bn="এই বিষয়ে আরেকটু বলুন — কীভাবে সিদ্ধান্ত নেন?" en="Tell me more — how do you usually decide this?" />
                  </View>
                )}
                {f.type === 'social-desirability' && (
                  <View style={{ gap: 6 }}>
                    <ProbeRow c={c} bn="একটা উদাহরণ দিন যখন আপনি সত্যিই এটা করেছেন।" en="Give a real example of when you actually did this." />
                    <ProbeRow c={c} bn="কখনো কি মনে হয়েছে এটা করা কঠিন ছিল?" en="Was there a time this felt difficult to follow through?" />
                  </View>
                )}
                {f.type === 'inconsistent' && (
                  <View style={{ gap: 6 }}>
                    <ProbeRow c={c} bn={`প্রশ্ন ${f.q?.slice(1)} ও ${f.pair?.slice(1)} — এই দুটো উত্তর কীভাবে একসাথে সত্যি?`} en={`How are both Q${f.q?.slice(1)} and Q${f.pair?.slice(1)} answers true at the same time?`} />
                    <ProbeRow c={c} bn="পরিস্থিতি বদলেছে, নাকি একটু ব্যাখ্যা করবেন?" en="Has something changed, or can you explain further?" />
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function ResultLoan({ result, applicant, recLoanAmt, emi }) {
  const items = [
    { bn: 'মেয়াদ', en: 'Tenure', val: `${toBn(result.tenure)} মাস`, c: T.gold },
    { bn: 'মাসিক কিস্তি', en: 'EMI', val: fmtTk(emi), c: T.teal },
    { bn: 'সার্ভিস চার্জ', en: 'Service charge', val: '১২%', c: T.ink2 },
    { bn: 'কিস্তি ফ্রিকোয়েন্সি', en: 'Frequency', val: 'সাপ্তাহিক', c: T.ink2 },
  ];
  const reasons = [
    result.overall >= 650
      ? `• মোট স্কোর ${toBn(result.overall)} — ভালো জায়গায় আছে`
      : `• মোট স্কোর ${toBn(result.overall)} — সাবধানে শুরু করি`,
    `• ${toBn(result.flags.length)}টা অসঙ্গতি ছিল, সেগুলোও ধরেছি`,
    `• সঞ্চয় ${fmtTk(applicant.savings)} — মাসের কিস্তি টেনে নিতে অসুবিধা হবে না`,
  ];
  return (
    <View>
      <View style={{
        backgroundColor: '#fff', borderWidth: 1, borderColor: T.border,
        borderRadius: 14, padding: 16, marginBottom: 12,
      }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14,
        }}>
          <BilingualLabel bn="ঋণ সুপারিশ" en="Loan recommendation" sizeBn={13} sizeEn={10} weight="700" />
          <Chip color={T.teal} size={9}>FREYA CALCULATED</Chip>
        </View>
        <View style={{
          flexDirection: 'row', gap: 14,
          paddingVertical: 14, paddingHorizontal: 16,
          backgroundColor: T.navy, borderRadius: 12, marginBottom: 12,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal, letterSpacing: 1.5 }}>
              REQUESTED
            </Text>
            <Text style={{ fontFamily: T.fHead, fontSize: 20, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
              {fmtTk(applicant.loanAsk)}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal, letterSpacing: 1.5 }}>
              RECOMMENDED
            </Text>
            <Text style={{ fontFamily: T.fHead, fontSize: 24, color: T.teal, marginTop: 4 }}>
              {fmtTk(recLoanAmt)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((x, i) => (
            <View key={i} style={{
              width: '48%', flexGrow: 1,
              paddingVertical: 10, paddingHorizontal: 12,
              backgroundColor: T.cream2, borderRadius: 10,
            }}>
              <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3 }}>{x.bn}</Text>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: x.c, marginTop: 3 }}>{x.val}</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, letterSpacing: 0.3, marginTop: 1 }}>{x.en}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{
        backgroundColor: '#fff', borderWidth: 1, borderColor: T.border,
        borderRadius: 14, padding: 14,
      }}>
        <BilingualLabel bn="কেন এই অঙ্কটা?" en="Why this amount?" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 10 }} />
        {reasons.map((t, i) => (
          <Text
            key={i}
            style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, lineHeight: 22, marginBottom: 4 }}>
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
}
