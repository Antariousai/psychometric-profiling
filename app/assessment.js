import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import { QUESTIONS } from '../data/questions';
import { PERSONA_BIAS } from '../data/personas';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';
import FreyaHint from '../components/FreyaHint';
import { bn as toBn } from '../utils/format';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchPsychometricQuestions,
  createAssessmentSession,
  saveAssessmentResponse,
  completeAssessmentSession,
  saveAssessmentResponsesBatch,
} from '../services/psympSupabase';

function speakText(text) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
}

function OptionList({ q, answered, onAnswer }) {
  return (
    <View style={{ gap: 10 }}>
      {q.options.map((opt, i) => {
        const sel = answered?.value === i;
        return (
          <Pressable
            key={i}
            onPress={() => onAnswer(i)}
            style={{
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
              <Text style={{
                fontFamily: T.fBody, fontSize: 10, color: T.ink3,
                fontStyle: 'italic', marginTop: 4, lineHeight: 14,
              }}>{opt.en}</Text>
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
  } = useApp();
  const [questions, setQuestions] = useState(QUESTIONS);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [idx, setIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState(persistedAnswers || {});
  const [freya, setFreya] = useState(false);
  const startAt = useRef(Date.now());
  const firstRender = useRef(true);
  /** Per-question rows FK to psychometric_questions — only sync when those IDs exist in Supabase. */
  const canPersistAnswersToDb = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingQuestions(true);
      setLoadError(null);
      let list = QUESTIONS;
      let session = null;
      let remoteQuestionCount = 0;
      try {
        if (isSupabaseConfigured) {
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
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || 'Supabase error');
        }
        list = QUESTIONS;
        session = null;
      }
      if (cancelled) return;
      canPersistAnswersToDb.current = Boolean(isSupabaseConfigured && remoteQuestionCount > 0);
      if (isSupabaseConfigured && remoteQuestionCount === 0) {
        console.warn(
          '[assessment] psychometric_questions is empty in Supabase — applicant/session still saved; '
          + 'run supabase/seed_questions.sql to persist per-question answers.',
        );
      }
      setQuestions(list);
      setAssessmentQuestions(list);
      setAssessmentSessionId(session?.sessionId ?? null);
      setAssessmentApplicantUuid(session?.applicantUuid ?? null);
      setIdx(0);
      setLoadingQuestions(false);
    })();
    return () => { cancelled = true; };
  }, [applicantId, setAssessmentQuestions, setAssessmentSessionId, setAssessmentApplicantUuid]);

  useEffect(() => { startAt.current = Date.now(); }, [idx]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setAnswers(localAnswers);
  }, [localAnswers]);

  const q = questions[idx];
  const dim = q ? dimensions.find(d => d.id === q.dim) : null;
  const progress = questions.length ? (idx + 1) / questions.length : 0;
  const answered = q ? localAnswers[q.id] : undefined;

  if (loadingQuestions || !q || !dim) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={T.teal} />
        {loadError ? (
          <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3, marginTop: 16, textAlign: 'center' }}>
            {loadError}{'\n'}ব্যবহার হচ্ছে অফলাইন প্রশ্নব্যাংক।
          </Text>
        ) : null}
      </View>
    );
  }

  const answer = (value) => {
    const ms = Date.now() - startAt.current;
    const next = { ...localAnswers, [q.id]: { value, ms } };
    setLocalAnswers(next);
    if (assessmentSessionId && canPersistAnswersToDb.current) {
      void saveAssessmentResponse(assessmentSessionId, q.id, value, ms);
    }
    const isLast = idx >= questions.length - 1;
    setTimeout(() => {
      if (!isLast) setIdx(idx + 1);
      else {
        if (assessmentSessionId) void completeAssessmentSession(assessmentSessionId);
        router.replace('/scoring');
      }
    }, 260);
  };

  const autoFill = () => {
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

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{
          bn: `প্রশ্ন ${toBn(idx + 1)} / ${toBn(questions.length)}`,
          en: `Question ${idx + 1} of ${questions.length}`,
        }}
        subtitle={`${dim.en.toUpperCase()} · ${dim.icon}`}
        onBack={() => (idx > 0 ? setIdx(idx - 1) : router.back())}
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
            numberOfLines={1}
            style={{ fontFamily: T.fBnBold, fontSize: 11, color: dim.color, flex: 1 }}>
            {dim.bn}
          </Text>
          <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: T.ink3 }}>
            {toBn(Math.round(progress * 100))}%
          </Text>
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
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
              borderWidth: 1, borderColor: T.border2,
              backgroundColor: pressed ? T.cream2 : '#fff',
              flexDirection: 'row', alignItems: 'center', gap: 6,
            })}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: T.ink2 }}>🔊 প্রশ্ন শুনুন</Text>
          </Pressable>
          <Chip color={T.ink4} size={9}>{q.type.toUpperCase()}</Chip>
          {q.socialDesirability ? <Chip color={T.violet} size={9}>CHECK ⚑</Chip> : null}
          {q.consistencyPair ? <Chip color={T.violet} size={9}>PAIR ⟷</Chip> : null}
        </View>

        {q.type === 'scale'
          ? <ScaleInput q={q} answered={answered} onAnswer={answer} />
          : <OptionList q={q} answered={answered} onAnswer={answer} />}
      </ScrollView>

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
            flex: 1, paddingVertical: 11, borderRadius: 10,
            borderWidth: 1, borderColor: T.border2,
            backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink3 }}>এড়িয়ে যান / Skip</Text>
        </Pressable>
        <Pressable
          onPress={autoFill}
          style={{
            flex: 2, paddingVertical: 11, borderRadius: 10,
            backgroundColor: T.gold,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: '#fff' }}>
            ⚡ ডেমো: সব পূরণ করুন
          </Text>
        </Pressable>
      </View>

      <FreyaButton onPress={() => setFreya(v => !v)} />
      {freya ? <FreyaHint q={q} onClose={() => setFreya(false)} /> : null}
    </View>
  );
}
