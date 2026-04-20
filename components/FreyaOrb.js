import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';

const COIN = require('../assets/images/freya-coin.png');

export default function FreyaOrb({ size = 44, pulse = true, style }) {
  const s = useSharedValue(1);

  useEffect(() => {
    if (!pulse) return;
    s.value = withRepeat(
      withTiming(1.22, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(s);
  }, [pulse, s]);

  const glowOuter = useAnimatedStyle(() => ({
    opacity: 0.05 + (s.value - 1) * 0.35,
    transform: [{ scale: s.value * 1.55 }],
  }));
  const glowInner = useAnimatedStyle(() => ({
    opacity: 0.12 + (s.value - 1) * 0.5,
    transform: [{ scale: s.value * 1.28 }],
  }));

  return (
    <View style={[{
      width: size, height: size, alignItems: 'center', justifyContent: 'center',
    }, style]}>
      {pulse ? (
        <>
          <Animated.View
            style={[{
              position: 'absolute', width: size, height: size,
              borderRadius: size / 2, backgroundColor: '#2EC4B6',
            }, glowOuter]}
          />
          <Animated.View
            style={[{
              position: 'absolute', width: size, height: size,
              borderRadius: size / 2, backgroundColor: '#2EC4B6',
            }, glowInner]}
          />
        </>
      ) : null}
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        overflow: 'hidden', backgroundColor: '#0F1829',
        shadowColor: '#2EC4B6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 6,
      }}>
        <Image
          source={COIN}
          style={{ width: size * 1.15, height: size * 1.15, marginLeft: -size * 0.075, marginTop: -size * 0.075 }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}
