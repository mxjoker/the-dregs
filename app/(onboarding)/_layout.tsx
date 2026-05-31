import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

export default function OnboardingLayout() {
  const sessionState = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionState.status !== 'authenticated') return;
    const authId = sessionState.session.user.id;

    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single();
      if (!userData) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      setUserId(userData.id);
      setProfileId(profileData?.id ?? null);
    })();
  }, [sessionState.status]);

  if (!userId) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <OnboardingProvider userId={userId} profileId={profileId}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </OnboardingProvider>
  );
}
