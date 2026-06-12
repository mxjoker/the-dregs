import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';
import { fetchMatches, type MatchListItem } from '@/lib/matches';
import { AnswerDoorSheet } from '@/components/AnswerDoorSheet';

function formatMatchSubtitle(item: MatchListItem): string {
  // Door-state subtitles (spec table)
  if (item.matchStatus === 'expired' && item.doorStatus === 'closed') {
    return 'expired · tap to knock';
  }
  if (item.doorStatus === 'knocking') {
    // We need the viewer profile ID to determine if they are the knocker.
    // The row receives viewerProfileId as a separate prop — see MatchRow below.
    // This function is only called for door_open / active states.
    // (knocking handled directly in MatchRow)
  }
  // Normal subtitle
  if (item.lastMessageBody) {
    return item.lastMessageBody.length > 40
      ? item.lastMessageBody.slice(0, 40) + '…'
      : item.lastMessageBody;
  }
  const matchedAt = new Date(item.matchedAt);
  const days = Math.floor((Date.now() - matchedAt.getTime()) / 86400000);
  if (days === 0) return 'matched today';
  if (days === 1) return 'matched yesterday';
  return `matched ${days} days ago`;
}

function InitialsAvatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

type MatchRowProps = {
  item: MatchListItem;
  viewerProfileId: string;
  onAnswerDoor: (matchId: string) => void;
};

function MatchRow({ item, viewerProfileId, onAnswerDoor }: MatchRowProps) {
  const isDoorOpen = item.matchStatus === 'door_open';
  const isExpiredClosed = item.matchStatus === 'expired' && item.doorStatus === 'closed';
  const isKnocking = item.doorStatus === 'knocking';
  const viewerIsKnocker = item.doorKnockedBy === viewerProfileId;

  function handlePress() {
    if (isDoorOpen || item.matchStatus === 'active') {
      router.push({ pathname: '/matches/[matchId]' as any, params: { matchId: item.matchId } });
    } else if (isExpiredClosed) {
      router.push({ pathname: '/matches/knock' as any, params: { matchId: item.matchId } });
    } else if (isKnocking && viewerIsKnocker) {
      router.push({ pathname: '/matches/knock' as any, params: { matchId: item.matchId } });
    } else if (isKnocking && !viewerIsKnocker) {
      onAnswerDoor(item.matchId);
    }
  }

  // Subtitle text
  let subtitleText: string;
  let subtitleDim = false;

  if (isExpiredClosed) {
    subtitleText = 'expired · tap to knock';
    subtitleDim = true;
  } else if (isKnocking && viewerIsKnocker) {
    subtitleText = `you're knocking… ${item.doorKnockCount}${item.doorKnockTarget ? `/${item.doorKnockTarget}` : ''}`;
  } else if (isKnocking && !viewerIsKnocker) {
    subtitleText = `${item.otherName} is at the door`;
  } else {
    subtitleText = formatMatchSubtitle(item);
  }

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      <InitialsAvatar name={item.otherName} />
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{item.otherName}</Text>
        <Text
          style={[styles.rowSubtitle, subtitleDim && styles.rowSubtitleDim]}
          numberOfLines={1}
        >
          {subtitleText}
        </Text>
      </View>
      {isKnocking && !viewerIsKnocker && (
        <Pressable
          style={styles.answerBtn}
          onPress={() => onAnswerDoor(item.matchId)}
          hitSlop={8}
        >
          <Text style={styles.answerBtnText}>answer</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export default function MatchesScreen() {
  const { profileId } = useOnboarding();
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // AnswerDoorSheet state
  const [answerSheetMatchId, setAnswerSheetMatchId] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!profileId) return;
    try {
      const data = await fetchMatches(profileId);
      setMatches(data);
    } catch (err) {
      console.error('fetchMatches error:', err);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    loadMatches().finally(() => setLoading(false));
  }, [loadMatches, profileId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMatches();
    } finally {
      setRefreshing(false);
    }
  }, [loadMatches]);

  const handleAnswerDoor = useCallback((matchId: string) => {
    setAnswerSheetMatchId(matchId);
  }, []);

  const handleSheetClose = useCallback(() => {
    setAnswerSheetMatchId(null);
  }, []);

  const handleDoorOpened = useCallback(() => {
    const matchId = answerSheetMatchId;
    setAnswerSheetMatchId(null);
    if (matchId) {
      router.push({ pathname: '/matches/[matchId]' as any, params: { matchId } });
    }
  }, [answerSheetMatchId]);

  const renderItem = useCallback(({ item }: { item: MatchListItem }) => (
    <MatchRow
      item={item}
      viewerProfileId={profileId ?? ''}
      onAnswerDoor={handleAnswerDoor}
    />
  ), [profileId, handleAnswerDoor]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  }, []);

  const handleSkipOnboarding = useCallback(async () => {
    setSkipping(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSkipping(false); return; }
    const { data: userData } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
    if (!userData) { setSkipping(false); return; }
    await supabase.from('profiles').update({ onboarding_step: 'complete', vibe_check_passed: true }).eq('user_id', userData.id);
    router.replace('/(tabs)');
  }, []);

  const busy = signingOut || skipping;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matches.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textMuted}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>no disasters yet. keep swiping.</Text>
            </View>
          }
          contentContainerStyle={styles.emptyContainer}
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.matchId}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textMuted}
            />
          }
        />
      )}

      <View style={styles.devButtons}>
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

      {/* AnswerDoorSheet — rendered at bottom of screen, same pattern as ButWhySheet */}
      {answerSheetMatchId && (
        <AnswerDoorSheet
          matchId={answerSheetMatchId}
          visible={true}
          onClose={handleSheetClose}
          onOpened={handleDoorOpened}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  list: { paddingTop: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, color: Colors.textPrimary, fontWeight: '500' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500', marginBottom: 2 },
  rowSubtitle: { fontSize: 13, color: Colors.textMuted },
  rowSubtitleDim: { color: Colors.textMuted, opacity: 0.6 },
  answerBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  answerBtnText: { fontSize: 12, color: Colors.textSecondary },
  devButtons: { padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  devButton: {
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, borderStyle: 'dashed',
    alignSelf: 'center',
  },
  devButtonText: { fontSize: 13, color: Colors.textMuted },
  signOutButton: {
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    alignSelf: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  signOutText: { fontSize: 13, color: Colors.textSecondary },
});
