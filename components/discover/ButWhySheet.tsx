import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';

const BUT_WHY_TAGS = [
  'pretty enough to ignore the red flags',
  "i'm swiping on everybody",
  'somebody has to',
  "i'm a bot",
  'the chaos score did it for me',
  'i relate to this on a personal level',
  'the pet sold me',
  "i've made worse decisions",
  'my therapist would not approve',
  'felt cute, might unmatch',
  "i'm the red flag here",
  'unironically into this',
] as const;

export type ButWhyTag = (typeof BUT_WHY_TAGS)[number];

type Props = {
  visible: boolean;
  onClose: (tag: ButWhyTag | null) => void;
};

export function ButWhySheet({ visible, onClose }: Props) {
  const [selected, setSelected] = useState<ButWhyTag | null>(null);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => onClose(null), 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  function handleTag(tag: ButWhyTag) {
    setSelected(prev => (prev === tag ? null : tag));
  }

  function handleSubmit() {
    onClose(selected);
    setSelected(null);
  }

  function handleSkip() {
    onClose(null);
    setSelected(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleSkip}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />
        <View style={styles.sheet}>
          <Text style={styles.header}>but why tho</Text>
          <View style={styles.tagsGrid}>
            {BUT_WHY_TAGS.map(tag => (
              <Pressable
                key={tag}
                style={[styles.tag, selected === tag && styles.tagSelected]}
                onPress={() => handleTag(tag)}
              >
                <Text style={[styles.tagText, selected === tag && styles.tagTextSelected]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
          {selected && (
            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>done</Text>
            </Pressable>
          )}
          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>skip (coward)</Text>
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
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tag: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagSelected: {
    borderColor: '#ff0050',
    backgroundColor: 'rgba(255,0,80,0.1)',
  },
  tagText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tagTextSelected: {
    color: Colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: '#cc0040',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
  },
  skipText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
