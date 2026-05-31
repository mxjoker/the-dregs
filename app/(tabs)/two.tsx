import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function MatchesScreen() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Root layout's useSession listener handles redirect to /(auth)/sign-in
  }

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>no disasters yet. keep swiping.</Text>

      <Pressable
        style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
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
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  signOutButtonDisabled: {
    opacity: 0.4,
  },
  signOutText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
