import '../global.css';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as usePlayfair, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display';
import { Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { NotoSansBengali_600SemiBold, NotoSansBengali_700Bold, NotoSansBengali_800ExtraBold } from '@expo-google-fonts/noto-sans-bengali';
import { HindSiliguri_600SemiBold } from '@expo-google-fonts/hind-siliguri';
import { AppProvider, useApp } from '../context/AppContext';
import { T } from '../constants/tokens';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { hydrated } = useApp();
  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: T.navy }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.cream } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="intake" />
      <Stack.Screen name="assessment" />
      <Stack.Screen name="scoring" options={{ gestureEnabled: false }} />
      <Stack.Screen name="result" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="credit" />
      <Stack.Screen name="repayment" />
      <Stack.Screen name="fieldvisit" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = usePlayfair({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
    NotoSansBengali_800ExtraBold,
    HindSiliguri_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <AppProvider>
      <StatusBar style="auto" />
      <RootStack />
    </AppProvider>
  );
}
