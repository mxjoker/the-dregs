import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import type { MatchMomentData } from '@/lib/matches';

const BASE_LINES = [
  "so what's your damage",
  "i saw your red flags and thought: relatable",
  "we matched. i'm choosing not to read into that",
  "your chaos score is impressive. i mean that sincerely",
  // index 4: conditional shared-flag line injected here when flags exist
  "honest question: are you okay",
  "i have no opener. this is the opener",
  "your biggest failure sounded familiar",
  "i'm not going to ghost you. probably",
  // index 9 (after injection): conditional count line injected here
  "hi. i also have no curtains",
  "your ex section gave me feelings i need to unpack",
  "i swiped right on your chaos specifically",
  "let's ruin this slowly",
];

function buildLines(sharedFlags: MatchMomentData['sharedFlags']): string[] {
  const lines = [...BASE_LINES];
  if (sharedFlags.length > 0) {
    lines.splice(
      4,
      0,
      `i liked your flag about ${sharedFlags[0].label}. mine too, apparently`,
    );
    const count = sharedFlags.length;
    lines.splice(
      9,
      0,
      `we have ${count} red flag${count === 1 ? '' : 's'} in common. that's either a green flag or a warning`,
    );
  }
  return lines;
}

type Props = {
  visible: boolean;
  data: MatchMomentData | null;
  onDismiss: () => void;
  onSendLine: (line: string) => void;
};

export function MatchMomentModal({ visible, data, onDismiss, onSendLine }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const avatarScaleAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const springAnim = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const dismissingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pulseLoop.current?.stop();
      springAnim.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      setSelectedLine(null);
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(1);
      avatarScaleAnim.setValue(1);

      const spring = Animated.spring(scaleAnim, {
        toValue: 1,
        bounciness: 8,
        useNativeDriver: true,
      });
      springAnim.current = spring;
      spring.start(() => {
        if (!mountedRef.current) return;
        pulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(avatarScaleAnim, {
              toValue: 1.04,
              duration: 1250,
              useNativeDriver: true,
            }),
            Animated.timing(avatarScaleAnim, {
              toValue: 1.0,
              duration: 1250,
              useNativeDriver: true,
            }),
          ]),
        );
        pulseLoop.current.start();
      });
    } else {
      pulseLoop.current?.stop();
      avatarScaleAnim.setValue(1);
    }
  }, [visible]);

  function animateOut(callback: () => void) {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    pulseLoop.current?.stop();
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => callback());
  }

  if (!data) return null;

  const lines = buildLines(data.sharedFlags);
  const viewerInitial = data.viewerName[0]?.toUpperCase() ?? '?';
  const otherInitial = data.otherName[0]?.toUpperCase() ?? '?';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => animateOut(onDismiss)}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.badge}>disaster solidarity</Text>

          <View style={styles.avatarRow}>
            <Animated.View
              style={[styles.avatar, styles.avatarYou, { transform: [{ scale: avatarScaleAnim }] }]}
            >
              <Text style={styles.avatarInitial}>{viewerInitial}</Text>
            </Animated.View>
            <Animated.View
              style={[styles.avatar, styles.avatarThem, { transform: [{ scale: avatarScaleAnim }] }]}
            >
              <Text style={styles.avatarInitial}>{otherInitial}</Text>
            </Animated.View>
          </View>

          <Text style={styles.heading}>You matched with {data.otherName}</Text>
          <Text style={styles.subtext}>
            You both swiped right on each other's chaos. Congrats, probably.
          </Text>

          {data.sharedFlags.length > 0 && (
            <View style={styles.flagsRow} testID="shared-flags-row">
              {data.sharedFlags.map(f => (
                <View key={f.id} style={styles.flagChip}>
                  <Text style={styles.flagChipText}>{f.label}</Text>
                </View>
              ))}
            </View>
          )}

          <ScrollView
            style={styles.linesScroll}
            showsVerticalScrollIndicator={false}
          >
            {lines.map(line => (
              <Pressable
                key={line}
                style={[styles.lineRow, selectedLine === line && styles.lineRowSelected]}
                onPress={() => setSelectedLine(line)}
              >
                <Text style={[styles.lineText, selectedLine === line && styles.lineTextSelected]}>
                  {line}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            testID="send-button"
            style={[styles.sendButton, !selectedLine && styles.sendButtonDisabled]}
            onPress={() => {
              if (selectedLine) {
                const line = selectedLine;
                animateOut(() => onSendLine(line));
              }
            }}
            disabled={!selectedLine}
            accessibilityState={{ disabled: !selectedLine }}
          >
            <Text style={styles.sendButtonText}>send a disaster opening line</Text>
          </Pressable>

          <Pressable onPress={() => animateOut(onDismiss)}>
            <Text style={styles.keepSwiping}>keep swiping</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarYou: {
    backgroundColor: '#1a1a2e',
    marginRight: -10,
    zIndex: 1,
  },
  avatarThem: {
    backgroundColor: '#2e1a1a',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  flagChip: {
    backgroundColor: '#2a1e1e',
    borderWidth: 1,
    borderColor: '#4a3030',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flagChipText: {
    fontSize: 11,
    color: '#cc8888',
  },
  linesScroll: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 20,
  },
  lineRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  lineRowSelected: {
    backgroundColor: Colors.border,
  },
  lineText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  lineTextSelected: {
    color: Colors.textPrimary,
  },
  sendButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentFg,
  },
  keepSwiping: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 4,
  },
});
