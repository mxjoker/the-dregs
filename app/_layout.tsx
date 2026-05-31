import 'react-native-url-polyfill/auto';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

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
      return;
    }

    if (sessionState.status === 'authenticated') {
      const authId = sessionState.session.user.id;

      (async () => {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authId)
          .single();

        if (!userData) {
          router.replace('/(auth)/sign-in');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, vibe_check_passed')
          .eq('user_id', userData.id)
          .single();

        if (!profile) {
          router.replace('/(onboarding)/basics');
          return;
        }

        const { onboarding_step, vibe_check_passed } = profile;

        if (onboarding_step === 'complete' && vibe_check_passed) {
          router.replace('/(tabs)');
          return;
        }

        const stepRoutes: Record<string, string> = {
          not_started: '/(onboarding)/basics',
          basics: '/(onboarding)/disaster-profile',
          disaster_profile: '/(onboarding)/ex-reviews',
          ex_reviews: '/(onboarding)/prompts',
          prompts: '/(onboarding)/vibe-check',
          complete: '/(onboarding)/vibe-check',
        };

        router.replace(stepRoutes[onboarding_step] as any);
      })();
    }
  }, [isReady, sessionState.status]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="discover/full-profile" options={{ headerShown: false }} />
          <Stack.Screen name="discover/second-thoughts" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
