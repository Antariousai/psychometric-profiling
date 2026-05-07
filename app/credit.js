import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import { useApp } from '../context/AppContext';
import BrandHeader from '../components/BrandHeader';
import BilingualLabel from '../components/BilingualLabel';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';
import { bn as toBn } from '../utils/format';

const DATA_SOURCES = [
  {
    icon: '◈', bn: 'মনস্তাত্ত্বিক স্কোর', en: 'Psychometric Assessment',
    weight: 35, score: 742, color: T.teal,
    source: 'Antarious AI Engine',
    desc: 'আচরণগত বিশ্লেষণ, উত্তরের ধরন ও সময় পরিমাপ করে সততা ও উদ্যোক্তা মনোভাব নির্ধারণ।',
    descEn: 'Behavioral analysis measuring honesty, entrepreneurial intent, and consistency of answers.',
    lastUpdated: 'এইমাত্র',
  },
  {
    icon: '◉', bn: 'মোবাইল মানি ইতিহাস', en: 'Mobile Money (bKash/Nagad)',
    weight: 25, score: 680, color: T.gold,
    source: 'bKash MFS API · Nagad',
    desc: 'গত ১২ মাসের bKash ও Nagad লেনদেন, সঞ্চয় প্যাটার্ন ও নিয়মিত পেমেন্ট বিশ্লেষণ।',
    descEn: 'Last 12 months of bKash & Nagad transactions, savings pattern, and regular payments.',
    lastUpdated: 'আজ সকাল',
  },
  {
    icon: '◧', bn: 'ইউটিলিটি পেমেন্ট', en: 'Utility Payment Records',
    weight: 20, score: 720, color: T.violet,
    source: 'DESCO · BREB · BGSL',
    desc: 'বিদ্যুৎ, গ্যাস ও পানির বিল সময়মতো পরিশোধের ইতিহাস — আর্থিক শৃঙ্খলার পরিচয়।',
    descEn: 'History of on-time electricity, gas and water bill payments — indicator of financial discipline.',
    lastUpdated: 'গত সপ্তাহ',
  },
  {
    icon: '◬', bn: 'PO পরিশোধ ইতিহাস', en: 'PO Repayment History',
    weight: 15, score: 800, color: T.green,
    source: 'PKSF IMIS Database',
    desc: 'PKSF-এর নিজস্ব IMIS ডাটাবেজে সংরক্ষিত আগের ঋণ পরিশোধের সম্পূর্ণ ইতিহাস।',
    descEn: "Complete previous loan repayment history from PKSF's own IMIS database.",
    lastUpdated: 'রিয়েলটাইম',
  },
  {
    icon: '◫', bn: 'সামাজিক নেটওয়ার্ক', en: 'Social Network Score',
    weight: 5, score: 650, color: T.amber,
    source: 'PO ফিল্ড রিপোর্ট · JLG',
    desc: 'JLG গ্রুপ মেম্বারশিপ, সমিতির সক্রিয়তা ও PO-র ফিল্ড রিপোর্টের ভিত্তিতে গণনা।',
    descEn: 'Based on JLG group membership, samity activity, and PO field reports.',
    lastUpdated: 'গত মাস',
  },
];

const RATING_BANDS = [
  { rating: 'A', range: '780–1000', color: T.green, risk: 'Low', bn: 'কম ঝুঁকি', action: 'পূর্ণ ঋণ অনুমোদন' },
  { rating: 'B', range: '650–779', color: T.teal, risk: 'Moderate', bn: 'মাঝারি ঝুঁকি', action: '৮৫% ঋণ সুপারিশ' },
  { rating: 'C', range: '500–649', color: T.amber, risk: 'Elevated', bn: 'উচ্চ ঝুঁকি', action: '৬০% ঋণ, শর্ত সহ' },
  { rating: 'D', range: '0–499', color: T.coral, risk: 'High', bn: 'অত্যন্ত ঝুঁকি', action: 'প্রত্যাখ্যান / পুনর্বিবেচনা' },
];

const TIMELINE = [
  { month: 'জান', amount: 1200, onTime: true },
  { month: 'ফেব', amount: 1200, onTime: true },
  { month: 'মার', amount: 1200, onTime: true },
  { month: 'এপ্র', amount: 1200, onTime: false },
  { month: 'মে', amount: 1200, onTime: true },
  { month: 'জুন', amount: 1200, onTime: true },
];

export default function CreditScreen() {
  const router = useRouter();
  const { applicant } = useApp();
  const [activeSource, setActiveSource] = useState(null);

  const hybridScore = Math.round(
    DATA_SOURCES.reduce((sum, s) => sum + (s.score * s.weight) / 100, 0)
  );
  const hybridPct = Math.round((hybridScore / 1000) * 100);
  const rating = hybridScore >= 780 ? 'A' : hybridScore >= 650 ? 'B' : hybridScore >= 500 ? 'C' : 'D';
  const ratingColor = rating === 'A' ? T.green : rating === 'B' ? T.teal : rating === 'C' ? T.amber : T.coral;
  const currentBand = RATING_BANDS.find(b => b.rating === rating);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'রিয়েল-টাইম ক্রেডিট স্কোর', en: 'Real-Time Credit Scoring' }}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

        {/* Score hero */}
        <LinearGradient
          colors={[T.navy, '#0A1525']}
          style={{ borderRadius: 20, padding: 20, marginBottom: 14, alignItems: 'center' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, alignSelf: 'flex-start',
          }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: applicant.tint + '33',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff' }}>{applicant.avatar}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: '#fff' }}>{applicant.name}</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
                হাইব্রিড ক্রেডিট প্রোফাইল · {DATA_SOURCES.length} উৎস
              </Text>
            </View>
          </View>

          <View style={{
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 8, borderColor: ratingColor,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ fontFamily: T.fHead, fontSize: 38, color: ratingColor, lineHeight: 40 }}>
              {toBn(hybridScore)}
            </Text>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>/ ১০০০</Text>
            <View style={{
              marginTop: 6, backgroundColor: ratingColor + '33',
              paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
            }}>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 12, color: ratingColor }}>
                {rating} RATING
              </Text>
            </View>
          </View>

          {/* Score bar */}
          <View style={{ width: '100%', marginBottom: 14 }}>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${hybridPct}%`, height: '100%', backgroundColor: ratingColor, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontFamily: T.fMono, fontSize: 7.5, color: 'rgba(255,255,255,0.35)' }}>0</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 7.5, color: 'rgba(255,255,255,0.35)' }}>500</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 7.5, color: 'rgba(255,255,255,0.35)' }}>1000</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            {[
              { bn: 'হাইব্রিড স্কোর', val: toBn(hybridScore) },
              { bn: 'সম্ভাব্যতা', val: `${toBn(hybridPct)}%` },
              { bn: 'ডেটা উৎস', val: toBn(DATA_SOURCES.length) + 'টি' },
            ].map((s, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: 10, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 18, color: '#fff' }}>{s.val}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' }}>{s.bn}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Current rating explanation */}
        {currentBand && (
          <View style={{
            backgroundColor: ratingColor + '15',
            borderWidth: 1.5, borderColor: ratingColor + '40',
            borderLeftWidth: 4, borderLeftColor: ratingColor,
            borderRadius: 12, padding: 14, marginBottom: 14,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <View style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: ratingColor + '25',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: T.fHead, fontSize: 22, color: ratingColor }}>{rating}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink }}>
                রেটিং {rating} — {currentBand.bn}
              </Text>
              <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: T.ink2, marginTop: 3 }}>
                স্কোর {currentBand.range} এর মধ্যে
              </Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 9, color: ratingColor, marginTop: 4, letterSpacing: 0.3 }}>
                ► {currentBand.action.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Data sources breakdown */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <BilingualLabel bn="ডেটা উৎস বিশ্লেষণ" en="Data source breakdown" sizeBn={13} sizeEn={10} weight="700" />
            <Chip color={T.teal} size={8.5}>LIVE INTEGRATION</Chip>
          </View>

          {DATA_SOURCES.map((src, i) => (
            <Pressable key={i} onPress={() => setActiveSource(activeSource === i ? null : i)}>
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 9,
                    backgroundColor: src.color + '20',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 14, color: src.color }}>{src.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{src.bn}</Text>
                    <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 1 }}>{src.source}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: T.fMonoBold, fontSize: 12, color: src.color }}>
                      {toBn(src.score)}
                    </Text>
                    <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4 }}>
                      ×{src.weight}%
                    </Text>
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: T.cream2, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    width: `${(src.score / 1000) * 100}%`, height: '100%',
                    backgroundColor: src.color, borderRadius: 3,
                  }} />
                </View>
                {activeSource === i && (
                  <View style={{
                    marginTop: 8, backgroundColor: src.color + '10',
                    borderRadius: 10, padding: 12,
                    borderWidth: 1, borderColor: src.color + '25',
                  }}>
                    <Text style={{ fontFamily: T.fBnBold, fontSize: 11.5, color: T.ink, marginBottom: 4 }}>
                      {src.bn}
                    </Text>
                    <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.ink2, lineHeight: 18, marginBottom: 6 }}>
                      {src.desc}
                    </Text>
                    <Text style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontStyle: 'italic', lineHeight: 15, marginBottom: 8 }}>
                      {src.descEn}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{
                        flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center',
                        borderWidth: 1, borderColor: src.color + '30',
                      }}>
                        <Text style={{ fontFamily: T.fHead, fontSize: 18, color: src.color }}>{toBn(src.score)}</Text>
                        <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 2 }}>RAW SCORE</Text>
                      </View>
                      <View style={{
                        flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center',
                        borderWidth: 1, borderColor: src.color + '30',
                      }}>
                        <Text style={{ fontFamily: T.fHead, fontSize: 18, color: src.color }}>
                          {toBn(Math.round(src.score * src.weight / 100))}
                        </Text>
                        <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 2 }}>CONTRIBUTION</Text>
                      </View>
                      <View style={{
                        flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center',
                        borderWidth: 1, borderColor: src.color + '30',
                      }}>
                        <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: src.color }}>{src.lastUpdated}</Text>
                        <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 2 }}>UPDATED</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </Pressable>
          ))}

          <View style={{
            marginTop: 4, padding: 12,
            backgroundColor: T.tealBg, borderRadius: 10,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <View>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.teal2 }}>মোট হাইব্রিড স্কোর</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.teal2, opacity: 0.7, marginTop: 1 }}>
                Weighted sum of all sources
              </Text>
            </View>
            <Text style={{ fontFamily: T.fHead, fontSize: 24, color: T.teal2 }}>{toBn(hybridScore)}</Text>
          </View>
        </View>

        {/* Rating bands reference */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="রেটিং স্কেল ও সিদ্ধান্তের মানদণ্ড" en="Rating scale & decision criteria" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          {RATING_BANDS.map((band, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 10,
              borderBottomWidth: i < RATING_BANDS.length - 1 ? 1 : 0,
              borderBottomColor: T.border,
              backgroundColor: band.rating === rating ? band.color + '0D' : 'transparent',
              borderRadius: 8, paddingHorizontal: band.rating === rating ? 8 : 0,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: band.color + '20',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: band.rating === rating ? 2 : 0,
                borderColor: band.color,
              }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 16, color: band.color }}>{band.rating}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{band.bn}</Text>
                  {band.rating === rating && <Chip color={band.color} size={8}>বর্তমান</Chip>}
                </View>
                <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginTop: 2 }}>{band.range}</Text>
              </View>
              <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: band.color, textAlign: 'right', flex: 1 }}>
                {band.action}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment history */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="মোবাইল মানি পেমেন্ট ইতিহাস" en="bKash / Nagad payment timeline" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TIMELINE.map((t, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <View style={{
                  width: '100%', height: 50, borderRadius: 8,
                  backgroundColor: t.onTime ? T.teal + '22' : T.coral + '22',
                  borderWidth: 1, borderColor: t.onTime ? T.teal + '55' : T.coral + '55',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14 }}>{t.onTime ? '✓' : '!'}</Text>
                </View>
                <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: T.ink3, textAlign: 'center' }}>{t.month}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.teal }} />
              <Text style={{ fontFamily: T.fBn, fontSize: 10, color: T.ink3 }}>সময়মতো · Source: bKash</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.coral }} />
              <Text style={{ fontFamily: T.fBn, fontSize: 10, color: T.ink3 }}>বিলম্ব</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            style={{
              flex: 1, borderRadius: 14, paddingVertical: 14,
              borderWidth: 1.5, borderColor: T.amber, backgroundColor: '#fff',
              alignItems: 'center',
            }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: T.amber }}>⚑ ফ্ল্যাগ করুন</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={{
              flex: 2, backgroundColor: T.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
              shadowColor: T.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
            }}>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: '#fff' }}>স্কোর গ্রহণ করুন →</Text>
          </Pressable>
        </View>
      </ScrollView>
      <FreyaButton screen="result" />
    </View>
  );
}
