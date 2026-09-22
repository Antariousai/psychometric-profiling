import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../../constants/tokens';
import { PERSONAS, applicantDisplayFallback } from '../../data/personas';
import { useApp } from '../../context/AppContext';
import BrandHeader from '../../components/BrandHeader';
import Chip from '../../components/Chip';
import FreyaButton from '../../components/FreyaButton';
import { bn as toBn } from '../../utils/format';
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchRecentSessions } from '../../services/psympSupabase';

function colorForRating(r) {
  return r === 'A' ? T.green : r === 'B' ? T.teal : r === 'C' ? T.amber : T.coral;
}

/** Convert a raw DB session row into the same shape as a local decision entry. */
function sessionToRecord(s) {
  const profile = s.applicants?.profile ?? {};
  const result = Array.isArray(s.psychometric_assessment_results)
    ? s.psychometric_assessment_results[0]
    : s.psychometric_assessment_results;
  const decision = Array.isArray(s.credit_decisions)
    ? s.credit_decisions[0]
    : s.credit_decisions;

  const when = new Date(s.created_at);
  const dateEn = when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    id: s.applicants?.slug ?? s.applicant_id ?? 'unknown',
    sessionId: s.id,
    score: result?.overall ?? null,
    rating: result?.rating ?? null,
    flags: Array.isArray(result?.flags) ? result.flags.length : 0,
    dateEn,
    outcome: decision?.outcome ?? (s.completed_at ? 'completed' : 'in-progress'),
    displayName: profile.name ?? profile.nameEn ?? null,
    source: 'db',
  };
}

export default function HistoryScreen() {
  const router = useRouter();
  const { setApplicant, decisions } = useApp();
  const [filter, setFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [dbRecords, setDbRecords] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    setLoading(true);
    fetchRecentSessions(50)
      .then(rows => { if (alive) setDbRecords(rows.map(sessionToRecord)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const open = (r) => {
    setApplicant(r.id);
    router.push('/result');
  };

  const allRecords = useMemo(() => {
    const localEntries = decisions.map(d => ({
      id: d.applicantId,
      sessionId: d.sessionId ?? null,
      score: d.score,
      rating: d.rating,
      flags: d.flags ?? 0,
      dateEn: d.dateEn || new Date(d.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      outcome: d.outcome,
      source: 'local',
    }));

    if (dbRecords && dbRecords.length > 0) {
      // Merge: prefer DB records, append any local that aren't already in DB
      const dbSet = new Set(dbRecords.map(r => r.sessionId));
      const localOnly = localEntries.filter(r => !dbSet.has(r.sessionId));
      return [...dbRecords, ...localOnly];
    }
    return localEntries;
  }, [decisions, dbRecords]);

  const filters = useMemo(() => [
    { id: 'all',      bn: 'সব',           n: allRecords.length },
    { id: 'approved', bn: 'অনুমোদিত',     n: allRecords.filter(r => r.outcome === 'approved').length },
    { id: 'review',   bn: 'পুনর্বিবেচনা', n: allRecords.filter(r => r.outcome === 'review').length },
    { id: 'declined', bn: 'প্রত্যাখ্যাত', n: allRecords.filter(r => r.outcome === 'declined').length },
  ], [allRecords]);

  const ratingFilters = useMemo(() => {
    const rat = (x) => (x?.rating ? String(x.rating).charAt(0) : null);
    return [
      { id: 'all', bn: 'সব রেটিং', n: allRecords.length },
      ...['A', 'B', 'C', 'D'].map(letter => ({
        id: letter,
        bn: letter,
        n: allRecords.filter(r => rat(r) === letter).length,
      })),
    ];
  }, [allRecords]);

  const visible = useMemo(() => allRecords.filter((r) => {
    const okOutcome = filter === 'all' || r.outcome === filter;
    const rr = r.rating ? String(r.rating).charAt(0) : null;
    const okRating = ratingFilter === 'all' || rr === ratingFilter;
    return okOutcome && okRating;
  }), [allRecords, filter, ratingFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'আবেদন ইতিহাস', en: 'Assessment History' }}
        onBack={() => router.back()}
      />
      <View style={{ height: 56 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center', minHeight: 56 }}>
          {filters.map(f => {
            const on = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={{
                  minHeight: 40, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: on ? T.navy : '#fff',
                  borderWidth: 1, borderColor: on ? T.navy : T.border,
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                }}>
                <Text style={{
                  fontFamily: T.fBnBold, fontSize: 11,
                  color: on ? '#fff' : T.ink2, lineHeight: 16,
                }}>{f.bn}</Text>
                <Text style={{
                  fontFamily: T.fMono, fontSize: 9,
                  color: on ? 'rgba(255,255,255,0.6)' : T.ink4, lineHeight: 16,
                }}>{toBn(f.n)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ paddingBottom: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
          {ratingFilters.map(f => {
            const on = ratingFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setRatingFilter(f.id)}
                style={{
                  minHeight: 40, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
                  backgroundColor: on ? T.teal : '#fff',
                  borderWidth: 1, borderColor: on ? T.teal : T.border,
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                }}>
                <Text style={{
                  fontFamily: T.fBnBold, fontSize: 10.5,
                  color: on ? '#fff' : T.ink2, lineHeight: 16,
                }}>{f.bn}</Text>
                <Text style={{
                  fontFamily: T.fMono, fontSize: 9,
                  color: on ? 'rgba(255,255,255,0.75)' : T.ink4, lineHeight: 16,
                }}>{toBn(f.n)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.teal} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}>
          {visible.length === 0 ? (
            <View style={{
              marginTop: 24, paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center',
              borderWidth: 1, borderColor: T.border, borderRadius: 14, borderStyle: 'dashed',
            }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: T.ink3, marginBottom: 6, textAlign: 'center' }}>
                কোনো রেকর্ড মিলছে না
              </Text>
              <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink4, textAlign: 'center', lineHeight: 19 }}>
                ফিল্টার বদলে দেখুন, অথবা নতুন মূল্যায়ন শেষ হলে এখানে দেখাবে।
              </Text>
            </View>
          ) : visible.map((r, i) => {
            const p = PERSONAS[r.id] || applicantDisplayFallback(r.id);
            const color = r.rating ? colorForRating(r.rating) : T.ink4;
            return (
              <Pressable
                key={r.sessionId ?? `${r.id}-${i}`}
                onPress={() => open(r)}
                style={{
                  backgroundColor: '#fff',
                  borderWidth: 1, borderColor: T.border, borderRadius: 14,
                  padding: 14, marginBottom: 10,
                  flexDirection: 'row', alignItems: 'center', gap: 13,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
                }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 12, backgroundColor: p.tint,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff' }}>{p.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink, marginBottom: 3 }}>
                    {r.displayName ?? p.name}
                  </Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 9.5, color: T.ink4, letterSpacing: 0.3, marginBottom: 4 }}>
                    {r.dateEn}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                    {r.outcome === 'approved'   ? <Chip color={T.green} size={8.5}>✓ অনুমোদিত</Chip>   : null}
                    {r.outcome === 'declined'   ? <Chip color={T.coral} size={8.5}>✗ প্রত্যাখ্যাত</Chip> : null}
                    {r.outcome === 'review'     ? <Chip color={T.amber} size={8.5}>⋯ পুনর্বিবেচনা</Chip> : null}
                    {r.outcome === 'completed'  ? <Chip color={T.teal}  size={8.5}>● সম্পন্ন</Chip>      : null}
                    {r.flags > 0               ? <Chip color={T.coral} size={8.5}>⚑{toBn(r.flags)}</Chip> : null}
                    {r.source === 'local'       ? <Chip color={T.ink4}  size={8}>◎ local</Chip>          : null}
                  </View>
                </View>
                {r.score != null ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: T.fHead, fontSize: 22, color, lineHeight: 22 }}>{toBn(r.score)}</Text>
                    {r.rating ? <Chip color={color} size={8} style={{ marginTop: 4 }}>{r.rating}</Chip> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <FreyaButton screen="history" bottom={90} />
    </View>
  );
}
