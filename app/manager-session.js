import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import PrimaryBtn from '../components/PrimaryBtn';
import { useApp } from '../context/AppContext';
import { isManagerRole, normalizeStaffRole } from '../lib/prottoyFlags';
import {
  fetchProttoyScore,
  fetchStaffProfile,
  saveProttoyDecision,
} from '../services/prottoySupabase';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const OUTCOMES = ['APPROVE', 'APPROVE_SMALLER', 'PROBE', 'COMMITTEE', 'RETEST', 'DECLINE'];

export default function ManagerSessionScreen() {
  const { id } = useLocalSearchParams();
  const sessionId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
  const router = useRouter();
  const { staffRole } = useApp();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [outcome, setOutcome] = useState('PROBE');
  const [notes, setNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await fetchStaffProfile();
      const role = normalizeStaffRole(profile?.role || staffRole);
      if (!isManagerRole(role)) {
        if (!cancelled) {
          setAllowed(false);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setAllowed(true);
      const s = await fetchProttoyScore(sessionId);
      if (!cancelled) setScore(s);
      if (isSupabaseConfigured && supabase && sessionId) {
        const { data } = await supabase
          .from('assessment_sessions')
          .select('id, applicant_id, prottoy_category, prottoy_status, created_at, applicants(profile)')
          .eq('id', sessionId)
          .maybeSingle();
        if (!cancelled) setSessionMeta(data);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessionId, staffRole]);

  const submit = async () => {
    if (!sessionId) return;
    const recommended = score?.recommendation || null;
    const isOverride = recommended && outcome !== recommended;
    if (isOverride && !overrideReason.trim()) {
      Alert.alert('Override', 'Override reason required when outcome ≠ recommended.');
      return;
    }
    setSaving(true);
    try {
      await saveProttoyDecision({
        sessionId,
        outcome,
        recommended,
        override: Boolean(isOverride),
        overrideReason: isOverride ? overrideReason.trim() : null,
        notes: notes.trim() || null,
      });
      Alert.alert('Saved', 'Decision recorded.');
      router.back();
    } catch (e) {
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={T.teal} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontFamily: T.fBnBold, fontSize: 16, color: T.coral }}>Access denied</Text>
        <Text style={{ fontFamily: T.fBn, marginTop: 8, color: T.ink2 }}>
          Field officers cannot view Prottoy scores.
        </Text>
        <PrimaryBtn label={{ bn: 'ফিরে যান', en: 'Back' }} onPress={() => router.back()} />
      </View>
    );
  }

  const name = sessionMeta?.applicants?.profile?.name || sessionMeta?.applicant_id || sessionId;
  const flags = Array.isArray(score?.flags) ? score.flags : [];
  const reasons = Array.isArray(score?.reason_codes) ? score.reason_codes : [];

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'সিদ্ধান্ত', en: 'Decision' }}
        subtitle={sessionMeta?.prottoy_category || 'PROTTOY'}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ fontFamily: T.fBnBold, fontSize: 18, color: T.navy, marginBottom: 4 }}>{name}</Text>
        <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginBottom: 16 }}>
          {sessionMeta?.prottoy_status} · {sessionId}
        </Text>

        {!score ? (
          <View style={{
            backgroundColor: T.amberBg || '#FFF8E7',
            borderRadius: 12, padding: 14, marginBottom: 16,
          }}>
            <Text style={{ fontFamily: T.fBn, color: T.ink2, lineHeight: 20 }}>
              স্কোর এখনো নেই। Engine pack (`reference/engine.ts` + keys) প্রয়োজন — stub স্কোর তৈরি করে না।
            </Text>
          </View>
        ) : (
          <View style={{
            backgroundColor: '#fff', borderWidth: 1.5, borderColor: T.border,
            borderRadius: 14, padding: 16, marginBottom: 16,
          }}>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: T.ink4, letterSpacing: 1.5, marginBottom: 10 }}>
              SCORES (MANAGER ONLY)
            </Text>
            <Text style={{ fontFamily: T.fDisplay || T.fBnBlack, fontSize: 36, color: T.navy }}>
              PS {score.ps ?? '—'}
            </Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2, marginTop: 6 }}>
              Band {score.band || '—'} · WI {score.wi1000 ?? '—'} · SRI {score.sri1000 ?? '—'}
            </Text>
            <Text style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2, marginTop: 4 }}>
              VI {score.vi != null ? Number(score.vi).toFixed(3) : '—'} ({score.vi_band || '—'})
            </Text>
            {score.recommendation ? (
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.teal, marginTop: 10 }}>
                Recommended: {score.recommendation}
              </Text>
            ) : null}
            {flags.length ? (
              <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.coral, marginTop: 10 }}>
                Flags: {flags.join(', ')}
              </Text>
            ) : null}
            {reasons.length ? (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4 }}>REASON CODES</Text>
                {reasons.map((rc, i) => (
                  <Text key={i} style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, marginTop: 4 }}>
                    · {typeof rc === 'string' ? rc : JSON.stringify(rc)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4, letterSpacing: 1.2, marginBottom: 8 }}>
          HUMAN DECISION
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {OUTCOMES.map((o) => {
            const on = outcome === o;
            return (
              <Pressable
                key={o}
                onPress={() => setOutcome(o)}
                style={{
                  paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                  backgroundColor: on ? T.navy : '#fff',
                  borderWidth: 1, borderColor: on ? T.navy : T.border,
                }}
              >
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: on ? '#fff' : T.ink2 }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>

        {score?.recommendation && outcome !== score.recommendation ? (
          <TextInput
            value={overrideReason}
            onChangeText={setOverrideReason}
            placeholder="Override reason (required)"
            placeholderTextColor={T.ink4}
            style={{
              backgroundColor: '#fff', borderWidth: 1.5, borderColor: T.coral,
              borderRadius: 12, padding: 12, fontFamily: T.fBn, fontSize: 13,
              color: T.ink, marginBottom: 12, minHeight: 48,
            }}
          />
        ) : null}

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={T.ink4}
          multiline
          style={{
            backgroundColor: '#fff', borderWidth: 1.5, borderColor: T.border,
            borderRadius: 12, padding: 12, fontFamily: T.fBn, fontSize: 13,
            color: T.ink, marginBottom: 16, minHeight: 80, textAlignVertical: 'top',
          }}
        />

        <PrimaryBtn
          label={{ bn: 'সিদ্ধান্ত সংরক্ষণ', en: 'Save decision' }}
          onPress={submit}
          disabled={saving}
        />
      </ScrollView>
    </View>
  );
}
