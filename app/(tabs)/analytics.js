import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../../constants/tokens';
import BrandHeader from '../../components/BrandHeader';
import BilingualLabel from '../../components/BilingualLabel';
import FreyaOrb from '../../components/FreyaOrb';
import FreyaButton from '../../components/FreyaButton';
import { useApp } from '../../context/AppContext';
import { bn as toBn } from '../../utils/format';
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchOfficerStats, fetchRecentSessions } from '../../services/psympSupabase';

const CHART_HEIGHT = 100;

/** Group an array of session rows by ISO week (Mon-Sun) and count them. */
function buildWeeklyTrend(sessions) {
  if (!sessions.length) return [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const weeks = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i) * 7);
    return d;
  });
  return weeks.map(weekStart => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return sessions.filter(s => {
      const t = new Date(s.created_at);
      return t >= weekStart && t < weekEnd;
    }).length;
  });
}

/** Average per-dimension pct across a list of result rows. */
function buildDimAvg(sessions, dimensions) {
  const totals = {};
  const counts = {};
  dimensions.forEach(d => { totals[d.id] = 0; counts[d.id] = 0; });

  sessions.forEach(s => {
    const result = Array.isArray(s.psychometric_assessment_results)
      ? s.psychometric_assessment_results[0]
      : s.psychometric_assessment_results;
    if (!result?.dim_scores) return;
    const dimScores = typeof result.dim_scores === 'string'
      ? JSON.parse(result.dim_scores)
      : result.dim_scores;
    if (!Array.isArray(dimScores)) return;
    dimScores.forEach(ds => {
      if (totals[ds.id] !== undefined) {
        totals[ds.id] += ds.pct ?? 0;
        counts[ds.id]++;
      }
    });
  });

  return dimensions.map(d => ({
    ...d,
    pct: counts[d.id] ? Math.round(totals[d.id] / counts[d.id]) : 0,
  }));
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { dimensions, decisions } = useApp();
  const [dbStats, setDbStats] = useState(null);
  const [dbSessions, setDbSessions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    setLoading(true);
    Promise.all([fetchOfficerStats(), fetchRecentSessions(200)])
      .then(([stats, sessions]) => {
        if (!alive) return;
        setDbStats(stats);
        setDbSessions(sessions);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    if (dbStats) {
      return [
        { bn: 'মোট মূল্যায়ন',     en: 'Assessments',        val: toBn(dbStats.total),                        delta: '',   color: T.teal },
        { bn: 'গড় স্কোর',          en: 'Avg score',          val: toBn(dbStats.avgScore),                     delta: '',   color: T.gold },
        { bn: 'অনুমোদন হার',       en: 'Approval rate',      val: `${toBn(dbStats.approvalRate)}%`,           delta: '',   color: T.green },
        { bn: 'ফ্ল্যাগ হার',       en: 'Flag rate',          val: `${toBn(dbStats.flagRate)}%`,               delta: '',   color: T.coral },
      ];
    }
    const total = decisions.length || 147;
    const approved = decisions.filter(d => d.outcome === 'approved').length;
    const approvalRate = decisions.length ? Math.round((approved / decisions.length) * 100) : 71;
    const avgScore = decisions.length
      ? Math.round(decisions.reduce((s, d) => s + (d.score ?? 0), 0) / decisions.length)
      : 684;
    const flagged = decisions.filter(d => d.outcome === 'review').length;
    const flagRate = decisions.length ? Math.round((flagged / decisions.length) * 100) : 13;
    return [
      { bn: 'মোট মূল্যায়ন',     en: 'Assessments',        val: toBn(total),               delta: '',  color: T.teal },
      { bn: 'গড় স্কোর',          en: 'Avg score',          val: toBn(avgScore),            delta: '',  color: T.gold },
      { bn: 'অনুমোদন হার',       en: 'Approval rate',      val: `${toBn(approvalRate)}%`, delta: '',  color: T.green },
      { bn: 'মিথ্যা সনাক্তকরণ', en: 'Lie-detection flags', val: `${toBn(flagRate)}%`,     delta: '',  color: T.coral },
    ];
  }, [dbStats, decisions]);

  const weekly = useMemo(() => {
    if (dbSessions && dbSessions.length > 0) {
      return buildWeeklyTrend(dbSessions);
    }
    return decisions.length
      ? [1, 1, 2, 1, decisions.filter(d => d.outcome === 'approved').length, 1, decisions.length]
      : [45, 58, 62, 71, 68, 82, 91];
  }, [dbSessions, decisions]);

  const dimAvg = useMemo(() => {
    if (dbSessions && dbSessions.length > 0) {
      return buildDimAvg(dbSessions, dimensions);
    }
    const DIM_PCT_FALLBACK = [72, 58, 64, 70, 51, 67, 78];
    return dimensions.map((d, i) => ({ ...d, pct: DIM_PCT_FALLBACK[i] ?? 0 }));
  }, [dbSessions, dimensions]);

  const maxWeekly = Math.max(...weekly, 1);

  const freyaInsight = useMemo(() => {
    if (!dimAvg.length) return null;
    const lowest = dimAvg.reduce((a, b) => (a.pct < b.pct ? a : b));
    const flagRate = dbStats?.flagRate ?? 0;
    return `• ${lowest.bn} মাত্রায় গড় ${toBn(lowest.pct)}% — কর্মকর্তাদের প্রশিক্ষণ প্রয়োজন হতে পারে\n• মোট ${toBn(flagRate)}% মূল্যায়নে ফ্ল্যাগ সনাক্ত হয়েছে — সন্দেহজনক কেসগুলো পুনর্বিবেচনা করুন`;
  }, [dimAvg, dbStats]);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'বিশ্লেষণ ড্যাশবোর্ড', en: 'Branch Manager Analytics' }}
        onBack={() => router.back()}
        subtitle="PO-LEVEL · LAST 30 DAYS"
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.teal} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* KPIs */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {kpis.map((k, i) => (
              <View key={i} style={{
                width: '47%', flexGrow: 1,
                backgroundColor: '#fff',
                borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 14,
              }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 10.5, color: T.ink3, marginBottom: 4 }}>{k.bn}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontFamily: T.fHead, fontSize: 26, color: T.navy }}>{k.val}</Text>
                  {k.delta ? (
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: k.color }}>{k.delta}</Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, letterSpacing: 0.3, marginTop: 2 }}>{k.en}</Text>
              </View>
            ))}
          </View>

          {/* Weekly trend */}
          <View style={{
            backgroundColor: '#fff',
            borderWidth: 1, borderColor: T.border, borderRadius: 14,
            padding: 14, marginBottom: 12,
          }}>
            <BilingualLabel bn="সাপ্তাহিক প্রবণতা" en="Weekly trend · assessments" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 6 }} />
            <Text style={{ fontFamily: T.fBn, fontSize: 10, color: T.ink4, marginBottom: 14 }}>
              গত ৭ সপ্তাহে প্রতি সপ্তাহে যতটি মূল্যায়ন শুরু হয়েছে (ডাটাবেজ থেকে)।
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: CHART_HEIGHT, paddingHorizontal: 2 }}>
              {weekly.map((v, i) => {
                const h = maxWeekly > 0 ? Math.round((v / maxWeekly) * CHART_HEIGHT) : 0;
                return (
                  <View key={i} style={{ flex: 1, height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <View style={{ width: '100%', height: Math.max(h, 4), position: 'relative' }}>
                      <LinearGradient
                        colors={[T.teal, T.teal2]}
                        style={{ width: '100%', height: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}
                      />
                      <Text style={{
                        position: 'absolute', top: -16, alignSelf: 'center',
                        fontFamily: T.fMonoBold, fontSize: 8.5, color: T.ink3,
                      }}>{toBn(v)}</Text>
                    </View>
                    <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 4 }}>{`W${i + 1}`}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Avg dimension score */}
          <View style={{
            backgroundColor: '#fff',
            borderWidth: 1, borderColor: T.border, borderRadius: 14,
            padding: 14, marginBottom: 12,
          }}>
            <BilingualLabel bn="গড় মাত্রা-স্কোর" en="Avg score by dimension" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
            {dimAvg.map(d => (
              <View key={d.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: T.ink2 }}>{d.bn}</Text>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: d.color }}>{toBn(d.pct)}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: T.cream2, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${d.pct}%`, height: '100%', backgroundColor: d.color, borderRadius: 3 }} />
                </View>
              </View>
            ))}
          </View>

          {/* Freya insight */}
          <View style={{ backgroundColor: T.navy, borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FreyaOrb size={30} pulse={false} />
              <View>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal, letterSpacing: 1.5 }}>FREYA · BRANCH INSIGHT</Text>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>এই সপ্তাহে খেয়াল রাখুন</Text>
              </View>
            </View>
            <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: 'rgba(255,255,255,0.78)', lineHeight: 19 }}>
              {freyaInsight ?? '• ডেটা লোড হচ্ছে…'}
            </Text>
          </View>
        </ScrollView>
      )}
      <FreyaButton screen="analytics" bottom={90} />
    </View>
  );
}
