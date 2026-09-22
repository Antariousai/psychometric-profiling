import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { T } from '../../constants/tokens';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import BilingualLabel from '../../components/BilingualLabel';
import Chip from '../../components/Chip';
import FreyaOrb from '../../components/FreyaOrb';
import { fetchOfficerStats } from '../../services/psympSupabase';
import { isSupabaseConfigured } from '../../lib/supabase';
import { bn as toBn } from '../../utils/format';

const PO_PROFILE = {
  name: 'কামরুল হোসেন',
  nameEn: 'Kamrul Hossain',
  id: 'PO-21047',
  designation: 'Loan Officer',
  designationBn: 'ঋণ কর্মকর্তা',
  branch: 'BURO-BD · কমলগঞ্জ শাখা',
  branchEn: 'BURO-Bangladesh · Kamalganj Branch',
  region: 'সিলেট বিভাগ',
  regionEn: 'Sylhet Division',
  phone: '01712-443219',
  email: 'kamrul.po21047@buro.org.bd',
  joinDate: '১৫ জানুয়ারি ২০২১',
  joinDateEn: '15 Jan 2021',
  supervisor: 'রাশেদুল ইসলাম',
  supervisorEn: 'Rashedul Islam (BM)',
};


const RECENT_ACTIVITY = [
  { type: 'assessment', bn: 'নাসরিন বেগম — মূল্যায়ন সম্পন্ন', score: 742, rating: 'B', time: 'আজ ২:১৪ PM', icon: '✓', color: T.teal },
  { type: 'field', bn: 'শিমা আক্তার — ফিল্ড ভিজিট', score: null, rating: null, time: 'আজ ১১:৩০ AM', icon: '◬', color: T.leaf },
  { type: 'assessment', bn: 'রফিক উদ্দিন — মূল্যায়ন চলছে', score: null, rating: null, time: 'গতকাল ৩:৪৫ PM', icon: '⋯', color: T.amber },
];

const CERTIFICATIONS = [
  { bn: 'সাইকোমেট্রিক মূল্যায়ন প্রশিক্ষণ', en: 'Psychometric Assessment Training', year: '২০২৩', color: T.teal },
  { bn: 'PKSF ডিজিটাল কেওয়াইসি', en: 'PKSF Digital KYC Certification', year: '২০২৪', color: T.gold },
  { bn: 'ফিনান্সিয়াল ইনক্লুশন', en: 'Financial Inclusion Module', year: '২০২৩', color: T.violet },
];

async function pickProfilePhoto(setProfilePhoto) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (!result.canceled && result.assets[0]) {
    setProfilePhoto(result.assets[0].uri);
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tweaks, setTweaks, profilePhoto, setProfilePhoto, resetAll, decisions } = useApp();
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchOfficerStats().then(s => { if (s) setDbStats(s); }).catch(() => {});
  }, []);

  const perf = useMemo(() => {
    if (dbStats) {
      return [
        { bn: 'মোট মূল্যায়ন', en: 'Total assessments', val: toBn(dbStats.total), sub: 'এ পর্যন্ত', color: T.teal },
        { bn: 'অনুমোদন হার', en: 'Approval rate', val: `${toBn(dbStats.approvalRate)}%`, sub: 'গড়', color: T.green },
        { bn: 'গড় স্কোর', en: 'Avg score', val: toBn(dbStats.avgScore), sub: '/১০০০', color: T.gold },
        { bn: 'ফ্ল্যাগ হার', en: 'Flag rate', val: `${toBn(dbStats.flagRate)}%`, sub: 'হার', color: T.coral },
      ];
    }
    const total = decisions.length;
    const approved = decisions.filter(d => d.outcome === 'approved').length;
    const approvalRate = total ? Math.round((approved / total) * 100) : 71;
    const avgScore = total
      ? Math.round(decisions.reduce((s, d) => s + (d.score ?? 0), 0) / total)
      : 684;
    const flagged = decisions.filter(d => d.outcome === 'review').length;
    const flagRate = total ? Math.round((flagged / total) * 100) : 13;
    return [
      { bn: 'মোট মূল্যায়ন', en: 'Total assessments', val: toBn(total || 147), sub: 'এই মাসে', color: T.teal },
      { bn: 'অনুমোদন হার', en: 'Approval rate', val: `${toBn(approvalRate)}%`, sub: 'গড়', color: T.green },
      { bn: 'গড় স্কোর', en: 'Avg score', val: toBn(avgScore), sub: '/১০০০', color: T.gold },
      { bn: 'মিথ্যা সনাক্ত', en: 'Lie-flags', val: `${toBn(flagRate)}%`, sub: 'হার', color: T.coral },
    ];
  }, [dbStats, decisions]);

  const recentActivity = useMemo(() => {
    if (!decisions.length) return RECENT_ACTIVITY;
    return decisions.slice(0, 3).map(d => ({
      type: 'assessment',
      bn: `${d.applicantId} — ${d.outcome === 'approved' ? 'মূল্যায়ন অনুমোদিত' : d.outcome === 'declined' ? 'মূল্যায়ন প্রত্যাখ্যাত' : 'পুনর্বিবেচনায়'}`,
      score: d.score,
      rating: d.rating,
      time: d.dateEn || new Date(d.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      icon: d.outcome === 'approved' ? '✓' : d.outcome === 'declined' ? '✗' : '⋯',
      color: d.outcome === 'approved' ? T.green : d.outcome === 'declined' ? T.coral : T.amber,
    }));
  }, [decisions]);

  const displayName = user?.user_metadata?.full_name || PO_PROFILE.name;
  const displayNameEn = PO_PROFILE.nameEn;
  const displayPhone = user?.phone || PO_PROFILE.phone;

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Hero gradient header */}
        <LinearGradient
          colors={[T.navy, T.navy2]}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ paddingTop: 54, paddingHorizontal: 20, paddingBottom: 32 }}>
          

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {/* Profile photo */}
            <Pressable
              onPress={() => pickProfilePhoto(setProfilePhoto)}
              style={{
                width: 90, height: 90, borderRadius: 45,
                backgroundColor: T.teal,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
                shadowColor: T.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
                overflow: 'hidden',
                marginBottom: 14,
              }}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={{ width: 90, height: 90 }} resizeMode="cover" />
              ) : (
                <Text style={{ fontFamily: T.fHead, fontSize: 32, color: T.navy }}>KH</Text>
              )}
            </Pressable>

            <Text style={{ fontFamily: T.fBnBlack, fontSize: 22, color: '#fff', marginBottom: 4 }}>
              {displayName}
            </Text>
            <Text style={{ fontFamily: T.fBody, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
              {displayNameEn}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip color={T.teal} size={9}>{PO_PROFILE.id}</Chip>
              <Chip color={T.gold} size={9}>{PO_PROFILE.designation}</Chip>
            </View>
          </View>

          {/* Quick info */}
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}>
            {[
              { icon: '🏢', label: PO_PROFILE.branch },
              { icon: '📍', label: PO_PROFILE.region },
              { icon: '📱', label: displayPhone },
              { icon: '👤', label: PO_PROFILE.supervisor + ' — সুপারভাইজার' },
            ].map((item, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 7,
                borderBottomWidth: i < 3 ? 1 : 0,
                borderBottomColor: 'rgba(255,255,255,0.06)',
              }}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 12, color: 'rgba(255,255,255,0.75)', flex: 1 }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ padding: 16 }}>

          {/* Performance metrics */}
          <View style={{ marginBottom: 16 }}>
            <BilingualLabel bn="পারফরমেন্স (এই মাস)" en="Performance — current month" sizeBn={14} sizeEn={10} weight="700" style={{ marginBottom: 10, paddingHorizontal: 2 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {perf.map((p, i) => (
                <View key={i} style={{
                  width: '47%', flexGrow: 1,
                  backgroundColor: '#fff', borderRadius: 14,
                  borderWidth: 1, borderColor: T.border,
                  borderLeftWidth: 3, borderLeftColor: p.color,
                  paddingVertical: 12, paddingHorizontal: 14,
                }}>
                  <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3, marginBottom: 3 }}>{p.bn}</Text>
                  <Text style={{ fontFamily: T.fHead, fontSize: 24, color: p.color, lineHeight: 26 }}>{p.val}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: T.ink4, marginTop: 2 }}>{p.sub} · {p.en}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent activity */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 14,
            borderWidth: 1, borderColor: T.border,
            padding: 14, marginBottom: 16,
          }}>
            <BilingualLabel bn="সাম্প্রতিক কার্যক্রম" en="Recent activity" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
            {recentActivity.map((a, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i < RECENT_ACTIVITY.length - 1 ? 1 : 0,
                borderBottomColor: T.border,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: a.color + '20',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 14, color: a.color }}>{a.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink, lineHeight: 18 }}>{a.bn}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginTop: 2 }}>{a.time}</Text>
                </View>
                {a.score != null ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: T.fHead, fontSize: 18, color: T.teal }}>{a.score}</Text>
                    <Chip color={T.teal} size={8}>{a.rating}</Chip>
                  </View>
              ) : null}
              </View>
            ))}
          </View>

          {/* Certifications */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 14,
            borderWidth: 1, borderColor: T.border,
            padding: 14, marginBottom: 16,
          }}>
            <BilingualLabel bn="সনদ ও প্রশিক্ষণ" en="Certifications & Training" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
            {CERTIFICATIONS.map((c, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 9,
                borderBottomWidth: i < CERTIFICATIONS.length - 1 ? 1 : 0,
                borderBottomColor: T.border,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: c.color + '20',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16 }}>🎓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{c.bn}</Text>
                  <Text style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontStyle: 'italic', marginTop: 1 }}>{c.en}</Text>
                </View>
                <Chip color={c.color} size={8}>{c.year}</Chip>
              </View>
            ))}
          </View>

          {/* Freya AI section */}
          <View style={{
            backgroundColor: T.navy, borderRadius: 14, padding: 14, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <FreyaOrb size={32} pulse />
              <View>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal, letterSpacing: 1.5 }}>FREYA · AI ASSISTANT</Text>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>আপনার AI সহকারী</Text>
              </View>
            </View>
            <Text style={{ fontFamily: T.fBn, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 19, marginBottom: 10 }}>
              এই মাসে Freya আপনার ১৪৭টি মূল্যায়নে সহায়তা করেছে। সনাক্তকরণ নির্ভুলতা: ৯৪.২%
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { bn: 'সঠিক সিদ্ধান্ত', val: '৯৪.২%', color: T.teal },
                { bn: 'অসঙ্গতি ধরেছে', val: '১৯টি', color: T.coral },
                { bn: 'সাশ্রয়', val: '৩.২ লাখ', color: T.gold },
              ].map((s, i) => (
                <View key={i} style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: 10, alignItems: 'center',
                }}>
                  <Text style={{ fontFamily: T.fHead, fontSize: 16, color: s.color }}>{s.val}</Text>
                  <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: 'rgba(255,255,255,0.55)', marginTop: 3, textAlign: 'center' }}>{s.bn}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Settings */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 14,
            borderWidth: 1, borderColor: T.border,
            padding: 14, marginBottom: 16,
          }}>
            <BilingualLabel bn="সেটিংস" en="App Settings" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />

            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: T.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink }}>অফলাইন মোড</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3, marginTop: 2 }}>ইন্টারনেট ছাড়াও কাজ করুন</Text>
              </View>
              <Switch
                value={tweaks.offline}
                onValueChange={(v) => setTweaks({ offline: v })}
                trackColor={{ false: T.border2, true: T.teal + '80' }}
                thumbColor={tweaks.offline ? T.teal : '#f4f3f4'}
              />
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 12,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink }}>ট্রেনিং মোড</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3, marginTop: 2 }}>প্রশিক্ষণার্থীদের জন্য মোড</Text>
              </View>
              <Switch
                value={tweaks.trainingMode}
                onValueChange={(v) => setTweaks({ trainingMode: v })}
                trackColor={{ false: T.border2, true: T.gold + '80' }}
                thumbColor={tweaks.trainingMode ? T.gold : '#f4f3f4'}
              />
            </View>
          </View>

          {/* PKSF system info */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 14,
            borderWidth: 1, borderColor: T.border,
            padding: 14, marginBottom: 16,
          }}>
            <BilingualLabel bn="সিস্টেম তথ্য" en="PKSF System Info" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
            {[
              { label: 'সংস্করণ', value: 'v1.0.4 · Build 2026.04' },
              { label: 'ডেটা সংযোগ', value: 'PKSF IMIS · সংযুক্ত' },
              { label: 'শেষ সিঙ্ক', value: 'আজ ৩:৪৫ PM' },
              { label: 'স্থানীয় ডেটা', value: '৪৭টি রেকর্ড' },
              { label: 'যোগদানের তারিখ', value: PO_PROFILE.joinDate },
            ].map((item, i, arr) => (
              <View key={i} style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 9,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: T.border,
              }}>
                <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink3 }}>{item.label}</Text>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: T.ink }}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Data reset */}
          {showConfirmReset ? (
            <View style={{
              backgroundColor: 'rgba(224,79,79,0.08)',
              borderWidth: 1, borderColor: 'rgba(224,79,79,0.3)',
              borderRadius: 14, padding: 16, marginBottom: 16,
            }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.coral, marginBottom: 8 }}>
                নিশ্চিত করুন — সব ডেটা মুছে যাবে!
              </Text>
              <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, lineHeight: 19, marginBottom: 14 }}>
                সমস্ত স্থানীয় উত্তর ও সেটিংস মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowConfirmReset(false)}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 10,
                    borderWidth: 1, borderColor: T.border2, backgroundColor: '#fff',
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: T.ink2 }}>বাতিল</Text>
                </Pressable>
                <Pressable
                  onPress={() => { resetAll(); setShowConfirmReset(false); }}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 10,
                    backgroundColor: T.coral, alignItems: 'center',
                  }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>মুছে দিন</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Logout / Reset */}
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => setShowConfirmReset(true)}
              style={{
                paddingVertical: 14, borderRadius: 12,
                borderWidth: 1.5, borderColor: 'rgba(224,79,79,0.3)',
                backgroundColor: '#fff',
                alignItems: 'center',
              }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: T.coral }}>↺ ডেটা রিসেট</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/login')}
              style={{
                paddingVertical: 14, borderRadius: 12,
                backgroundColor: T.navy, alignItems: 'center',
              }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: '#fff' }}>→ লগআউট</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
