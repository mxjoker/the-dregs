import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import type { DiscoverProfile } from '@/lib/discover';
import { formatDistance, getTopFlags } from '@/lib/discover';

type Props = {
  profile: DiscoverProfile;
  onTap?: () => void;
  onFlagLongPress?: (flagId: string) => void;
  selectedFlagId?: string | null;
};

const CHAOS_ORANGE = '#ff8800';
const CHAOS_RED = '#ff0050';

export function SwipeCard({ profile, onTap, onFlagLongPress, selectedFlagId }: Props) {
  const topFlags = getTopFlags(profile.flags, 3);
  const overflowCount = profile.flags.length - topFlags.length;
  const firstPrompt = profile.prompts[0] ?? null;

  return (
    <Pressable style={styles.card} onPress={onTap}>
      {/* Photo zone */}
      <View style={styles.photoZone}>
        {profile.primaryPhotoUrl ? (
          <Image source={{ uri: profile.primaryPhotoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>no photos. bold strategy.</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.photoScrim}
        >
          <Text style={styles.nameAge}>
            {profile.displayName},{' '}
            <Text style={styles.ageQuoted}>"{profile.age}"</Text>
          </Text>
          <Text style={styles.distance}>{formatDistance(profile.distanceM)} away</Text>
        </LinearGradient>
      </View>

      {/* Info strip */}
      <View style={styles.infoStrip}>
        {/* Chaos score */}
        <View style={styles.chaosRow}>
          <View style={styles.chaosLeft}>
            <Text style={styles.chaosLabel}>chaos score</Text>
            <View style={styles.chaosBarTrack}>
              <View
                style={[styles.chaosBarFill, { width: (profile.chaosScore + '%') as any }]}
              />
            </View>
          </View>
          <Text style={[styles.chaosNumber, { color: CHAOS_ORANGE }]}>
            {profile.chaosScore}
          </Text>
        </View>

        {/* Red flags */}
        {profile.flags.length > 0 && (
          <View style={styles.flagsRow}>
            {topFlags.map(flag => (
              <Pressable
                key={flag.id}
                style={[
                  styles.flagTag,
                  selectedFlagId === flag.id && styles.flagTagSelected,
                ]}
                onLongPress={() => onFlagLongPress?.(flag.id)}
                delayLongPress={500}
              >
                <Text style={styles.flagText}>🚩 {flag.label}</Text>
              </Pressable>
            ))}
            {overflowCount > 0 && (
              <Pressable style={styles.overflowChip} onPress={onTap}>
                <Text style={styles.overflowText}>+{overflowCount} more</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Prompt */}
        {firstPrompt && (
          <View style={styles.promptSection}>
            <Text style={styles.promptLabel} numberOfLines={1}>
              {firstPrompt.question.toLowerCase()}
            </Text>
            <Text style={styles.promptAnswer} numberOfLines={2}>
              "{firstPrompt.answer}"
            </Text>
          </View>
        )}

        {/* Pet widget */}
        {profile.petActive && profile.petEmoji && profile.petOneliner && (
          <View style={styles.petPill}>
            <Text style={styles.petEmoji}>{profile.petEmoji}</Text>
            <Text style={styles.petOneliner} numberOfLines={1}>
              {profile.petOneliner}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#111111',
    overflow: 'hidden',
  },
  photoZone: {
    flex: 55,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  photoScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 40,
    paddingBottom: 10,
  },
  nameAge: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ageQuoted: {
    opacity: 0.85,
  },
  distance: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoStrip: {
    flex: 45,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  chaosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chaosLeft: {
    flex: 1,
    gap: 4,
  },
  chaosLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chaosBarTrack: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  chaosBarFill: {
    height: '100%',
    backgroundColor: CHAOS_ORANGE,
    borderRadius: 2,
  },
  chaosNumber: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    minWidth: 36,
    textAlign: 'right',
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  flagTag: {
    backgroundColor: '#1a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,0,80,0.2)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  flagTagSelected: {
    borderColor: CHAOS_RED,
    transform: [{ scale: 1.05 }],
  },
  flagText: {
    fontSize: 10,
    color: '#ff7099',
  },
  overflowChip: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  overflowText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  promptSection: {
    gap: 3,
  },
  promptLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  promptAnswer: {
    fontSize: 13,
    color: Colors.textPrimary,
    opacity: 0.9,
    lineHeight: 18,
  },
  petPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 6,
  },
  petEmoji: {
    fontSize: 13,
  },
  petOneliner: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
});
