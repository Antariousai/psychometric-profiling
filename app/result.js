import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import { QUESTIONS } from '../data/questions';
import { DIMENSIONS } from '../data/dimensions';
import { PERSONAS } from '../data/personas';
import { computeScore } from '../data/scoring';
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
  const { applicantId, answers } = useApp();
  const [tab, setTab] = useState('summary');
  const applicant = PERSONAS[applicantId] || PERSONAS.nasrin;

  const result = useMemo(() => {
    if (answers && Object.keys(answers).length > 0) {
      return computeScore(answers, QUESTIONS, DIMENSIONS);
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
      dimScores: DIMENSIONS.map((d, i) => ({ ...d, pct: dims[i] })),
      totalPct: dims.reduce((a, b) => a + b, 0) / dims.length,
    };
  }, [applicantId, answers]);

  const scoreColor = colorForRating(result.rating);
  const recLoanAmt =
    result.rating === 'A' ? applicant.loanAsk
      : result.rating === 'B' ? Math.round(applicant.loanAsk * 0.85)
      : result.rating === 'C' ? Math.round(applicant.loanAsk * 0.6)
      : Math.round(applicant.loanAsk * 0.35);
  const emi = Math.round((recLoanAmt * 1.18) / result.tenure);

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

        {/* Action buttons */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={{
              flex: 1, paddingVertical: 13, borderRadius: 12,
              borderWidth: 1.5, borderColor: T.amber, backgroundColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
            }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.amber }}>⚑ ফ্ল্যাগ করুন</Text>
          </Pressable>
          <Pressable style={{
            flex: 1.3, paddingVertical: 13, borderRadius: 12,
            backgroundColor: T.teal,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: T.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
          }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>✓ অনুমোদন করুন</Text>
          </Pressable>
          <Pressable style={{
            flex: 1.3, paddingVertical: 13, borderRadius: 12,
            backgroundColor: T.coral,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: T.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
          }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>✗ প্রত্যাখ্যান করুন</Text>
          </Pressable>
        </View>
      </ScrollView>
      <FreyaButton screen="result" />
    </View>
  );
}

function ResultSummary({ result, applicant, recLoanAmt, emi }) {
  const freyaText = {
    A: `${applicant.name}-এর প্রোফাইল দারুণ। ${fmtTk(recLoanAmt)} টাকা পুরোটাই দেওয়া যায়।`,
    B: `${applicant.name}-এর সামগ্রিক অবস্থা ভালোই। কিছু যাচাই করে নিলে ভালো হয়।`,
    C: `${applicant.name}-এর প্রোফাইলে কিছু দুর্বল জায়গা আছে। ছোট অঙ্কে শুরু করুন।`,
    D: `${applicant.name}-এর ক্ষেত্রে এখনই ঋণ দেওয়া ঠিক হবে না।`,
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
            <View style={{ padding: 13, flexDirection: 'row', alignItems: 'center' }}>
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
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 14, color: c, marginLeft: 10 }}>
                {isOpen ? '▲' : '▼'}
              </Text>
            </View>

            {/* Expanded detail */}
            {isOpen && (
              <View style={{
                backgroundColor: `${c}0D`,
                borderTopWidth: 1, borderTopColor: `${c}33`,
                padding: 13,
              }}>
                {f.answerGiven && (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4, letterSpacing: 0.5, marginBottom: 6 }}>
                      প্রদত্ত উত্তর / ANSWER GIVEN
                    </Text>
                    <View style={{
                      backgroundColor: '#fff', borderRadius: 8,
                      borderWidth: 1, borderColor: `${c}44`,
                      paddingHorizontal: 12, paddingVertical: 8,
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                    }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{f.answerGiven.bn}</Text>
                        <Text style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontStyle: 'italic', marginTop: 2 }}>{f.answerGiven.en}</Text>
                      </View>
                    </View>
                  </View>
                )}
                {f.expected && (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4, letterSpacing: 0.5, marginBottom: 6 }}>
                      প্রত্যাশিত উত্তর / EXPECTED
                    </Text>
                    <View style={{
                      backgroundColor: '#fff', borderRadius: 8,
                      borderWidth: 1, borderColor: 'rgba(22,163,74,0.3)',
                      paddingHorizontal: 12, paddingVertical: 8,
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                    }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.green }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{f.expected.bn}</Text>
                        <Text style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontStyle: 'italic', marginTop: 2 }}>{f.expected.en}</Text>
                      </View>
                    </View>
                  </View>
                )}
                <View>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.ink4, letterSpacing: 0.5, marginBottom: 6 }}>
                    ব্যাখ্যা / EXPLANATION
                  </Text>
                  <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, lineHeight: 19 }}>
                    {f.explanation?.bn}
                  </Text>
                  <Text style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontStyle: 'italic', marginTop: 4, lineHeight: 16 }}>
                    {f.explanation?.en}
                  </Text>
                </View>
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
