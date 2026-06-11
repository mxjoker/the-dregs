import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { fetchDiscardPile, type DiscoverProfile } from '@/lib/discover';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

export default function SecondThoughtsScreen() {
  const insets = useSafeAreaInsets();
  const sessionState = useSession();
  const authId = sessionState.status === 'authenticated' ? sessionState.session.user.id : null;
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const viewerProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId!)
        .single();
      if (!userData) return;

      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .single();
      if (!data) return;
      viewerProfileIdRef.current = data.id;
      const pile = await fetchDiscardPile(data.id);
      setProfiles(pile);
      setLoading(false);
    }
    if (authId) load();
  }, [authId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>second thoughts</Text>
        <View style={{ width: 32 }} />
      </View>

      {profiles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            nothing here. you either like everyone or you're lying to yourself.
          </Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={p => p.profileId}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/discover/full-profile',
                  params: { profileId: item.profileId },
                })
              }
            >
              {item.primaryPhotoUrl ? (
                <Image source={{ uri: item.primaryPhotoUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>
                  {item.displayName},{' '}
                  <Text style={styles.rowAge}>"{item.age}"</Text>
                </Text>
                {item.flags[0] && (
                  <Text style={styles.rowFlag}>🚩 {item.flags[0].label}</Text>
                )}
              </View>
              <View style={styles.chaosPill}>
                <Text style={styles.chaosPillText}>{item.chaosScore}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { fontSize: 20, color: Colors.textPrimary, width: 32 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  muted: { color: Colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  thumbPlaceholder: { backgroundColor: Colors.surface },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowAge: { fontWeight: '400', opacity: 0.7 },
  rowFlag: { fontSize: 12, color: '#ff7099' },
  chaosPill: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chaosPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff6b00',
  },
});
