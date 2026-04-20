import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import BilingualLabel from '../components/BilingualLabel';
import Chip from '../components/Chip';
import FreyaButton from '../components/FreyaButton';
import { bn as toBn } from '../utils/format';

const VISITS = [
  {
    name: 'নাসরিন বেগম', village: 'কমলগঞ্জ, সিলেট', avatar: 'ন', tint: '#C2694F',
    time: 'আজ ১০:২৪ AM', lat: '24.3745', lng: '91.7364',
    photos: 3, status: 'completed', attendance: true,
  },
  {
    name: 'শিমা আক্তার', village: 'রংপুর সদর', avatar: 'শি', tint: '#B5874F',
    time: 'আজ ২:১৫ PM', lat: '25.7434', lng: '89.2513',
    photos: 2, status: 'completed', attendance: true,
  },
  {
    name: 'রফিক উদ্দিন', village: 'কক্সবাজার', avatar: 'র', tint: '#5E8C41',
    time: 'আগামীকাল ১১টা', lat: '-', lng: '-',
    photos: 0, status: 'pending', attendance: false,
  },
];

const CHECKLIST = [
  { task: 'আবেদনকারীর ব্যবসা স্থল পরিদর্শন', done: true },
  { task: 'ব্যবসার ছবি তোলা (কমপক্ষে ৩টি)', done: true },
  { task: 'জমির কাগজপত্র দেখা', done: true },
  { task: 'পরিবার ও গ্যারান্টর যাচাই', done: false },
  { task: 'কেন্দ্র সভায় উপস্থিতি নিশ্চিত', done: true },
  { task: 'PKSF IMIS-এ রিপোর্ট আপলোড', done: false },
];

export default function FieldVisitScreen() {
  const router = useRouter();
  const [tracking, setTracking] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(0);
  const visit = VISITS[selectedVisit];

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'ফিল্ড ভিজিট ট্র্যাকার', en: 'Geo-Tracked Field Visits' }}
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: tracking ? T.green : T.coral,
            }} />
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: tracking ? T.green : T.coral }}>
              {tracking ? 'LIVE' : 'OFF'}
            </Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

        {/* Map mock */}
        <Pressable
          onPress={() => setTracking(v => !v)}
          style={{
            height: 190, borderRadius: 18, overflow: 'hidden',
            marginBottom: 14, backgroundColor: '#1A3A2E',
          }}>
          {/* Fake map grid */}
          {Array.from({ length: 6 }).map((_, r) => (
            <View key={r} style={{
              position: 'absolute', left: 0, right: 0,
              top: r * 32, height: 1,
              backgroundColor: 'rgba(46,196,182,0.1)',
            }} />
          ))}
          {Array.from({ length: 8 }).map((_, c) => (
            <View key={c} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: c * 48, width: 1,
              backgroundColor: 'rgba(46,196,182,0.1)',
            }} />
          ))}
          {/* GPS pins */}
          {VISITS.filter(v => v.status === 'completed').map((v, i) => (
            <View key={i} style={{
              position: 'absolute',
              top: 40 + i * 55, left: 60 + i * 80,
              alignItems: 'center',
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: v.tint, borderWidth: 2, borderColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: T.fBnBlack, fontSize: 11, color: '#fff' }}>{v.avatar}</Text>
              </View>
              <View style={{ width: 2, height: 8, backgroundColor: v.tint }} />
              <View style={{ width: 6, height: 3, backgroundColor: v.tint + '88', borderRadius: 3 }} />
            </View>
          ))}
          {/* Current location */}
          {tracking && (
            <View style={{
              position: 'absolute', bottom: 30, right: 50, alignItems: 'center',
            }}>
              <View style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: T.teal, borderWidth: 3, borderColor: '#fff',
              }} />
              <View style={{
                position: 'absolute', width: 30, height: 30, borderRadius: 15,
                backgroundColor: 'rgba(46,196,182,0.2)', top: -8, left: -8,
              }} />
            </View>
          )}
          {/* Map label */}
          <View style={{
            position: 'absolute', bottom: 12, left: 12,
            backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: tracking ? T.teal : T.coral, letterSpacing: 0.5 }}>
              {tracking ? '● GPS TRACKING ACTIVE' : '○ GPS PAUSED — TAP TO RESUME'}
            </Text>
          </View>
        </Pressable>

        {/* Today's visits */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <BilingualLabel bn="আজকের পরিদর্শন" en="Today's field visits" sizeBn={13} sizeEn={10} weight="700" />
            <Chip color={T.green} size={8.5}>{toBn(VISITS.filter(v => v.status === 'completed').length)}/{toBn(VISITS.length)} সম্পন্ন</Chip>
          </View>
          {VISITS.map((v, i) => (
            <Pressable key={i} onPress={() => setSelectedVisit(i)}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i < VISITS.length - 1 ? 1 : 0, borderBottomColor: T.border,
                backgroundColor: selectedVisit === i ? T.cream : 'transparent',
                borderRadius: 8, paddingHorizontal: selectedVisit === i ? 8 : 0,
              }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 10, backgroundColor: v.tint,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: T.fBnBlack, fontSize: 14, color: '#fff' }}>{v.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.ink }}>{v.name}</Text>
                  <Text style={{ fontFamily: T.fBn, fontSize: 10.5, color: T.ink3 }}>{v.village}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginTop: 2 }}>{v.time}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Chip color={v.status === 'completed' ? T.green : T.gold} size={8}>
                    {v.status === 'completed' ? '✓ সম্পন্ন' : 'বাকি'}
                  </Chip>
                  {v.photos > 0 && (
                    <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4 }}>
                      📷 {toBn(v.photos)}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Selected visit detail */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn={`${visit.name} — বিস্তারিত`} en="Visit detail" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'অক্ষাংশ', val: visit.lat },
              { label: 'দ্রাঘিমা', val: visit.lng },
              { label: 'ছবি', val: toBn(visit.photos) + 'টি' },
            ].map((item, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: T.cream2, borderRadius: 10, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 12, color: T.ink }}>{item.val}</Text>
                <Text style={{ fontFamily: T.fBn, fontSize: 9.5, color: T.ink3, marginTop: 3 }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Photo placeholders */}
          {visit.photos > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {Array.from({ length: visit.photos }).map((_, i) => (
                <View key={i} style={{
                  flex: 1, height: 60, borderRadius: 10,
                  backgroundColor: T.cream2, borderWidth: 1, borderColor: T.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>🖼</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={{
            backgroundColor: T.tealBg, borderRadius: 10,
            paddingVertical: 10, paddingHorizontal: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>📷</Text>
            <Text style={{ fontFamily: T.fBnBold, fontSize: 12.5, color: T.teal2 }}>নতুন ছবি তুলুন</Text>
          </Pressable>
        </View>

        {/* Checklist */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: T.border,
          padding: 14, marginBottom: 14,
        }}>
          <BilingualLabel bn="পরিদর্শন চেকলিস্ট" en="Visit checklist" sizeBn={13} sizeEn={10} weight="700" style={{ marginBottom: 12 }} />
          {CHECKLIST.map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 8,
              borderBottomWidth: i < CHECKLIST.length - 1 ? 1 : 0, borderBottomColor: T.border,
            }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: item.done ? T.tealBg : T.cream2,
                borderWidth: 1.5, borderColor: item.done ? T.teal : T.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {item.done && <Text style={{ color: T.teal, fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={{
                flex: 1, fontFamily: T.fBn, fontSize: 12,
                color: item.done ? T.ink3 : T.ink,
                textDecorationLine: item.done ? 'line-through' : 'none',
              }}>{item.task}</Text>
            </View>
          ))}
        </View>

        {/* IMIS sync */}
        <LinearGradient
          colors={['#0D2B1D', '#162F22']}
          style={{ borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>☁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>PKSF IMIS সিঙ্ক</Text>
              <Text style={{ fontFamily: T.fBn, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                শেষ সিঙ্ক: আজ ৩:৪৫ PM · ৪৭টি রেকর্ড আপলোড হয়েছে
              </Text>
            </View>
            <Chip color={T.green} size={8.5}>✓ সিঙ্কড</Chip>
          </View>
        </LinearGradient>

        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: T.leaf, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: '#fff' }}>রিপোর্ট IMIS-এ পাঠান →</Text>
        </Pressable>
      </ScrollView>
      <FreyaButton screen="dashboard" />
    </View>
  );
}
