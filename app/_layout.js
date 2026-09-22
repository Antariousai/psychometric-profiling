import '../global.css';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as usePlayfair, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display';
import { Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { NotoSansBengali_600SemiBold, NotoSansBengali_700Bold, NotoSansBengali_800ExtraBold } from '@expo-google-fonts/noto-sans-bengali';
import { HindSiliguri_600SemiBold } from '@expo-google-fonts/hind-siliguri';
import { AppProvider, useApp } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import RootErrorBoundary from '../components/RootErrorBoundary';
import { T } from '../constants/tokens';
import { mustRequireStaffLogin } from '../lib/requireStaffAuth';

SplashScreen.preventAutoHideAsync();

function RootStackScreens() {
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

function BootstrapStack() {
  const pathname = usePathname();
  const { hydrated } = useApp();
  const { session, initializing } = useAuth();
  const needStaffAuth = mustRequireStaffLogin();

  useEffect(() => {
    if (hydrated && !initializing) SplashScreen.hideAsync();
  }, [hydrated, initializing]);

  if (!hydrated || initializing) {
    return <View style={{ flex: 1, backgroundColor: T.navy }} />;
  }

  const guestsOnly =
    pathname === '/' ||
    pathname === '' ||
    pathname === '/login' ||
    pathname === '/otp' ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/otp');

  if (needStaffAuth && !session?.user && !guestsOnly) {
    return <Redirect href="/login" />;
  }

  if (
    needStaffAuth &&
    session?.user &&
    (pathname === '/login' || pathname === '/otp')
  ) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <RootStackScreens />
    </>
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
    <RootErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <BootstrapStack />
        </AppProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
