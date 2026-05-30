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
import { EmploymentStatus, LookingForOption, RelationshipStructure } from '@/lib/database.types';

const EMPLOYMENT: { label: string; value: EmploymentStatus }[] = [
  { label: 'technically consulting', value: 'technically_consulting' },
  { label: 'funemployed', value: 'funemployed' },
  { label: "it's complicated", value: 'its_complicated' },
  { label: 'between callings', value: 'between_callings' },
  { label: 'employed, unfortunately', value: 'employed_unfortunately' },
  { label: 'self-employed (loosely)', value: 'self_employed_loosely' },
  { label: 'working on something', value: 'working_on_something' },
  { label: 'in a band', value: 'in_a_band' },
  { label: 'full-time creative', value: 'full_time_creative' },
  { label: 'student, professionally', value: 'student_professionally' },
  { label: 'freelance everything', value: 'freelance_everything' },
  { label: 'on sabbatical (unplanned)', value: 'on_sabbatical_unplanned' },
];

const LOOKING_FOR: { label: string; value: LookingForOption }[] = [
  { label: 'emotional damage', value: 'emotional_damage' },
  { label: 'someone to blame', value: 'someone_to_blame' },
  { label: 'situationship with potential', value: 'situationship_with_potential' },
  { label: 'chaos but make it romantic', value: 'chaos_but_make_it_romantic' },
  { label: 'someone who texts back', value: 'someone_who_texts_back' },
  { label: 'a reason to stay in this city', value: 'a_reason_to_stay_in_this_city' },
  { label: 'to be perceived', value: 'to_be_perceived' },
  { label: 'mostly this app to work out', value: 'mostly_this_app_to_work_out' },
  { label: 'something undefined', value: 'something_undefined' },
  { label: 'a person, not a project', value: 'a_person_not_a_project' },
  { label: 'my keys, and also love', value: 'my_keys_and_also_love' },
  { label: 'to relocate for the wrong reasons', value: 'to_relocate_for_wrong_reasons' },
];

const RELATIONSHIP: { label: string; value: RelationshipStructure }[] = [
  { label: 'monogamous', value: 'monogamous' },
  { label: 'ethically non-monogamous', value: 'ethically_non_monogamous' },
  { label: 'polyamorous', value: 'polyamorous' },
  { label: 'open relationship', value: 'open_relationship' },
  { label: 'relationship anarchist', value: 'relationship_anarchist' },
  { label: 'solo poly', value: 'solo_poly' },
  { label: 'still figuring it out', value: 'still_figuring_it_out' },
  { label: "it's complicated", value: 'its_complicated' },
  { label: "not a conversation I'm having on-app", value: 'not_a_conversation_im_having_on_app' },
];

function SelectChips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: T }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map(o => (
        <Pressable
          key={o.value}
          style={[chipStyles.chip, selected === o.value && chipStyles.chipSelected]}
          onPress={() => onSelect(o.value)}
        >
          <Text style={[chipStyles.chipText, selected === o.value && chipStyles.chipTextSelected]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
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
});

export default function DisasterProfileScreen() {
  const { userId } = useOnboarding();
  const [employment, setEmployment] = useState<EmploymentStatus | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingForOption | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStructure | null>(null);
  const [biggestFailure, setBiggestFailure] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fields?: string; general?: string }>({});

  async function handleSubmit() {
    if (!employment || !lookingFor || !relationship) {
      setErrors({ fields: 'please fill out all three fields above' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          employment_status: employment,
          looking_for: lookingFor,
          relationship_structure: relationship,
          biggest_failure: biggestFailure.trim() || null,
          onboarding_step: 'disaster_profile',
        })
        .eq('user_id', userId);

      if (error) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      router.replace('/(onboarding)/ex-reviews');
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell subline="the honest part" step={2}>
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backText}>← back</Text>
      </Pressable>

      <Text style={styles.label}>Employment Status</Text>
      <SelectChips options={EMPLOYMENT} selected={employment} onSelect={setEmployment} />

      <Text style={[styles.label, { marginTop: 20 }]}>Looking For</Text>
      <SelectChips options={LOOKING_FOR} selected={lookingFor} onSelect={setLookingFor} />

      <Text style={[styles.label, { marginTop: 20 }]}>Relationship Structure</Text>
      <SelectChips options={RELATIONSHIP} selected={relationship} onSelect={setRelationship} />

      {errors.fields ? <Text style={styles.errorText}>{errors.fields}</Text> : null}

      <Text style={[styles.label, { marginTop: 20 }]}>Biggest Failure</Text>
      <TextInput
        style={styles.textarea}
        value={biggestFailure}
        onChangeText={setBiggestFailure}
        placeholder="optional. 140 chars."
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={140}
        editable={!loading}
      />
      <Text style={styles.charCount}>{biggestFailure.length}/140</Text>

      {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

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
  backLink: { marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
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
  errorText: { color: Colors.error, fontSize: 11, marginTop: 8 },
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
