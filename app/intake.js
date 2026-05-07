import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import { PERSONAS, BLANK_APPLICANT } from '../data/personas';
import { useApp } from '../context/AppContext';
import BilingualLabel from '../components/BilingualLabel';
import BrandHeader from '../components/BrandHeader';
import Field from '../components/Field';
import PrimaryBtn from '../components/PrimaryBtn';
import FreyaOrb from '../components/FreyaOrb';
import FreyaButton from '../components/FreyaButton';
import { bn as toBn } from '../utils/format';

function formFromTemplate(p) {
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    nameEn: String(p.nameEn ?? ''),
    age: p.age === '' || p.age == null ? '' : String(p.age),
    gender: String(p.gender ?? 'F'),
    village: String(p.village ?? ''),
    villageEn: String(p.villageEn ?? ''),
    occupation: String(p.occupation ?? ''),
    occupationEn: String(p.occupationEn ?? ''),
    loanAsk: p.loanAsk === '' || p.loanAsk == null ? '' : String(p.loanAsk),
    savings: p.savings === '' || p.savings == null ? '' : String(p.savings),
    loanPurpose: String(p.loanPurpose ?? ''),
    loanPurposeEn: String(p.loanPurposeEn ?? ''),
    dependents: p.dependents === '' || p.dependents == null ? '' : String(p.dependents),
    nid: String(p.nid ?? ''),
    phone: String(p.phone ?? ''),
    avatar: String(p.avatar ?? ''),
    tint: String(p.tint ?? '#2EC4B6'),
  };
}

export default function IntakeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { applicantId, setApplicant, setApplicantDraft, hydrated, applicant } = useApp();
  const applicantRef = useRef(applicant);
  applicantRef.current = applicant;

  const [form, setForm] = useState(() => formFromTemplate(PERSONAS.nasrin));

  const prevIdRef = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    if (prevIdRef.current !== applicantId) {
      prevIdRef.current = applicantId;
      const tmpl = PERSONAS[applicantId]
        ? { ...PERSONAS[applicantId] }
        : { ...BLANK_APPLICANT, id: applicantId };
      setForm(formFromTemplate(tmpl));
    }
  }, [hydrated, applicantId]);

  const prevPathRef = useRef('');
  useEffect(() => {
    if (!hydrated) return;
    const path = pathname || '';
    const onIntake = path.includes('intake');
    const wasOnIntake = (prevPathRef.current || '').includes('intake');
    prevPathRef.current = path;
    if (onIntake && !wasOnIntake) {
      setForm(formFromTemplate(applicantRef.current));
    }
  }, [pathname, hydrated]);

  useEffect(() => {
    setApplicantDraft(form);
  }, [form, setApplicantDraft]);

  const update = useCallback((key, v) => {
    setForm(prev => ({ ...prev, [key]: v }));
  }, []);

  const pickDemo = (id) => setApplicant(id);
  const pickNew = () => setApplicant(`u${Date.now().toString(36)}`);

  const loanDisplay = form.loanAsk === '' ? '' : `${toBn(form.loanAsk)} ৳`;
  const savingsDisplay = form.savings === '' ? '' : `${toBn(form.savings)} ৳`;

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'নতুন আবেদনকারী', en: 'New Applicant Intake' }}
        onBack={() => router.back()}
        subtitle="STEP 1 OF 3 · BASIC INFO"
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{
            fontFamily: T.fMonoBold, fontSize: 9,
            letterSpacing: 1.5, color: T.ink4, marginBottom: 8,
          }}>CHOOSE TEMPLATE OR NEW</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {Object.values(PERSONAS).map(pp => {
              const on = applicantId === pp.id;
              return (
                <Pressable
                  key={pp.id}
                  onPress={() => pickDemo(pp.id)}
                  style={{
                    flexGrow: 1,
                    minWidth: '22%',
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
            <Pressable
              onPress={pickNew}
              style={{
                flexGrow: 1,
                minWidth: '22%',
                paddingVertical: 9, paddingHorizontal: 8,
                borderWidth: 1.5,
                borderColor: applicantId && !PERSONAS[applicantId] ? T.teal : T.border,
                backgroundColor: applicantId && !PERSONAS[applicantId] ? `${T.teal}18` : '#fff',
                borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 11, color: T.teal }}>＋ নতুন</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 8, color: T.ink4, marginTop: 2 }}>New</Text>
            </Pressable>
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
                colors={[`${form.tint}4D`, `${form.tint}1A`]}
                style={{
                  flex: 1, aspectRatio: 3 / 4,
                  borderRadius: 12,
                  borderWidth: 1.5, borderColor: `${form.tint}AA`, borderStyle: 'dashed',
                  alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8,
                }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24, backgroundColor: form.tint,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: T.fBnBlack, fontSize: 22, color: '#fff' }}>{form.avatar || '?'}</Text>
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
                  ✓ {form.nid || '—'}
                </Text>
              </View>
            </View>
          </View>

          <Field
            label={{ bn: 'পূর্ণ নাম', en: 'Full name' }}
            value={form.name}
            onChangeText={v => update('name', v)}
            placeholder="বাংলায় নাম লিখুন"
          />
          <Field
            label={{ bn: 'নাম (ইংরেজি)', en: 'Name (English)' }}
            value={form.nameEn}
            onChangeText={v => update('nameEn', v)}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={{ bn: 'বয়স', en: 'Age' }}
                value={form.age}
                onChangeText={v => update('age', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="৩০"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={{ bn: 'লিঙ্গ', en: 'Gender (F / M)' }}
                value={form.gender}
                onChangeText={v => {
                  const t = v.trim().toUpperCase();
                  if (!t) update('gender', 'F');
                  else update('gender', t.startsWith('F') ? 'F' : 'M');
                }}
                placeholder="F or M"
              />
            </View>
          </View>
          <Field
            label={{ bn: 'গ্রাম / এলাকা', en: 'Village / area' }}
            value={form.village}
            onChangeText={v => update('village', v)}
          />
          <Field
            label={{ bn: 'পেশা', en: 'Occupation' }}
            value={form.occupation}
            onChangeText={v => update('occupation', v)}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={{ bn: 'ঋণ চাওয়া', en: 'Loan ask' }}
                value={form.loanAsk}
                onChangeText={v => update('loanAsk', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="15000"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={{ bn: 'সঞ্চয়', en: 'Savings' }}
                value={form.savings}
                onChangeText={v => update('savings', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Field
            label={{ bn: 'ঋণের উদ্দেশ্য', en: 'Loan purpose' }}
            value={form.loanPurpose}
            onChangeText={v => update('loanPurpose', v)}
          />
          <Field
            label={{ bn: 'NID (মাস্কড)', en: 'National ID' }}
            value={form.nid}
            onChangeText={v => update('nid', v)}
          />
          <Field
            label={{ bn: 'ফোন', en: 'Phone' }}
            value={form.phone}
            onChangeText={v => update('phone', v)}
            keyboardType="phone-pad"
          />
          <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginTop: -8, marginBottom: 12 }}>
            Preview: ঋণ {loanDisplay || '—'} · সঞ্চয় {savingsDisplay || '—'}
          </Text>

          <View style={{
            backgroundColor: T.tealBg,
            borderWidth: 1, borderColor: 'rgba(46,196,182,0.25)',
            borderLeftWidth: 3, borderLeftColor: T.teal,
            borderRadius: 10,
            paddingVertical: 12, paddingHorizontal: 14,
            marginTop: 4, marginBottom: 16,
            flexDirection: 'row', gap: 10,
          }}>
            <FreyaOrb size={32} pulse={false} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.navy, marginBottom: 4 }}>
                Freya বলছে:
              </Text>
              <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, lineHeight: 20 }}>
                উপরের তথ্য সম্পাদনা করতে পারবেন। সঠিক মনে হলে প্রশ্নোত্তর শুরু করুন।
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
