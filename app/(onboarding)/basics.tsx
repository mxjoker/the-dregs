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
import { validateDisplayName } from '@/lib/onboarding';
import { GenderIdentityOption, PronounsOption } from '@/lib/database.types';

const PRONOUNS: { label: string; value: PronounsOption }[] = [
  { label: 'he/him', value: 'he_him' },
  { label: 'she/her', value: 'she_her' },
  { label: 'they/them', value: 'they_them' },
  { label: 'he/they', value: 'he_they' },
  { label: 'she/they', value: 'she_they' },
  { label: 'any pronouns', value: 'any_pronouns' },
  { label: 'ask me', value: 'ask_me' },
  { label: 'self describe', value: 'self_describe' },
];

const GENDER_OPTIONS: { label: string; value: GenderIdentityOption }[] = [
  { label: 'man', value: 'man' },
  { label: 'woman', value: 'woman' },
  { label: 'non-binary', value: 'non_binary' },
  { label: 'genderfluid', value: 'genderfluid' },
  { label: 'genderqueer', value: 'genderqueer' },
  { label: 'agender', value: 'agender' },
  { label: 'transgender man', value: 'transgender_man' },
  { label: 'transgender woman', value: 'transgender_woman' },
  { label: 'two spirit', value: 'two_spirit' },
  { label: 'intersex', value: 'intersex' },
  { label: 'questioning', value: 'questioning' },
  { label: 'self describe', value: 'self_describe' },
  { label: 'prefer not to say', value: 'prefer_not_to_say' },
];

export default function BasicsScreen() {
  const { userId } = useOnboarding();
  const [displayName, setDisplayName] = useState('');
  const [selectedPronouns, setSelectedPronouns] = useState<PronounsOption[]>([]);
  const [pronounsText, setPronounsText] = useState('');
  const [gender, setGender] = useState<GenderIdentityOption>('prefer_not_to_say');
  const [genderText, setGenderText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; general?: string }>({});

  function togglePronoun(value: PronounsOption) {
    setSelectedPronouns(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value],
    );
  }

  async function handleSubmit() {
    const nameErr = validateDisplayName(displayName);
    if (nameErr) {
      setErrors({ displayName: nameErr });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const pronouns: PronounsOption = selectedPronouns[0] ?? 'ask_me';
      const { error } = await supabase.from('profiles').upsert({
        user_id: userId,
        display_name: displayName.trim(),
        pronouns,
        pronouns_text: selectedPronouns.includes('self_describe') && pronounsText ? pronounsText : null,
        gender_identity: gender,
        gender_identity_text: gender === 'self_describe' && genderText ? genderText : null,
        onboarding_step: 'basics',
      });

      if (error) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      router.replace('/(onboarding)/disaster-profile');
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell subline="let's get the basics" step={1}>
      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={[styles.input, errors.displayName ? styles.inputError : null]}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="what do we call you"
        placeholderTextColor={Colors.textMuted}
        maxLength={50}
        editable={!loading}
      />
      {errors.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}

      <Text style={[styles.label, { marginTop: 20 }]}>Pronouns</Text>
      <View style={styles.chipRow}>
        {PRONOUNS.map(p => (
          <Pressable
            key={p.value}
            style={[styles.chip, selectedPronouns.includes(p.value) && styles.chipSelected]}
            onPress={() => togglePronoun(p.value)}
          >
            <Text style={[styles.chipText, selectedPronouns.includes(p.value) && styles.chipTextSelected]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {selectedPronouns.includes('self_describe') && (
        <TextInput
          style={styles.input}
          value={pronounsText}
          onChangeText={setPronounsText}
          placeholder="describe your pronouns"
          placeholderTextColor={Colors.textMuted}
          maxLength={140}
          editable={!loading}
        />
      )}

      <Text style={[styles.label, { marginTop: 20 }]}>Gender Identity</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map(g => (
          <Pressable
            key={g.value}
            style={[styles.chip, gender === g.value && styles.chipSelected]}
            onPress={() => setGender(g.value)}
          >
            <Text style={[styles.chipText, gender === g.value && styles.chipTextSelected]}>
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {gender === 'self_describe' && (
        <TextInput
          style={styles.input}
          value={genderText}
          onChangeText={setGenderText}
          placeholder="describe your gender identity"
          placeholderTextColor={Colors.textMuted}
          maxLength={140}
          editable={!loading}
        />
      )}

      {errors.general ? <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>NEXT →</Text>
        )}
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 8,
  },
  inputError: { borderColor: Colors.error },
  errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
});
