import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { answerDoorEarly } from '@/lib/matches';

const LOCKED_REASONS = [
  "I was in my flop era",
  "I needed time to spiral privately",
  "I forgot this app existed (not a metaphor)",
  "I was collecting myself. still working on it",
  "ghost mode. no reason. classic me",
  "I was going to text first. I wasn't",
  "phone died. emotionally",
  "I thought you'd come back. you did",
  "life admin. all of it fake",
  "I was fine. I wasn't",
] as const;

type Props = {
  matchId: string;
  visible: boolean;
  onClose: () => void;
  onOpened: () => void;
};

export function AnswerDoorSheet({ matchId, visible, onClose, onOpened }: Props) {
  const [loadingReason, setLoadingReason] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleReason(reason: string) {
    if (loadingReason) return;
    setLoadingReason(reason);
    setErrorText(null);
    try {
      await answerDoorEarly(matchId, reason);
      setLoadingReason(null);
      onOpened();
    } catch (err: any) {
      setLoadingReason(null);
      setErrorText(err?.message ?? 'something went wrong. try again.');
    }
  }

  function handleClose() {
    if (loadingReason) return;
    setErrorText(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.header}>why did you ghost</Text>
          <Text style={styles.subheader}>pick one. it opens the door.</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {LOCKED_REASONS.map(reason => {
              const isLoading = loadingReason === reason;
              const isDisabled = loadingReason !== null;
              return (
                <Pressable
                  key={reason}
                  style={[styles.reasonRow, isDisabled && styles.reasonRowDisabled]}
                  onPress={() => handleReason(reason)}
                  disabled={isDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.textPrimary} />
                  ) : (
                    <Text style={[styles.reasonText, isDisabled && styles.reasonTextDisabled]}>
                      {reason}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          {errorText && (
            <Text style={styles.errorText}>{errorText}</Text>
          )}
          <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={!!loadingReason}>
            <Text style={styles.cancelText}>not yet</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
    maxHeight: '80%',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  reasonRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  reasonRowDisabled: {
    opacity: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reasonTextDisabled: {
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
