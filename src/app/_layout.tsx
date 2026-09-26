import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStoreProvider, useAppStore } from '../store/AppStore';
import { colors } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function WhenReady({ fontsReady, children }: { fontsReady: boolean; children: ReactNode }) {
  const { ready } = useAppStore();
  useEffect(() => {
    if (fontsReady && ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady, ready]);
  return fontsReady && ready ? <>{children}</> : null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <WhenReady fontsReady={loaded || !!error}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          />
        </WhenReady>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
