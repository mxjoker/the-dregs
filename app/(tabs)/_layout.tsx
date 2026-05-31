import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
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
      if (!profileData) return;

      setUserId(userData.id);
      setProfileId(profileData.id);
    })();
  }, [sessionState.status]);

  if (!userId || !profileId) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <OnboardingProvider userId={userId} profileId={profileId}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.accent,
          tabBarStyle: { backgroundColor: Colors.bg, borderTopColor: Colors.border },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'discover', tabBarLabel: 'discover' }}
        />
        <Tabs.Screen
          name="two"
          options={{ title: 'matches', tabBarLabel: 'matches' }}
        />
      </Tabs>
    </OnboardingProvider>
  );
}
