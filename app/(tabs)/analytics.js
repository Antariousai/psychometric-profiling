import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../../constants/tokens';
import { DIMENSIONS } from '../../data/dimensions';
import BrandHeader from '../../components/BrandHeader';
import BilingualLabel from '../../components/BilingualLabel';
import FreyaOrb from '../../components/FreyaOrb';
import FreyaButton from '../../components/FreyaButton';
import { bn as toBn } from '../../utils/format';

const KPIS = [
  { bn: 'মোট মূল্যায়ন', en: 'Assessments', val: '১৪৭', delta: '+২২%', color: T.teal },
  { bn: 'গড় স্কোর', en: 'Avg score', val: '৬৮৪', delta: '+১৮', color: T.gold },
  { bn: 'অনুমোদন হার', en: 'Approval rate', val: '৭১%', delta: '+৪%', color: T.green },
  { bn: 'মিথ্যা সনাক্তকরণ', en: 'Lie-detection flags', val: '১৯', delta: '১৩%', color: T.coral },
];

const WEEKLY = [45, 58, 62, 71, 68, 82, 91];
const DIM_PCT = [72, 58, 64, 70, 51, 67, 78];
const CHART_HEIGHT = 100;

export default function AnalyticsScreen() {
  const router = useRouter();
  const dimAvg = DIMENSIONS.map((d, i) => ({ ...d, pct: DIM_PCT[i] }));
  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'বিশ্লেষণ ড্যাশবোর্ড', en: 'Branch Manager Analytics' }}
        onBack={() => router.back()}
        subtitle="PO-LEVEL · LAST 30 DAYS"
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {KPIS.map((k, i) => (
            <View key={i} style={{
              width: '47%', flexGrow: 1,
              backgroundColor: '#fff',
              borderWidth: 1, borderColor: T.border, borderRadius: 14,
              padding: 14,
            }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 10.5, color: T.ink3, marginBottom: 4 }}>{k.bn}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 26, color: T.navy }}>{k.val}</Text>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: k.color }}>{k.delta}</Text>
              </View>
              <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, letterSpacing: 0.3, marginTop: 2 }}>{k.en}</Text>
            </View>
          ))}
        </View>

        {/* Weekly trend - fixed chart */}
        <View style={{
          backgroundColor: '#fff',
          borderWidth: 1, borderColor: T.border, borderRadius: 14,
          padding: 14, marginBottom: 12,
        }}>
          <BilingualLabel bn="সাপ্তাহিক প্রবণতা" en="Weekly trend · assessments" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 18 }} />
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end',
            gap: 6, height: CHART_HEIGHT, paddingHorizontal: 2,
          }}>
            {WEEKLY.map((v, i) => (
              <View key={i} style={{ flex: 1, height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{ width: '100%', height: v, position: 'relative' }}>
                  <LinearGradient
                    colors={[T.teal, T.teal2]}
                    style={{
                      width: '100%', height: '100%',
                      borderTopLeftRadius: 6, borderTopRightRadius: 6,
                    }}
                  />
                  <Text style={{
                    position: 'absolute', top: -16, alignSelf: 'center',
                    fontFamily: T.fMonoBold, fontSize: 8.5, color: T.ink3,
                  }}>{toBn(v)}</Text>
                </View>
                <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 4 }}>{`W${i + 1}`}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{
          backgroundColor: '#fff',
          borderWidth: 1, borderColor: T.border, borderRadius: 14,
          padding: 14, marginBottom: 12,
        }}>
          <BilingualLabel bn="গড় মাত্রা-স্কোর" en="Avg score by dimension" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          {dimAvg.map(d => (
            <View key={d.id} style={{ marginBottom: 10 }}>
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
              }}>
                <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: T.ink2 }}>{d.bn}</Text>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 10, color: d.color }}>{toBn(d.pct)}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: T.cream2, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${d.pct}%`, height: '100%', backgroundColor: d.color, borderRadius: 3 }} />
              </View>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: T.navy, borderRadius: 14, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FreyaOrb size={30} pulse={false} />
            <View>
              <Text style={{
                fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal, letterSpacing: 1.5,
              }}>FREYA · BRANCH INSIGHT</Text>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>এই সপ্তাহে খেয়াল রাখুন</Text>
            </View>
          </View>
          <Text style={{ fontFamily: T.fBn, fontSize: 11.5, color: 'rgba(255,255,255,0.78)', lineHeight: 19 }}>
            • ব্যবসায়িক জ্ঞান মাত্রায় গড় ৫১% — ৩ জন কর্মকর্তার প্রশিক্ষণ প্রয়োজন{'\n'}
            • ১৯টি মিথ্যা সনাক্তকরণের মধ্যে ৭টি রফিক গ্রুপ থেকে — পুনরায় সাক্ষাৎকার নিন{'\n'}
            • মোট ১৪৭টি মূল্যায়নের মধ্যে ২২% মহিলা — টার্গেট ৪০%
          </Text>
        </View>
      </ScrollView>
      <FreyaButton screen="analytics" bottom={90} />
    </View>
  );
}
