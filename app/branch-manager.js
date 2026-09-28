import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import AudienceLogin from '../components/AudienceLogin';
import { branchManagerClient } from '../lib/audienceClient';
import { isManagerRole } from '../lib/prottoyFlags';
import {
  fetchAudienceRole,
  fetchOverallScores,
  signInAudience,
  signOutAudience,
} from '../services/audienceScores';

function scoreOf(row) {
  return Array.isArray(row.prottoy_scores) ? row.prottoy_scores[0] : row.prottoy_scores;
}

function applicantName(row) {
  return row.applicants?.profile?.name || row.applicants?.slug || row.applicant_id || '—';
}

export default function BranchManagerScreen() {
  const router = useRouter();
  const client = branchManagerClient();
  const [phase, setPhase] = useState('checking');
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!client) {
      setError('Supabase is not configured.');
      setPhase('login');
      return;
    }
    const profile = await fetchAudienceRole(client);
    if (!profile || !isManagerRole(profile.role)) {
      if (profile) await signOutAudience(client);
      setPhase('login');
      return;
    }
    const data = await fetchOverallScores(client);
    setRows(data);
    setPhase('ready');
  }, [client]);

  useEffect(() => {
    load().catch((e) => {
      setError(e?.message || 'Could not load scores');
      setPhase('login');
    });
  }, [load]);

  const onSubmit = async (email, password) => {
    setBusy(true);
    setError(null);
    try {
      await signInAudience(client, email, password);
      const profile = await fetchAudienceRole(client);
      if (!profile || !isManagerRole(profile.role)) {
        await signOutAudience(client);
        setError('This account cannot view branch scores.');
        return;
      }
      const data = await fetchOverallScores(client);
      setRows(data);
      setPhase('ready');
    } catch (e) {
      setError(e?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    await signOutAudience(client);
    setRows([]);
    setOpenId(null);
    setPhase('login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'শাখা ব্যবস্থাপক', en: 'Branch manager' }}
        subtitle="Overall score"
        onBack={() => router.back()}
      />
      {phase === 'checking' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.teal} />
        </View>
      ) : null}
      {phase === 'login' ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <AudienceLogin
            titleBn="স্কোর দেখুন"
            titleEn="Branch manager sign-in"
            hint="শুধু শাখা ব্যবস্থাপকের অ্যাকাউন্ট সামগ্রিক স্কোর দেখতে পারে। মাঠকর্মী এই পাতায় ঢুকতে পারবেন না।"
            busy={busy}
            error={error}
            onSubmit={onSubmit}
          />
        </ScrollView>
      ) : null}
      {phase === 'ready' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Pressable onPress={onSignOut} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
            <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink3 }}>Sign out</Text>
          </Pressable>
          {rows.length === 0 ? (
            <Text style={{ fontFamily: T.fBn, color: T.ink3, textAlign: 'center', marginTop: 32 }}>
              এখনো কোনো স্কোর নেই।
            </Text>
          ) : null}
          {rows.map((row) => {
            const score = scoreOf(row);
            const open = openId === row.id;
            return (
              <Pressable
                key={row.id}
                onPress={() => setOpenId(open ? null : row.id)}
                style={{
                  backgroundColor: '#fff',
                  borderWidth: 1.5,
                  borderColor: open ? T.teal : T.border,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: T.navy }}>{applicantName(row)}</Text>
                <Text style={{ fontFamily: T.fMono, fontSize: 10, color: T.ink4, marginTop: 4 }}>
                  {row.prottoy_category || '—'} · {String(row.created_at || '').slice(0, 10)}
                </Text>
                <Text style={{ fontFamily: T.fHead, fontSize: 28, color: T.navy, marginTop: 8 }}>
                  {score?.ps != null ? score.ps : '—'}
                </Text>
                <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.teal }}>
                  Overall PS · Band {score?.band || '—'}
                </Text>
                {open && score ? (
                  <View style={{ marginTop: 12, gap: 4 }}>
                    <Text style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2 }}>WI {score.wi1000 ?? '—'}</Text>
                    <Text style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2 }}>SRI {score.sri1000 ?? '—'}</Text>
                    <Text style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2 }}>
                      VI {score.vi != null ? Number(score.vi).toFixed(2) : '—'} ({score.vi_band || '—'})
                    </Text>
                    <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.navy, marginTop: 6 }}>
                      {score.recommendation || 'No recommendation yet'}
                    </Text>
                  </View>
                ) : null}
                {open && !score ? (
                  <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.amber, marginTop: 8 }}>
                    স্কোর এখনো তৈরি হয়নি।
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
