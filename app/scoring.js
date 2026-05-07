import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { T } from '../constants/tokens';
import { useApp } from '../context/AppContext';
import FreyaOrb from '../components/FreyaOrb';

const MESSAGES = [
  { bn: 'উত্তরগুলো পড়ে দেখছি…', en: 'Analyzing responses…', icon: '◐' },
  { bn: 'দুই জায়গার কথা মিলছে কি না দেখছি…', en: 'Checking consistency pairs…', icon: '⟷' },
  { bn: 'কোন প্রশ্নে কত সময় নিলেন, দেখছি…', en: 'Validating response times…', icon: '⏱' },
  { bn: 'আগের কেসগুলোর সাথে মিলিয়ে দেখছি…', en: 'Cross-referencing portfolio history…', icon: '◫' },
  { bn: 'ঋণের একটা সুপারিশ তৈরি করছি…', en: 'Generating loan recommendation…', icon: '⟐' },
];

function BlinkDot() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.2, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(o);
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: T.teal,
    }, s]} />
  );
}

export default function ScoringScreen() {
  const router = useRouter();
  const { applicant } = useApp();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= MESSAGES.length) {
      const t = setTimeout(() => router.replace('/result'), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 750);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <View style={{ flex: 1, backgroundColor: T.navy, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <StatusBar style="light" />
      <View style={{
        position: 'absolute', width: 400, height: 400, borderRadius: 200,
        backgroundColor: 'rgba(46,196,182,0.12)', top: 100,
      }} />
      <View style={{ alignItems: 'center', zIndex: 2 }}>
        <FreyaOrb size={100} pulse />
        <Text style={{
          fontFamily: T.fMonoBold, fontSize: 9.5, color: T.teal,
          letterSpacing: 2.5, marginTop: 28, marginBottom: 10,
        }}>FREYA · PSYCHOMETRIC AGENT</Text>
        <Text style={{
          fontFamily: T.fBnBlack, fontSize: 22, color: '#fff',
          textAlign: 'center', marginBottom: 30, lineHeight: 30,
        }}>
          {applicant.name}-এর{'\n'}প্রোফাইল একটু দেখে নিচ্ছি…
        </Text>
        <View style={{ width: 280 }}>
          {MESSAGES.map((m, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6,
                  backgroundColor: done ? 'rgba(46,196,182,0.12)' : current ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  borderWidth: 1,
                  borderColor: done ? T.teal : current ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  opacity: i <= step ? 1 : 0.3,
                }}>
                <Text style={{
                  fontSize: 14,
                  color: done ? T.teal : current ? '#fff' : 'rgba(255,255,255,0.3)',
                }}>{done ? '✓' : m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: T.fBnBold, fontSize: 11.5, color: '#fff' }}>{m.bn}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 8.5, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                    {m.en}
                  </Text>
                </View>
                {current ? <BlinkDot /> : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
