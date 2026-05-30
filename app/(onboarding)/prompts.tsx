import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';

type Prompt = { id: string; slug: string; prompt_text: string; display_order: number | null };

export default function PromptsScreen() {
  const { setSelectedPromptSlugs } = useOnboarding();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // prompt ids
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  useEffect(() => {
    supabase
      .from('prompts')
      .select('id, slug, prompt_text, display_order')
      .order('display_order')
      .then(({ data }) => {
        if (data) setPrompts(data);
        setLoadingPrompts(false);
      });
  }, []);

  function togglePrompt(id: string) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev,
    );
  }

  function handleNext() {
    const slugs = selected.map(id => prompts.find(p => p.id === id)!.slug);
    setSelectedPromptSlugs(slugs);
    router.replace('/(onboarding)/prompt-answer');
  }

  if (loadingPrompts) {
    return (
      <OnboardingShell subline="choose your confessions" step={4}>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell subline="choose your confessions" step={4}>
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backText}>← back</Text>
      </Pressable>
      <Text style={styles.counter}>pick exactly 3 · {selected.length} selected</Text>
      {prompts.map(p => (
        <Pressable
          key={p.id}
          style={[styles.row, selected.includes(p.id) && styles.rowSelected]}
          onPress={() => togglePrompt(p.id)}
        >
          <Text style={styles.rowText}>{p.prompt_text}</Text>
          {selected.includes(p.id) && <Text style={styles.check}>✓</Text>}
        </Pressable>
      ))}
      <Pressable
        style={[styles.button, selected.length !== 3 && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={selected.length !== 3}
      >
        <Text style={styles.buttonText}>NEXT →</Text>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  backLink: { marginBottom: 12 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  counter: { color: Colors.textMuted, fontSize: 12, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    marginBottom: 8,
  },
  rowSelected: { borderColor: Colors.accent },
  rowText: { color: Colors.textPrimary, fontSize: 14, flex: 1, paddingRight: 8 },
  check: { color: Colors.accent, fontSize: 16 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.3 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
});
