import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { useOnboarding } from '@/context/OnboardingContext';

const TAP_LINES = [
  'still reviewing.',
  'the committee has noted your knock.',
  'please maintain dignity while waiting.',
  'your enthusiasm has been logged.',
  'the door remains unmoved.',
  'noted.',
  "we said we'd let you know.",
  'each knock shaves one second. worth it?',
  'the velvet rope is non-negotiable.',
  'patience is not a vibe check requirement, but it helps.',
  'the committee is reviewing your commitment to the committee.',
  'this is fine.',
];

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export default function VibeCheckScreen() {
  const { userId } = useOnboarding();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [tapLine, setTapLine] = useState(TAP_LINES[0]);
  const tapLineIndex = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchAndSetTimer() {
    const { data } = await supabase
      .from('profiles')
      .select('vibe_check_timer_expiry, vibe_check_passed')
      .eq('user_id', userId)
      .single();

    if (!data) return;

    if (data.vibe_check_passed) {
      router.replace('/(tabs)');
      return;
    }

    if (data.vibe_check_timer_expiry) {
      const diff = Math.max(
        0,
        Math.floor((new Date(data.vibe_check_timer_expiry).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(diff);
    }
  }

  async function completeVibeCheck() {
    await supabase.rpc('complete_vibe_check', { p_user_id: userId });
    router.replace('/(tabs)');
  }

  useEffect(() => {
    fetchAndSetTimer();
    syncRef.current = setInterval(fetchAndSetTimer, 60_000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') fetchAndSetTimer();
    });
    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      completeVibeCheck();
      return;
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!);
          completeVibeCheck();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [secondsLeft !== null]);

  async function handleKnock() {
    tapLineIndex.current = (tapLineIndex.current + 1) % TAP_LINES.length;
    setTapLine(TAP_LINES[tapLineIndex.current]);
    setSecondsLeft(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    await supabase.from('vibe_check_knocks').insert({ user_id: userId });
    await supabase.rpc('decrement_vibe_check_timer', { p_user_id: userId });
  }

  if (secondsLeft === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>The Dregs</Text>
      <Text style={styles.subline}>vibe check</Text>

      <Pressable style={styles.door} onPress={handleKnock}>
        <View style={styles.doorKnob} />
      </Pressable>

      <Text style={styles.timer}>{formatCountdown(secondsLeft)}</Text>
      <Text style={styles.tapLine}>{tapLine}</Text>

      <Pressable style={styles.knockButton} onPress={handleKnock}>
        <Text style={styles.knockButtonText}>knock to pass the time</Text>
      </Pressable>
      <Text style={styles.knockCaption}>each knock: −1 second</Text>

      {__DEV__ && (
        <Pressable style={styles.skipButton} onPress={completeVibeCheck}>
          <Text style={styles.skipButtonText}>skip (dev only)</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 4,
  },
  subline: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 48,
  },
  door: {
    width: 120,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 14,
    marginBottom: 48,
    backgroundColor: Colors.surface,
  },
  doorKnob: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent },
  timer: {
    fontSize: 48,
    fontFamily: 'SpaceMono',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  tapLine: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
  },
  knockButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  knockButtonText: { color: Colors.textSecondary, fontSize: 13 },
  knockCaption: { fontSize: 11, color: Colors.textMuted },
  skipButton: { marginTop: 32 },
  skipButtonText: { fontSize: 11, color: Colors.textMuted, textDecorationLine: 'underline' },
});
