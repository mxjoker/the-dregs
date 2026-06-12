import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { recordDoorKnock } from '@/lib/matches';

const KNOCK_COPY = [
  "you knock. perhaps they will answer. perhaps not.",
  "tapping on a closed door. classic you.",
  "knocking on a door that expired. respect the commitment.",
  "one is knocking. how terribly optimistic.",
  "you're knocking. okay.",
  "KEEP GOING. they might answer. they MIGHT.",
  "you're knocking on an expired match. no notes. carry on.",
  "you're knocking. what does that mean to you?",
  "bro said 'I'm not a quitter' and started tapping.",
  "keep knocking. they can hear you. they're deciding.",
];

export default function KnockScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  const [otherName, setOtherName] = useState<string>('');
  const [knockCount, setKnockCount] = useState(0);
  const [knockTarget, setKnockTarget] = useState<number | null>(null);
  const [copyIndex, setCopyIndex] = useState(0);
  const [loadingState, setLoadingState] = useState(true);

  // Tap batching refs — no re-render per tap
  const pendingTapsRef = useRef(0);
  const lastFlushedCountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushing = useRef(false);

  // Load initial match state
  useEffect(() => {
    if (!matchId) return;
    (async () => {
      const { data: match } = await supabase
        .from('matches')
        .select(
          'user_a_id, user_b_id, door_knock_count, door_knock_target, ' +
          'door_status',
        )
        .eq('id', matchId)
        .single();
      if (!match) return;

      const m = match as any;
      if (m.door_status === 'open') {
        // Already open — go straight to chat
        router.replace({ pathname: '/matches/[matchId]' as any, params: { matchId } });
        return;
      }

      const initialCount = m.door_knock_count ?? 0;
      const initialTarget = m.door_knock_target ?? null;
      setKnockCount(initialCount);
      setKnockTarget(initialTarget);
      lastFlushedCountRef.current = initialCount;

      // Fetch other person's name
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      if (!userData) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (userData as any).id)
        .single();
      if (!profile) return;
      const viewerProfileId = (profile as any).id;
      const otherProfileId =
        m.user_a_id === viewerProfileId ? m.user_b_id : m.user_a_id;
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', otherProfileId)
        .single();
      if (otherProfile) setOtherName((otherProfile as any).display_name ?? '');
    })()
      .catch(err => console.error('knock screen load error:', err))
      .finally(() => setLoadingState(false));
  }, [matchId]);

  const flush = useCallback(async () => {
    if (pendingTapsRef.current === 0 || isFlushing.current) return;
    const batch = pendingTapsRef.current;
    pendingTapsRef.current = 0;
    isFlushing.current = true;
    try {
      const result = await recordDoorKnock(matchId!, batch);
      lastFlushedCountRef.current = result.knockCount;
      setKnockCount(result.knockCount);
      if (result.knockTarget) setKnockTarget(result.knockTarget);
      setCopyIndex(prev => (prev + 1) % KNOCK_COPY.length);
      if (result.doorStatus === 'open') {
        router.replace({ pathname: '/matches/[matchId]' as any, params: { matchId } });
      }
    } catch (err) {
      console.error('recordDoorKnock error:', err);
      // Re-queue — taps are not lost
      pendingTapsRef.current += batch;
    } finally {
      isFlushing.current = false;
    }
  }, [matchId]);

  const handleTap = useCallback(() => {
    pendingTapsRef.current += 1;

    // Optimistic local count
    setKnockCount(lastFlushedCountRef.current + pendingTapsRef.current);

    // Reset debounce timer
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      flush();
    }, 1500);

    // Eager flush at >= 50 pending taps
    if (pendingTapsRef.current >= 50) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      flush();
    }
  }, [flush]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const progressFraction =
    knockTarget && knockTarget > 0 ? Math.min(knockCount / knockTarget, 1) : 0;

  const title = otherName ? `${otherName}'s door` : 'their door';

  if (loadingState) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'knocking…' }} />
        <ActivityIndicator color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title,
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { color: Colors.textPrimary },
      }} />

      {/* Full-screen tap area */}
      <Pressable style={styles.tapArea} onPress={handleTap}>
        <View style={styles.tapContent}>
          {/* Progress counter */}
          <Text style={styles.progressCount}>
            {knockCount}{knockTarget ? ` / ${knockTarget}` : ''}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressFraction * 100}%` as any }]} />
          </View>

          {/* Rotating copy */}
          <Text style={styles.copyLine}>{KNOCK_COPY[copyIndex]}</Text>

          <Text style={styles.tapHint}>tap anywhere</Text>
        </View>
      </Pressable>

      {/* Give up link */}
      <Pressable style={styles.giveUpBtn} onPress={() => router.back()}>
        <Text style={styles.giveUpText}>give up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  tapArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  tapContent: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  progressCount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  copyLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  tapHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  giveUpBtn: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  giveUpText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
