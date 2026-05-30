import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReactNode } from 'react';
import { Colors } from '@/constants/Colors';
import { ProgressDots } from './ProgressDots';

type Props = {
  subline: string;
  step: number; // 1-indexed; passed as `current` to ProgressDots (0-indexed internally)
  showProgress?: boolean;
  children: ReactNode;
};

export function OnboardingShell({ subline, step, showProgress = true, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {showProgress && <ProgressDots total={5} current={step - 1} />}
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkTitle}>The Dregs</Text>
          <Text style={styles.wordmarkSub}>{subline}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  wordmark: { alignItems: 'center', marginBottom: 32 },
  wordmarkTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  wordmarkSub: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
