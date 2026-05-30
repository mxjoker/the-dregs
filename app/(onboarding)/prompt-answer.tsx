import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';

export default function PromptAnswerScreen() {
  const { userId, profileId, selectedPromptSlugs, currentPromptIndex, setCurrentPromptIndex } =
    useOnboarding();
  const [answer, setAnswer] = useState('');
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ answer?: string; general?: string }>({});

  const slug = selectedPromptSlugs[currentPromptIndex];

  useEffect(() => {
    if (!slug) return;
    setAnswer('');
    setErrors({});
    supabase
      .from('prompts')
      .select('id, prompt_text')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setPromptId(data.id);
          setPromptText(data.prompt_text);
        }
      });
  }, [slug]);

  async function handleSubmit() {
    if (!answer.trim()) {
      setErrors({ answer: 'answer is required' });
      return;
    }
    if (!promptId) return;
    setErrors({});
    setLoading(true);

    try {
      const { error: upsertError } = await supabase.from('profile_prompts').upsert({
        profile_id: profileId,
        prompt_id: promptId,
        answer: answer.trim(),
        display_order: currentPromptIndex + 1,
      });

      if (upsertError) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      if (currentPromptIndex < 2) {
        setCurrentPromptIndex(currentPromptIndex + 1);
      } else {
        const expiryISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'prompts', vibe_check_timer_expiry: expiryISO })
          .eq('user_id', userId);
        router.replace('/(onboarding)/vibe-check');
      }
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  const isLast = currentPromptIndex === 2;

  return (
    <OnboardingShell subline={`prompt ${currentPromptIndex + 1} of 3`} step={4}>
      <Pressable
        onPress={() => router.replace('/(onboarding)/prompts')}
        style={styles.backLink}
      >
        <Text style={styles.backText}>← change prompts</Text>
      </Pressable>

      <Text style={styles.promptText}>{promptText}</Text>

      <TextInput
        style={[styles.textarea, errors.answer ? styles.textareaError : null]}
        value={answer}
        onChangeText={setAnswer}
        placeholder="your answer"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={140}
        editable={!loading}
      />
      <Text style={styles.charCount}>{answer.length}/140</Text>
      {errors.answer ? <Text style={styles.errorText}>{errors.answer}</Text> : null}
      {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>{isLast ? 'FINISH →' : 'NEXT PROMPT →'}</Text>
        )}
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  backLink: { marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  promptText: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    lineHeight: 28,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textareaError: { borderColor: Colors.error },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
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
});
