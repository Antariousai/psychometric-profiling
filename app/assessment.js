import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Platform, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import { QUESTIONS } from '../data/questions';
import { PERSONA_BIAS } from '../data/personas';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';
import FreyaHint from '../components/FreyaHint';
import { SyncQueueBanner } from '../components/Banners';
import { bn as toBn } from '../utils/format';
import { load, save, K } from '../utils/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchPsychometricQuestions,
  createAssessmentSession,
  saveAssessmentResponse,
  completeAssessmentSession,
  saveAssessmentResponsesBatch,
} from '../services/psympSupabase';
import {
  assembleProttoyForm,
  selectProttoyFollowups,
  saveProttoyResponse,
  strippedItemToQuestion,
} from '../services/prottoySupabase';
import { isProttoyBankEnabled } from '../lib/prottoyFlags';

const AVG_MINUTES_PER_QUESTION = 0.35;
const PROTTOY_DIM = { id: 'prottoy', bn: 'প্রত্যয়', en: 'Prottoy', color: T.teal, icon: '◇' };

function speakText(text) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
}

function OptionList({ q, answered, onAnswer, useOptionIds = false }) {
  return (
    <View style={{ gap: 10 }}>
      {q.options.map((opt, i) => {
        const optionKey = useOptionIds ? (opt.id ?? String(i)) : i;
        const sel = useOptionIds
          ? answered?.optionId === opt.id
          : answered?.value === i;
        return (
          <Pressable
            key={opt.id || i}
            onPress={() => onAnswer(optionKey)}
            style={{
              minHeight: 48,
              paddingVertical: 14, paddingHorizontal: 16,
              backgroundColor: sel ? T.tealBg : '#fff',
              borderWidth: sel ? 2 : 1.5,
              borderColor: sel ? T.teal : T.border,
              borderRadius: 14,
              flexDirection: 'row', alignItems: 'center', gap: 13,
              shadowColor: sel ? T.teal : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: sel ? 0.18 : 0.03,
              shadowRadius: sel ? 10 : 2,
              elevation: sel ? 3 : 1,
            }}>
            <View style={{
              width: 30, height: 30, borderRadius: 8,
              backgroundColor: sel ? T.teal : T.cream2,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontFamily: T.fMonoBold, fontSize: 13,
                color: sel ? '#fff' : T.ink3,
              }}>
                {sel ? '✓' : String.fromCharCode(65 + i)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: sel ? T.fBnBold : T.fBn, fontSize: 14,
                color: T.ink, lineHeight: 22,
              }}>{opt.bn}</Text>
              {opt.en ? (
                <Text style={{
                  fontFamily: T.fBody, fontSize: 10, color: T.ink3,
                  fontStyle: 'italic', marginTop: 4, lineHeight: 14,
                }}>{opt.en}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScaleInput({ q, answered, onAnswer }) {
  const current = answered?.value ?? null;
  const max = q.scale.max;
  const min = q.scale.min;
  const steps = q.scale.steps || [];

  return (
    <View style={{
      backgroundColor: '#fff',
      borderWidth: 1.5, borderColor: T.border, borderRadius: 14,
      paddingVertical: 18, paddingHorizontal: 12,
    }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: max - min + 1 }).map((_, i) => {
          const val = min + i;
          const on = current === val;
          const frac = i / (max - min);
          const hue = 170 - frac * 50;
          const bgOn = `hsl(${hue}, 65%, 50%)`;
          const bgOff = `hsla(${hue}, 65%, 50%, 0.12)`;
          const label = steps[i] || toBn(val);
          return (
            <Pressable
              key={val}
              onPress={() => onAnswer(val)}
              style={{
                flex: 1,
                minHeight: 72,
                borderRadius: 12,
                backgroundColor: on ? bgOn : bgOff,
                borderWidth: on ? 0 : 1,
                borderColor: `hsla(${hue}, 65%, 50%, 0.3)`,
                alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 4, paddingVertical: 10,
                shadowColor: bgOn, shadowOffset: { width: 0, height: 4 }, shadowOpacity: on ? 0.4 : 0, shadowRadius: 10, elevation: on ? 4 : 0,
                transform: [{ translateY: on ? -2 : 0 }],
              }}>
              <Text style={{
                fontFamily: T.fBnBold,
                fontSize: 10,
                color: on ? '#fff' : `hsl(${hue}, 60%, 38%)`,
                textAlign: 'center',
                lineHeight: 15,
              }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 2 }}>
        <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4 }}>{q.scale.minEn}</Text>
        <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4 }}>{q.scale.maxEn}</Text>
      </View>
    </View>
  );
}

export default function AssessmentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const {
    answers: persistedAnswers,
    setAnswers,
    applicantId,
    applicant,
    assessmentSessionId,
    setAssessmentSessionId,
    setAssessmentApplicantUuid,
    setAssessmentQuestions,
    dimensions,
    pendingSync,
    flushSyncAndRefresh,
    prottoyCategory,
    prottoyConsentAccepted,
  } = useApp();
  const prottoyOn = isProttoyBankEnabled();
  const [questions, setQuestions] = useState(QUESTIONS);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [idx, setIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState(persistedAnswers || {});
  const [freya, setFreya] = useState(false);
  const [resetSessionKey, setResetSessionKey] = useState(0);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [coreDone, setCoreDone] = useState(false);
  const justSavedTimer = useRef(null);
  const startAt = useRef(Date.now());
  const firstRender = useRef(true);
  const canPersistAnswersToDb = useRef(false);
  const resumeDismissed = useRef(false);
  const sessionIdRef = useRef(assessmentSessionId);
  sessionIdRef.current = assessmentSessionId;

  useEffect(() => {
    resumeDismissed.current = false;
  }, [applicantId, resetSessionKey]);

  useEffect(() => {
    if (prottoyOn && !prottoyConsentAccepted) {
      router.replace('/consent');
    }
  }, [prottoyOn, prottoyConsentAccepted]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingQuestions(true);
      setLoadError(null);
      setCoreDone(false);
      let list = QUESTIONS;
      let session = null;
      let remoteQuestionCount = 0;
      try {
        if (prottoyOn && isSupabaseConfigured) {
          let sid = assessmentSessionId;
          if (!sid) {
            try {
              session = await createAssessmentSession(applicantId, applicant);
              sid = session?.sessionId ?? null;
              if (!cancelled) {
                setAssessmentSessionId(sid);
                setAssessmentApplicantUuid(session?.applicantUuid ?? null);
              }
            } catch (e) {
              if (!cancelled) setLoadError(e?.message || 'Could not create session');
            }
          }
          if (sid) {
            const assembled = await assembleProttoyForm(sid, prottoyCategory || 'JAG');
            list = (assembled.items || []).map((it) => strippedItemToQuestion(it, { isFollowup: false }));
            remoteQuestionCount = list.length;
            canPersistAnswersToDb.current = list.length === 40;
          } else {
            throw new Error('Prottoy requires a server session + assemble-form');
          }
        } else if (isSupabaseConfigured) {
          let remote = [];
          try {
            remote = await fetchPsychometricQuestions();
          } catch (qe) {
            if (!cancelled) setLoadError(qe?.message || 'Could not load questions from Supabase');
          }
          remoteQuestionCount = remote.length;
          if (!cancelled && remote.length > 0) {
            list = remote;
          } else {
            list = QUESTIONS;
          }
          try {
            session = await createAssessmentSession(applicantId, applicant);
          } catch {
            session = null;
          }
          canPersistAnswersToDb.current = Boolean(isSupabaseConfigured && remoteQuestionCount > 0);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || 'Supabase error');
        }
        if (!prottoyOn) {
          list = QUESTIONS;
          session = null;
        }
      }
      if (cancelled) return;
      if (!prottoyOn && isSupabaseConfigured && remoteQuestionCount === 0) {
        console.warn(
          '[assessment] psychometric_questions is empty in Supabase — applicant/session still saved; '
          + 'run supabase/seed_questions.sql to persist per-question answers.',
        );
      }
      setQuestions(list);
      setAssessmentQuestions(list);
      if (session?.sessionId) {
        setAssessmentSessionId(session.sessionId);
        setAssessmentApplicantUuid(session.applicantUuid ?? null);
      }
      setIdx(0);
      setLoadingQuestions(false);
    })();
    return () => { cancelled = true; };
  }, [applicantId, resetSessionKey, setAssessmentQuestions, setAssessmentSessionId, setAssessmentApplicantUuid, prottoyOn, prottoyCategory]);

  useEffect(() => { startAt.current = Date.now(); }, [idx]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setAnswers(localAnswers);
  }, [localAnswers, setAnswers]);

  const answeredInBank = useCallback((list, ans) => {
    if (!list.length) return 0;
    return list.filter(qq => ans[qq.id]).length;
  }, []);

  useEffect(() => {
    if (loadingQuestions || !questions.length) return;
    let cancelled = false;
    (async () => {
      if (resumeDismissed.current) return;
      const draft = await load(K.assessmentDraftApplicant, null);
      const n = answeredInBank(questions, localAnswers);
      if (cancelled) return;
      if (draft !== applicantId || n === 0 || n >= questions.length) return;
      setResumeOpen(true);
    })();
    return () => { cancelled = true; };
    // Omit localAnswers from deps — only run when bank/session is ready; avoids opening modal after first answer in a new run.
  }, [loadingQuestions, questions, applicantId, resetSessionKey, answeredInBank]);

  const answeredCount = answeredInBank(questions, localAnswers);
  const estMinutesLeft = Math.max(0, Math.round((questions.length - answeredCount) * AVG_MINUTES_PER_QUESTION));

  const incompleteLeave = questions.length > 0 && answeredInBank(questions, localAnswers) < questions.length
    && Object.keys(localAnswers).length > 0;

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (!incompleteLeave) return;
      e.preventDefault();
      Alert.alert(
        'মূল্যায়ন থেকে বের হবেন?',
        'উত্তরগুলো ডিভাইসে সংরক্ষিত আছে — পরে একই আবেদনকারীর জন্য চালিয়ে যেতে পারবেন।',
        [
          { text: 'থাকুন', style: 'cancel' },
          {
            text: 'বের হোন',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return sub;
  }, [navigation, incompleteLeave]);

  const requestBack = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      return;
    }
    if (!incompleteLeave) {
      router.back();
      return;
    }
    Alert.alert(
      'মূল্যায়ন বন্ধ করবেন?',
      'উত্তর সংরক্ষিত আছে। পরে চালিয়ে যেতে পারবেন।',
      [
        { text: 'থাকুন', style: 'cancel' },
        { text: 'বের হোন', style: 'destructive', onPress: () => router.back() },
      ],
    );
  };

  const flashSaved = () => {
    if (justSavedTimer.current) clearTimeout(justSavedTimer.current);
    setJustSaved(true);
    justSavedTimer.current = setTimeout(() => setJustSaved(false), 1600);
  };

  const q = questions[idx];
  const dim = prottoyOn
    ? PROTTOY_DIM
    : (q ? dimensions.find(d => d.id === q.dim) : null);
  const progress = questions.length ? (idx + 1) / questions.length : 0;
  const answered = q ? localAnswers[q.id] : undefined;

  if (loadingQuestions || !q || !dim) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={T.teal} />
        {loadError ? (
          <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3, marginTop: 16, textAlign: 'center' }}>
            {loadError}{'\n'}{prottoyOn ? 'Prottoy bank/session required.' : 'ব্যবহার হচ্ছে অফলাইন প্রশ্নব্যাংক।'}
          </Text>
        ) : null}
      </View>
    );
  }

  const continuePartial = () => {
    resumeDismissed.current = true;
    setResumeOpen(false);
    const firstMissing = questions.findIndex(qq => !localAnswers[qq.id]);
    if (firstMissing >= 0) setIdx(firstMissing);
  };

  const startFresh = () => {
    resumeDismissed.current = true;
    setResumeOpen(false);
    setLocalAnswers({});
    setAnswers({});
    void save(K.assessmentDraftApplicant, applicantId);
    setResetSessionKey(k => k + 1);
    setIdx(0);
  };

  const finishAssessment = () => {
    if (prottoyOn) {
      router.replace('/completion');
      return;
    }
    if (assessmentSessionId) void completeAssessmentSession(assessmentSessionId);
    router.replace('/scoring');
  };

  const loadFollowupsThenContinue = async () => {
    const sid = sessionIdRef.current || assessmentSessionId;
    if (!sid) {
      finishAssessment();
      return;
    }
    try {
      const fu = await selectProttoyFollowups(sid);
      const more = (fu.items || []).map((it) => strippedItemToQuestion(it, { isFollowup: true }));
      setQuestions((prev) => {
        const next = [...prev, ...more];
        setAssessmentQuestions(next);
        return next;
      });
      setCoreDone(true);
      setIdx((i) => i + 1);
    } catch (e) {
      Alert.alert('Follow-ups', e?.message || 'Could not load follow-ups');
      finishAssessment();
    }
  };

  const answer = (value) => {
    const ms = Date.now() - startAt.current;
    if (prottoyOn) {
      const optionId = typeof value === 'string' ? value : q.options?.[value]?.id;
      const next = { ...localAnswers, [q.id]: { optionId, ms } };
      setLocalAnswers(next);
      void save(K.assessmentDraftApplicant, applicantId);
      flashSaved();
      const sid = sessionIdRef.current || assessmentSessionId;
      if (sid && optionId) {
        void saveProttoyResponse(sid, q.id, optionId, ms, {
          isFollowup: Boolean(q.isFollowup),
          position: idx + 1,
        });
      }
      const isLast = idx >= questions.length - 1;
      const atCoreEnd = !coreDone && questions.length === 40 && idx === 39;
      setTimeout(() => {
        if (atCoreEnd) {
          void loadFollowupsThenContinue();
        } else if (!isLast) {
          setIdx(idx + 1);
        } else {
          finishAssessment();
        }
      }, 260);
      return;
    }

    const next = { ...localAnswers, [q.id]: { value, ms } };
    setLocalAnswers(next);
    void save(K.assessmentDraftApplicant, applicantId);
    flashSaved();
    if (assessmentSessionId && canPersistAnswersToDb.current) {
      void saveAssessmentResponse(assessmentSessionId, q.id, value, ms);
    }
    const isLast = idx >= questions.length - 1;
    setTimeout(() => {
      if (!isLast) setIdx(idx + 1);
      else finishAssessment();
    }, 260);
  };

  const autoFill = () => {
    if (prottoyOn) {
      Alert.alert('Prottoy', 'Auto-fill is disabled on the Prottoy path.');
      return;
    }
    const bias = PERSONA_BIAS[applicantId] || 0.7;
    const all = {};
    questions.forEach(qq => {
      let val;
      if (qq.type === 'scale') {
        val = Math.round(qq.scale.min + bias * (qq.scale.max - qq.scale.min) + (Math.random() - 0.5));
        val = Math.max(qq.scale.min, Math.min(qq.scale.max, val));
      } else {
        const sorted = qq.options.map((o, j) => ({ o, j })).sort((a, b) => b.o.score - a.o.score);
        const pick = Math.min(sorted.length - 1, Math.floor((1 - bias) * sorted.length + Math.random() * 1.5));
        val = sorted[pick].j;
      }
      const msBase = qq.expectedMs || 4000;
      const msMult = applicantId === 'rafiq' ? 0.2 + Math.random() * 0.6 : 0.6 + Math.random() * 0.8;
      all[qq.id] = { value: val, ms: Math.round(msBase * msMult) };
    });
    setLocalAnswers(all);
    setAnswers(all);
    if (assessmentSessionId && canPersistAnswersToDb.current) {
      void saveAssessmentResponsesBatch(assessmentSessionId, all);
      void completeAssessmentSession(assessmentSessionId);
    } else if (assessmentSessionId) {
      void completeAssessmentSession(assessmentSessionId);
    }
    router.replace('/scoring');
  };

  const onSyncPress = async () => {
    setSyncing(true);
    try {
      await flushSyncAndRefresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      {isSupabaseConfigured && pendingSync > 0 ? (
        <SyncQueueBanner
          pendingSync={pendingSync}
          onSyncPress={onSyncPress}
          syncing={syncing}
        />
      ) : null}

      <BrandHeader
        title={{
          bn: `প্রশ্ন ${toBn(idx + 1)} / ${toBn(questions.length)}`,
          en: `Question ${idx + 1} of ${questions.length}`,
        }}
        subtitle={`${dim.en.toUpperCase()} · ${dim.icon}`}
        onBack={requestBack}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#fff' }}>
        <View style={{
          height: 5, backgroundColor: T.cream2,
          borderRadius: 3, overflow: 'hidden',
          flexDirection: 'row',
        }}>
          {questions.map((qq, i) => {
            const d = dimensions.find(dd => dd.id === qq.dim);
            return (
              <View key={i} style={{
                flex: 1,
                marginRight: i < questions.length - 1 ? 1 : 0,
                backgroundColor: i <= idx ? (d?.color || T.teal) : 'transparent',
                opacity: i === idx ? 1 : i < idx ? 0.85 : 0,
              }} />
            );
          })}
        </View>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', paddingVertical: 12, gap: 12,
        }}>
          <Text
            numberOfLines={2}
            style={{ fontFamily: T.fBnBold, fontSize: 11, color: dim.color, flex: 1 }}>
            {dim.bn}
          </Text>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: T.ink3 }}>
              {toBn(Math.round(progress * 100))}%
            </Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4 }}>
              {prottoyOn ? (q.isFollowup ? 'FOLLOW-UP' : 'CORE') : `~${toBn(estMinutesLeft)} মিন বাকি`}
            </Text>
          </View>
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 10,
        }}>
          <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4 }}>
            উত্তর {toBn(answeredCount)}/{toBn(questions.length)} · Saved on device
          </Text>
          {justSaved ? (
            <Chip color={T.teal} size={8}>✓ সংরক্ষিত</Chip>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          alignSelf: 'flex-start',
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 6, paddingHorizontal: 12,
          borderRadius: 20,
          backgroundColor: `${dim.color}26`,
          borderWidth: 1, borderColor: `${dim.color}66`,
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 12, color: dim.color }}>{dim.icon}</Text>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: dim.color }}>{dim.bn}</Text>
          <Text style={{ fontFamily: T.fMono, fontSize: 9, color: dim.color, opacity: 0.7, letterSpacing: 0.5 }}>
            {dim.en.toUpperCase()}
          </Text>
        </View>

        <View style={{ marginBottom: 22 }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 19, color: T.navy, lineHeight: 28, marginBottom: 8 }}>
            {q.bn}
          </Text>
          <Text style={{ fontFamily: T.fBody, fontSize: 12.5, color: T.ink3, fontStyle: 'italic', lineHeight: 19 }}>
            {q.en}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => speakText(q.bn)}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
              borderWidth: 1, borderColor: T.border2,
              backgroundColor: pressed ? T.cream2 : '#fff',
              flexDirection: 'row', alignItems: 'center', gap: 6,
            })}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: T.ink2 }}>🔊 প্রশ্ন শুনুন</Text>
          </Pressable>
          <Chip color={T.ink4} size={9}>{(q.format || q.type || 'Q').toUpperCase()}</Chip>
          {!prottoyOn && q.socialDesirability ? <Chip color={T.violet} size={9}>CHECK ⚑</Chip> : null}
          {!prottoyOn && q.consistencyPair ? <Chip color={T.violet} size={9}>PAIR ⟷</Chip> : null}
        </View>

        {q.type === 'scale' && !prottoyOn
          ? <ScaleInput q={q} answered={answered} onAnswer={answer} />
          : <OptionList q={q} answered={answered} onAnswer={answer} useOptionIds={prottoyOn} />}
      </ScrollView>

      {!prottoyOn ? (
      <View style={{
        paddingVertical: 10, paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: T.border,
        flexDirection: 'row', gap: 8,
      }}>
        <Pressable
          onPress={() => {
            if (idx < questions.length - 1) setIdx(idx + 1);
            else {
              if (assessmentSessionId) void completeAssessmentSession(assessmentSessionId);
              router.replace('/scoring');
            }
          }}
          style={{
            flex: 1, minHeight: 48, paddingVertical: 11, borderRadius: 10,
            borderWidth: 1, borderColor: T.border2,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink3 }}>এড়িয়ে যান / Skip</Text>
        </Pressable>
        <Pressable
          onPress={autoFill}
          style={{
            flex: 2, minHeight: 48, paddingVertical: 11, borderRadius: 10,
            backgroundColor: T.gold,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: '#fff' }}>
            ⚡ ডেমো: সব পূরণ করুন
          </Text>
        </Pressable>
      </View>
      ) : null}

      {!prottoyOn ? <FreyaButton onPress={() => setFreya(v => !v)} /> : null}
      {!prottoyOn && freya ? <FreyaHint q={q} onClose={() => setFreya(false)} /> : null}

      <Modal visible={resumeOpen} transparent animationType="fade" onRequestClose={() => setResumeOpen(false)}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center', paddingHorizontal: 22,
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 18, padding: 22,
            borderWidth: 1, borderColor: T.border,
          }}>
            <Text style={{ fontFamily: T.fBnBlack, fontSize: 17, color: T.navy, marginBottom: 8 }}>
              আগের মূল্যায়ন চালিয়ে যাবেন?
            </Text>
            <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink2, lineHeight: 21, marginBottom: 8 }}>
              এই আবেদনকারীর জন্য {toBn(answeredCount)}টি উত্তর আগেই সংরক্ষিত আছে।
            </Text>
            <Text style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink4, fontStyle: 'italic', marginBottom: 20 }}>
              Continue saved session or start fresh (clears answers on this device).
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={startFresh}
                style={{
                  flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 12,
                  borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center',
                }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink2 }}>নতুন করে</Text>
              </Pressable>
              <Pressable
                onPress={continuePartial}
                style={{
                  flex: 1.2, minHeight: 48, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center',
                }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>চালিয়ে যান</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
