import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import AudienceLogin from '../components/AudienceLogin';
import { antariousClient } from '../lib/audienceClient';
import { isAntariousRole } from '../lib/prottoyFlags';
import {
  BANDS,
  CONSTRUCTS,
  ENGINE_VERSION,
  FORMULA_STEPS,
  RECOMMENDATIONS,
  SIGNALS,
  VI_BANDS,
} from '../lib/prottoyScoringGuide';
import {
  fetchAudienceRole,
  fetchOverallScores,
  fetchScoreDetail,
  signInAudience,
  signOutAudience,
} from '../services/audienceScores';

function Card({ title, children }) {
  return (
    <View style={{
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: T.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    }}>
      <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: T.ink4, letterSpacing: 1, marginBottom: 8 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function applicantName(row) {
  return row.applicants?.profile?.name || row.applicants?.slug || row.applicant_id || '—';
}

export default function AntariousLabScreen() {
  const router = useRouter();
  const client = antariousClient();
  const [phase, setPhase] = useState('checking');
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!client) {
      setError('Supabase is not configured.');
      setPhase('login');
      return;
    }
    const profile = await fetchAudienceRole(client);
    if (!profile || !isAntariousRole(profile.role)) {
      if (profile) await signOutAudience(client);
      setPhase('login');
      return;
    }
    setRows(await fetchOverallScores(client));
    setPhase('ready');
  }, [client]);

  useEffect(() => {
    load().catch((e) => {
      setError(e?.message || 'Could not open the lab');
      setPhase('login');
    });
  }, [load]);

  const onSubmit = async (email, password) => {
    setBusy(true);
    setError(null);
    try {
      await signInAudience(client, email, password);
      const profile = await fetchAudienceRole(client);
      if (!profile || !isAntariousRole(profile.role)) {
        await signOutAudience(client);
        setError('This account is not on the Antarious scoring team.');
        return;
      }
      setRows(await fetchOverallScores(client));
      setPhase('ready');
    } catch (e) {
      setError(e?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const openSession = async (row) => {
    setPicked(row.id);
    setDetail(null);
    try {
      setDetail(await fetchScoreDetail(client, row.id));
    } catch (e) {
      setError(e?.message || 'Could not load this calculation');
    }
  };

  const constructs = detail?.constructs && typeof detail.constructs === 'object' ? detail.constructs : null;
  const signals = detail?.signals && typeof detail.signals === 'object' ? detail.signals : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'স্কোরিং ল্যাব', en: 'Antarious scoring lab' }}
        subtitle={ENGINE_VERSION}
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
            titleBn="অ্যান্টারিয়াস টিম"
            titleEn="Restricted scoring lab"
            hint="ইমেইল ও পাসওয়ার্ড ছাড়া এই পাতা খোলে না। এখানে সূত্র ও হিসাব আছে, আইটেম মার্ক নেই।"
            busy={busy}
            error={error}
            onSubmit={onSubmit}
          />
        </ScrollView>
      ) : null}
      {phase === 'ready' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <Pressable onPress={async () => { await signOutAudience(client); setPhase('login'); }} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
            <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink3 }}>Sign out</Text>
          </Pressable>
          <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink2, lineHeight: 21, marginBottom: 14 }}>
            Engine {ENGINE_VERSION}. Change the formulas in supabase/functions/_shared/prottoy-engine/engine.ts.
            Weights and item marks stay in the key pack and are not shown here.
          </Text>

          {FORMULA_STEPS.map((step) => (
            <Card key={step.id} title={step.title}>
              <Text style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink2, lineHeight: 20 }}>{step.body}</Text>
            </Card>
          ))}

          <Card title="VALIDITY SIGNALS">
            {SIGNALS.map((s) => (
              <Text key={s.id} style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink2, marginBottom: 6 }}>
                {s.id} {s.name} — {s.detail}
              </Text>
            ))}
          </Card>

          <Card title="CONSTRUCTS">
            {CONSTRUCTS.map((c) => (
              <Text key={c.id} style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2, marginBottom: 4 }}>
                {c.id}  {c.en}  ·  {c.index}
              </Text>
            ))}
          </Card>

          <Card title="PS BANDS">
            {BANDS.map((b) => (
              <Text key={b.band} style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2, marginBottom: 4 }}>
                {b.band}  {b.rule}
              </Text>
            ))}
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: T.ink4, marginTop: 8, marginBottom: 4 }}>VI</Text>
            {VI_BANDS.map((b) => (
              <Text key={b.band} style={{ fontFamily: T.fMono, fontSize: 12, color: T.ink2, marginBottom: 4 }}>
                {b.band}  {b.rule}
              </Text>
            ))}
          </Card>

          <Card title="RECOMMENDATION TABLE">
            {RECOMMENDATIONS.map(([band, vi, outcome]) => (
              <Text key={`${band}-${vi}`} style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink2, marginBottom: 3 }}>
                {band} + {vi} → {outcome}
              </Text>
            ))}
            <Text style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginTop: 8, lineHeight: 18 }}>
              Buniad (BUN) never returns DECLINE; that cell becomes APPROVE_SMALLER. A RETEST flag replaces the table.
            </Text>
          </Card>

          <Card title="LIVE CALCULATIONS">
            {rows.length === 0 ? (
              <Text style={{ fontFamily: T.fBn, color: T.ink3 }}>No scored sessions yet.</Text>
            ) : rows.map((row) => {
              const score = Array.isArray(row.prottoy_scores) ? row.prottoy_scores[0] : row.prottoy_scores;
              const on = picked === row.id;
              return (
                <Pressable key={row.id} onPress={() => openSession(row)} style={{ paddingVertical: 8 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: T.navy }}>{applicantName(row)}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink3 }}>
                    PS {score?.ps ?? '—'} · {score?.engine_version || 'unscored'}
                  </Text>
                  {on && signals ? (
                    <View style={{ marginTop: 8 }}>
                      {Object.entries(signals).map(([k, v]) => (
                        <Text key={k} style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink2 }}>
                          {k} {typeof v === 'number' ? v.toFixed(3) : String(v)}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {on && constructs ? (
                    <View style={{ marginTop: 8 }}>
                      {Object.entries(constructs).map(([k, v]) => (
                        <Text key={k} style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink2 }}>
                          {k} r {Number(v?.r).toFixed(3)} · θ {Number(v?.theta).toFixed(3)} · θ′ {Number(v?.thetaPrime).toFixed(3)}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {on && !detail ? (
                    <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3, marginTop: 6 }}>No stored calculation for this session.</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Card>
          {error ? <Text style={{ fontFamily: T.fBn, color: T.coral }}>{error}</Text> : null}
        </ScrollView>
      ) : null}
    </View>
  );
}
