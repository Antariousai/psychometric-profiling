import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import { PERSONAS } from '../data/personas';
import { useApp } from '../context/AppContext';
import BilingualLabel from '../components/BilingualLabel';
import BrandHeader from '../components/BrandHeader';
import Chip from '../components/Chip';
import Field from '../components/Field';
import PrimaryBtn from '../components/PrimaryBtn';
import FreyaOrb from '../components/FreyaOrb';
import FreyaButton from '../components/FreyaButton';
import { bn as toBn } from '../utils/format';

export default function IntakeScreen() {
  const router = useRouter();
  const { applicantId, setApplicant } = useApp();
  const [persona, setPersona] = useState(applicantId || 'nasrin');
  const active = PERSONAS[persona];

  useEffect(() => { setApplicant(persona); }, [persona]);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'নতুন আবেদনকারী', en: 'New Applicant Intake' }}
        onBack={() => router.back()}
        subtitle="STEP 1 OF 3 · BASIC INFO"
        right={<Chip color={T.teal}>১/৩</Chip>}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{
            fontFamily: T.fMonoBold, fontSize: 9,
            letterSpacing: 1.5, color: T.ink4, marginBottom: 8,
          }}>DEMO: CHOOSE APPLICANT</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {Object.values(PERSONAS).map(pp => {
              const on = persona === pp.id;
              return (
                <Pressable
                  key={pp.id}
                  onPress={() => setPersona(pp.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 9, paddingHorizontal: 8,
                    borderWidth: 1.5,
                    borderColor: on ? pp.tint : T.border,
                    backgroundColor: on ? `${pp.tint}22` : '#fff',
                    borderRadius: 12,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, backgroundColor: pp.tint,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: T.fBnBlack, fontSize: 11, color: '#fff' }}>{pp.avatar}</Text>
                  </View>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: T.ink }}>
                    {pp.nameEn.split(' ')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={{
            backgroundColor: '#fff', borderWidth: 1, borderColor: T.border,
            borderRadius: 16, padding: 12, marginBottom: 12,
          }}>
            <BilingualLabel
              bn="ছবি ও NID"
              en="Photo & National ID"
              sizeBn={13}
              sizeEn={10}
              weight="700"
              style={{ marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <LinearGradient
                colors={[`${active.tint}4D`, `${active.tint}1A`]}
                style={{
                  flex: 1, aspectRatio: 3 / 4,
                  borderRadius: 12,
                  borderWidth: 1.5, borderColor: `${active.tint}AA`, borderStyle: 'dashed',
                  alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8,
                }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24, backgroundColor: active.tint,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: T.fBnBlack, fontSize: 22, color: '#fff' }}>{active.avatar}</Text>
                </View>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 8, color: T.ink3, letterSpacing: 0.8 }}>
                  APPLICANT PHOTO
                </Text>
              </LinearGradient>
              <View style={{
                flex: 1, aspectRatio: 3 / 4,
                backgroundColor: '#fff',
                borderWidth: 1.5, borderColor: T.border2, borderStyle: 'dashed',
                borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                padding: 8,
              }}>
                <Text style={{ fontSize: 26 }}>🪪</Text>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 10.5, color: T.ink2, marginTop: 5 }}>
                  NID তুলুন
                </Text>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 7.5, color: T.ink4, letterSpacing: 0.4, marginTop: 3 }}>
                  AUTO-OCR · BANGLA
                </Text>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 8, color: T.green, marginTop: 3, textAlign: 'center' }}>
                  ✓ {active.nid}
                </Text>
              </View>
            </View>
          </View>

          <Field label={{ bn: 'পূর্ণ নাম', en: 'Full name' }} value={active.name} editable={false} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={{ bn: 'বয়স', en: 'Age' }} value={String(active.age)} editable={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={{ bn: 'লিঙ্গ', en: 'Gender' }}
                value={active.gender === 'F' ? 'মহিলা' : 'পুরুষ'}
                editable={false}
              />
            </View>
          </View>
          <Field label={{ bn: 'গ্রাম / এলাকা', en: 'Village / area' }} value={active.village} editable={false} />
          <Field label={{ bn: 'পেশা', en: 'Occupation' }} value={active.occupation} editable={false} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={{ bn: 'ঋণ চাওয়া', en: 'Loan ask' }} value={`${toBn(active.loanAsk)} ৳`} editable={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={{ bn: 'সঞ্চয়', en: 'Savings' }} value={`${toBn(active.savings)} ৳`} editable={false} />
            </View>
          </View>
          <Field label={{ bn: 'ঋণের উদ্দেশ্য', en: 'Loan purpose' }} value={active.loanPurpose} editable={false} />

          <View style={{
            backgroundColor: T.tealBg,
            borderWidth: 1, borderColor: 'rgba(46,196,182,0.25)',
            borderLeftWidth: 3, borderLeftColor: T.teal,
            borderRadius: 10,
            paddingVertical: 12, paddingHorizontal: 14,
            marginTop: 12, marginBottom: 16,
            flexDirection: 'row', gap: 10,
          }}>
            <FreyaOrb size={32} pulse={false} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.navy, marginBottom: 4 }}>
                Freya বলছে:
              </Text>
              <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, lineHeight: 20 }}>
                তথ্যগুলো ভালোই লাগছে। এখন ২৫টা প্রশ্ন ধরে ধরে করব — ১২ থেকে ১৫ মিনিট লাগবে, তাড়া নেই।
              </Text>
            </View>
          </View>

          <PrimaryBtn
            label={{ bn: 'চলো প্রশ্ন শুরু করি', en: 'Start assessment' }}
            icon="→"
            onPress={() => router.push('/assessment')}
          />
        </View>
      </ScrollView>
      <FreyaButton screen="intake" />
    </View>
  );
}
