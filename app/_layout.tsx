import 'react-native-url-polyfill/auto';
import { DarkTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useSession } from '@/hooks/useSession';

export { ErrorBoundary } from 'expo-router';

// Keep splash visible until we're ready to route
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const sessionState = useSession();

  const isReady =
    (fontsLoaded || !!fontError) && sessionState.status !== 'loading';

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();
    if (sessionState.status === 'unauthenticated') {
      router.replace('/(auth)/sign-in');
    } else if (sessionState.status === 'authenticated') {
      // TODO: check onboarding_step here once onboarding is built
      router.replace('/(tabs)');
    }
  }, [isReady, sessionState.status]);

  if (!isReady) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
