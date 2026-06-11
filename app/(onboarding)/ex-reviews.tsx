import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';
import { validateYear } from '@/lib/onboarding';
import { ExReviewFraming, ExVerifiedBadge } from '@/lib/app.types';

type Phase = 'framing' | 'entry';

export default function ExReviewsScreen() {
  const { userId, profileId, setSelectedFraming } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('framing');
  const [framing, setFraming] = useState<ExReviewFraming>('work_history');

  // Work History fields
  const [nickname, setNickname] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [reasonForLeaving, setReasonForLeaving] = useState('');

  // Verified Purchases fields
  const [vpNickname, setVpNickname] = useState('');
  const [stars, setStars] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [badge, setBadge] = useState<ExVerifiedBadge | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ nickname?: string; year?: string; general?: string }>({});

  function handleFramingSelect(f: ExReviewFraming) {
    setFraming(f);
    setSelectedFraming(f);
  }

  async function handleAddAndContinue() {
    const nick = framing === 'work_history' ? nickname : vpNickname;
    if (!nick.trim()) {
      setErrors({ nickname: 'nickname is required' });
      return;
    }
    if (framing === 'work_history') {
      const startErr = startYear ? validateYear(startYear) : null;
      const endErr = endYear ? validateYear(endYear) : null;
      if (startErr || endErr) {
        setErrors({ year: startErr ?? endErr ?? undefined });
        return;
      }
    }
    if (!profileId) {
      setErrors({ general: 'something went wrong. try again.' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const entryInsert =
        framing === 'work_history'
          ? {
              profile_id: profileId,
              display_order: 1,
              nickname: nickname.trim(),
              wh_job_title: jobTitle.trim() || null,
              wh_start_date: startYear ? `${startYear}-01-01` : null,
              wh_end_date: endYear ? `${endYear}-01-01` : null,
              wh_reason_for_leaving: reasonForLeaving.trim() || null,
              vp_star_rating: null,
              vp_review_title: null,
              vp_review_body: null,
              vp_badge: null,
            }
          : {
              profile_id: profileId,
              display_order: 1,
              nickname: vpNickname.trim(),
              vp_star_rating: stars || null,
              vp_review_title: reviewTitle.trim() || null,
              vp_review_body: reviewBody.trim() || null,
              vp_badge: badge,
              wh_job_title: null,
              wh_start_date: null,
              wh_end_date: null,
              wh_reason_for_leaving: null,
            };

      const { error: insertError } = await supabase.from('ex_entries').insert(entryInsert as any);
      if (insertError) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      await finishStep();
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    try {
      await finishStep();
    } finally {
      setLoading(false);
    }
  }

  async function finishStep() {
    await supabase
      .from('profiles')
      .update({ ex_review_framing: framing, onboarding_step: 'ex_reviews' })
      .eq('user_id', userId);
    router.replace('/(onboarding)/prompts');
  }

  if (phase === 'framing') {
    return (
      <OnboardingShell subline="your exes" step={3}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>← back</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>how do you want to frame them?</Text>
        <Pressable
          style={[styles.card, framing === 'work_history' && styles.cardSelected]}
          onPress={() => handleFramingSelect('work_history')}
        >
          <Text style={styles.cardTitle}>Work History</Text>
          <Text style={styles.cardDesc}>
            résumé style. each ex is a past job. dates, title, reason for leaving.
          </Text>
        </Pressable>
        <Pressable
          style={[styles.card, framing === 'verified_purchases' && styles.cardSelected]}
          onPress={() => handleFramingSelect('verified_purchases')}
        >
          <Text style={styles.cardTitle}>Verified Purchases</Text>
          <Text style={styles.cardDesc}>
            amazon review style. stars, a title, one sentence. badge reads 'Verified Situationship'.
          </Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setPhase('entry')}>
          <Text style={styles.buttonText}>NEXT →</Text>
        </Pressable>
      </OnboardingShell>
    );
  }

  // Phase B — optional entry form
  return (
    <OnboardingShell
      subline={framing === 'work_history' ? 'add your first ex' : 'add your first review'}
      step={3}
    >
      {framing === 'work_history' ? (
        <>
          <Text style={styles.label}>Nickname</Text>
          <Text style={styles.hint}>no real names</Text>
          <TextInput
            style={[styles.input, errors.nickname ? styles.inputError : null]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. The Musician"
            placeholderTextColor={Colors.textMuted}
            maxLength={50}
            editable={!loading}
          />
          {errors.nickname ? <Text style={styles.errorText}>{errors.nickname}</Text> : null}

          <Text style={[styles.label, { marginTop: 16 }]}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Chief Emotional Officer"
            placeholderTextColor={Colors.textMuted}
            maxLength={140}
            editable={!loading}
          />

          <View style={styles.yearRow}>
            <View style={styles.yearField}>
              <Text style={styles.label}>Start Year</Text>
              <TextInput
                style={[styles.input, errors.year ? styles.inputError : null]}
                value={startYear}
                onChangeText={setStartYear}
                placeholder="YYYY"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                editable={!loading}
              />
            </View>
            <View style={styles.yearField}>
              <Text style={styles.label}>End Year</Text>
              <TextInput
                style={[styles.input, errors.year ? styles.inputError : null]}
                value={endYear}
                onChangeText={setEndYear}
                placeholder="YYYY"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                editable={!loading}
              />
            </View>
          </View>
          {errors.year ? <Text style={styles.errorText}>{errors.year}</Text> : null}

          <Text style={[styles.label, { marginTop: 16 }]}>Reason for Leaving</Text>
          <TextInput
            style={styles.textarea}
            value={reasonForLeaving}
            onChangeText={setReasonForLeaving}
            placeholder="optional"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={140}
            editable={!loading}
          />
          <Text style={styles.charCount}>{reasonForLeaving.length}/140</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Nickname</Text>
          <Text style={styles.hint}>no real names</Text>
          <TextInput
            style={[styles.input, errors.nickname ? styles.inputError : null]}
            value={vpNickname}
            onChangeText={setVpNickname}
            placeholder="e.g. The One Who Got Away (thankfully)"
            placeholderTextColor={Colors.textMuted}
            maxLength={50}
            editable={!loading}
          />
          {errors.nickname ? <Text style={styles.errorText}>{errors.nickname}</Text> : null}

          <Text style={[styles.label, { marginTop: 16 }]}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setStars(n)}>
                <Text style={[styles.star, n <= stars && styles.starFilled]}>★</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Review Title</Text>
          <TextInput
            style={styles.input}
            value={reviewTitle}
            onChangeText={setReviewTitle}
            placeholder="optional"
            placeholderTextColor={Colors.textMuted}
            maxLength={140}
            editable={!loading}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Review</Text>
          <TextInput
            style={styles.textarea}
            value={reviewBody}
            onChangeText={setReviewBody}
            placeholder="optional"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={140}
            editable={!loading}
          />
          <Text style={styles.charCount}>{reviewBody.length}/140</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>Badge</Text>
          <View style={styles.badgeRow}>
            {(
              [
                { label: 'Verified Situationship', value: 'verified_situationship' as ExVerifiedBadge },
                { label: 'Verified Chaos', value: 'verified_chaos' as ExVerifiedBadge },
              ] as const
            ).map(b => (
              <Pressable
                key={b.value}
                style={[styles.chip, badge === b.value && styles.chipSelected]}
                onPress={() => setBadge(b.value)}
              >
                <Text style={[styles.chipText, badge === b.value && styles.chipTextSelected]}>
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddAndContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>ADD & CONTINUE →</Text>
        )}
      </Pressable>

      <Pressable style={styles.skipLink} onPress={handleSkip} disabled={loading}>
        <Text style={styles.skipText}>skip — add later</Text>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  backLink: { marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 15, marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardSelected: { borderColor: Colors.accent },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: Colors.textMuted, fontSize: 13 },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hint: { fontSize: 11, color: Colors.textMuted, marginBottom: 6, marginTop: -4 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 4,
  },
  inputError: { borderColor: Colors.error },
  textarea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  yearRow: { flexDirection: 'row', gap: 12 },
  yearField: { flex: 1 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  star: { fontSize: 28, color: Colors.border },
  starFilled: { color: Colors.accent },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: Colors.accentFg },
  errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  skipLink: { alignItems: 'center', marginTop: 16 },
  skipText: { color: Colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
