import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { FullProfileView } from '@/components/discover/FullProfileView';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { ButWhySheet } from '@/components/discover/ButWhySheet';
import {
  fetchProfiles,
  recordSwipe,
  type DiscoverProfile,
} from '@/lib/discover';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

export default function FullProfileScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const insets = useSafeAreaInsets();
  const sessionState = useSession();
  const authId = sessionState.status === 'authenticated' ? sessionState.session.user.id : null;

  const [profile, setProfile] = useState<DiscoverProfile | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [showButWhy, setShowButWhy] = useState(false);
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

      const [loaded] = await fetchProfiles([profileId], data.id);
      if (loaded) setProfile(loaded);
    }
    if (authId && profileId) load();
  }, [authId, profileId]);

  async function handleSwipe(direction: 'like' | 'pass' | 'ick') {
    if (!profile || !viewerProfileIdRef.current) return;
    await recordSwipe({
      swiperProfileId: viewerProfileIdRef.current,
      swipedProfileId: profile.profileId,
      action: direction,
      targetedFlagId: selectedFlagId,
    });
    if (direction === 'like') {
      setShowButWhy(true);
    } else {
      router.back();
    }
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: Colors.textMuted }}>loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Back button */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <FullProfileView
        profile={profile}
        onFlagLongPress={setSelectedFlagId}
        selectedFlagId={selectedFlagId}
        onReport={() => {/* report flow — safety feature, plain UX */}}
        onBlock={() => {/* block flow */}}
        onSave={() => {/* save to bookmarks */}}
      />

      {/* Sticky footer */}
      <View style={styles.footer}>
        <ActionButtons
          onPass={() => handleSwipe('pass')}
          onIck={() => handleSwipe('ick')}
          onLike={() => handleSwipe('like')}
        />
      </View>

      <ButWhySheet
        visible={showButWhy}
        onClose={() => {
          setShowButWhy(false);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backIcon: { color: Colors.textPrimary, fontSize: 18 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
});
