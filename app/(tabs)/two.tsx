import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function MatchesScreen() {
  const [signingOut, setSigningOut] = useState(false);
  const [skipping, setSkipping] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Root layout's useSession listener handles redirect to /(auth)/sign-in
  }

  async function handleSkipOnboarding() {
    setSkipping(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSkipping(false); return; }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();
    if (!userData) { setSkipping(false); return; }

    await supabase
      .from('profiles')
      .update({ onboarding_step: 'complete', vibe_check_passed: true })
      .eq('user_id', userData.id);

    router.replace('/(tabs)');
  }

  const busy = signingOut || skipping;

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>no disasters yet. keep swiping.</Text>

      <Pressable
        style={[styles.devButton, skipping && styles.buttonDisabled]}
        onPress={handleSkipOnboarding}
        disabled={busy}
      >
        {skipping
          ? <ActivityIndicator size="small" color={Colors.textMuted} />
          : <Text style={styles.devButtonText}>skip onboarding [dev]</Text>
        }
      </Pressable>

      <Pressable
        style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={busy}
      >
        {signingOut
          ? <ActivityIndicator size="small" color={Colors.textMuted} />
          : <Text style={styles.signOutText}>sign out</Text>
        }
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  placeholder: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  devButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  devButtonText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  signOutText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
