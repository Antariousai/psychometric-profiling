import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import BilingualLabel from '../components/BilingualLabel';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';
import { bn as toBn } from '../utils/format';

const AT_RISK = [
  { name: 'রফিক উদ্দিন', village: 'কক্সবাজার', emi: 1200, overdue: 14, risk: 'high', avatar: 'র', tint: '#5E8C41' },
  { name: 'করিম মিয়া', village: 'নোয়াখালী', emi: 800, overdue: 7, risk: 'medium', avatar: 'ক', tint: '#B5874F' },
  { name: 'হাবিবুর', village: 'ময়মনসিংহ', emi: 1500, overdue: 3, risk: 'low', avatar: 'হ', tint: '#2EC4B6' },
];

const JLG_GROUPS = [
  { name: 'আনার গ্রুপ', members: 5, center: 'কমলগঞ্জ', collected: 4, total: 5, meeting: 'শুক্রবার ১০টা' },
  { name: 'সুমাইয়া গ্রুপ', members: 7, center: 'ভরুয়াখালী', collected: 7, total: 7, meeting: 'বৃহস্পতিবার ১১টা' },
  { name: 'মর্জিনা গ্রুপ', members: 6, center: 'রংপুর', collected: 5, total: 6, meeting: 'বুধবার ৯টা' },
];

export default function RepaymentScreen() {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState(true);
  const [sms, setSms] = useState(true);
  const [autoRemind, setAutoRemind] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'পরিশোধ পূর্বাভাস', en: 'Repayment Prediction & Alerts' }}
        onBack={() => router.back()}
        right={<Chip color={T.violet}>AUTO</Chip>}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

        {/* Summary hero */}
        <LinearGradient
          colors={['#3B1F5E', '#1A0A35']}
          style={{ borderRadius: 20, padding: 18, marginBottom: 14 }}>
          <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: '#B39DDB', letterSpacing: 1.5, marginBottom: 6 }}>
            AI FORECAST · NEXT 30 DAYS
          </Text>
          <Text style={{ fontFamily: T.fBnBlack, fontSize: 18, color: '#fff', marginBottom: 16 }}>
            পরিশোধ পূর্বাভাস
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { val: '৮৯%', label: 'সময়মতো সম্ভাবনা', color: T.green },
              { val: '৩', label: 'ঝুঁকিপূর্ণ ঋণগ্রহীতা', color: T.coral },
              { val: '৪৭', label: 'স্বয়ংক্রিয় রিমাইন্ডার', color: '#B39DDB' },
            ].map((s, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 10, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontFamily: T.fHead, fontSize: 20, color: s.color }}>{s.val}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: 'rgba(255,255,255,0.55)', marginTop: 4, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Alert settings */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="স্বয়ংক্রিয় সতর্কতা" en="Automated alerts" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          {[
            { label: 'WhatsApp রিমাইন্ডার', sub: 'EMI তারিখের ৩ দিন আগে', val: whatsapp, set: setWhatsapp, color: '#25D366' },
            { label: 'SMS বার্তা', sub: 'EMI তারিখের দিন সকাল ৮টায়', val: sms, set: setSms, color: T.gold },
            { label: 'স্বয়ংক্রিয় রিমাইন্ড', sub: 'AI-নির্ধারিত সময়ে পাঠাও', val: autoRemind, set: setAutoRemind, color: T.violet },
          ].map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 11,
              borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: T.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink }}>{item.label}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3, marginTop: 2 }}>{item.sub}</Text>
              </View>
              <Switch
                value={item.val}
                onValueChange={item.set}
                trackColor={{ false: T.border, true: item.color + '66' }}
                thumbColor={item.val ? item.color : '#fff'}
              />
            </View>
          ))}
        </View>

        {/* At-risk borrowers */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <BilingualLabel bn="ঝুঁকিপূর্ণ ঋণগ্রহীতা" en="At-risk borrowers" sizeBn={13} sizeEn={10} weight="700" />
            <Chip color={T.coral} size={8.5}>{toBn(AT_RISK.length)} জন</Chip>
          </View>
          {AT_RISK.map((r, i) => {
            const riskColor = r.risk === 'high' ? T.coral : r.risk === 'medium' ? T.amber : T.green;
            return (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i < AT_RISK.length - 1 ? 1 : 0, borderBottomColor: T.border,
              }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 10, backgroundColor: r.tint,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: T.fBnBlack, fontSize: 16, color: '#fff' }}>{r.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink }}>{r.name}</Text>
                  <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3 }}>{r.village}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 11, color: T.ink }}>৳{toBn(r.emi)}/মাস</Text>
                  <Chip color={riskColor} size={8}>{toBn(r.overdue)} দিন বাকি</Chip>
                </View>
                <Pressable style={{
                  backgroundColor: '#25D366' + '22', borderRadius: 8,
                  paddingVertical: 6, paddingHorizontal: 10,
                }}>
                  <Text style={{ fontSize: 14 }}>💬</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* JLG Groups */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="JLG গ্রুপ সমন্বয়" en="Joint Liability Group coordination" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          {JLG_GROUPS.map((g, i) => (
            <View key={i} style={{
              paddingVertical: 10,
              borderBottomWidth: i < JLG_GROUPS.length - 1 ? 1 : 0, borderBottomColor: T.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink }}>{g.name}</Text>
                <Chip color={g.collected === g.total ? T.green : T.amber} size={8.5}>
                  {toBn(g.collected)}/{toBn(g.total)} সংগ্রহ
                </Chip>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3 }}>
                  {g.center} · {toBn(g.members)} সদস্য
                </Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink4 }}>
                  {g.meeting}
                </Text>
              </View>
              <View style={{ marginTop: 6, height: 4, backgroundColor: T.cream2, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{
                  width: `${(g.collected / g.total) * 100}%`, height: '100%',
                  backgroundColor: g.collected === g.total ? T.green : T.amber, borderRadius: 2,
                }} />
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: T.violet, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: '#fff' }}>সব রিমাইন্ডার পাঠান →</Text>
        </Pressable>
      </ScrollView>
      <FreyaButton screen="analytics" />
    </View>
  );
}
