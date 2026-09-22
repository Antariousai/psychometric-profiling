import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { T } from '../constants/tokens';

export function OfflineBanner({ pendingSync }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.2, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(o);
  }, [o]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <LinearGradient
      colors={['#E87461', '#C83A2A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingVertical: 6, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      }}>
      <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }, dotStyle]} />
      <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: '#fff' }}>অফলাইন</Text>
      <Text style={{ fontFamily: T.fBodySemi, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
        · {pendingSync} pending sync
      </Text>
      <Text style={{
        marginLeft: 'auto',
        fontFamily: T.fMonoBold, fontSize: 9, color: '#fff',
        letterSpacing: 1,
      }}>WILL SYNC WHEN ONLINE</Text>
    </LinearGradient>
  );
}

export function SyncQueueBanner({ pendingSync, onSyncPress, syncing }) {
  if (!pendingSync) return null;
  return (
    <LinearGradient
      colors={[T.teal, '#0D9488']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingVertical: 8, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
      <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: '#fff' }}>
        সিঙ্ক বাকি · {pendingSync}
      </Text>
      <Text style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.88)', flex: 1 }}>
        Pending upload · tap to retry
      </Text>
      <Pressable
        onPress={onSyncPress}
        disabled={syncing}
        style={{
          paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.2)',
          minHeight: 44,
          justifyContent: 'center',
        }}>
        {syncing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: '#fff' }}>সিঙ্ক</Text>
        )}
      </Pressable>
    </LinearGradient>
  );
}

export function TrainingBanner() {
  return (
    <LinearGradient
      colors={[T.gold, '#D4925C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingVertical: 6, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      }}>
      <Text style={{ fontFamily: T.fBnBold, fontSize: 12, color: '#fff' }}>◉ প্রশিক্ষণ মোড</Text>
      <Text style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.9)' }}>
        · TRAINING · no real data saved
      </Text>
    </LinearGradient>
  );
}
