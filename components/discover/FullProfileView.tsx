import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import type { DiscoverProfile } from '@/lib/discover';
import { formatDistance } from '@/lib/discover';

type Props = {
  profile: DiscoverProfile;
  onFlagLongPress: (flagId: string) => void;
  selectedFlagId: string | null;
  onReport: () => void;
  onBlock: () => void;
  onSave: () => void;
};

export function FullProfileView({
  profile,
  onFlagLongPress,
  selectedFlagId,
  onReport,
  onBlock,
  onSave,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryWidth, setGalleryWidth] = useState(375);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* 1. Photo gallery */}
      <View
        style={styles.galleryContainer}
        onLayout={e => setGalleryWidth(e.nativeEvent.layout.width)}
      >
        <FlatList
          data={profile.photos.length > 0 ? profile.photos : [null]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
            setPhotoIndex(idx);
          }}
          renderItem={({ item }) =>
            item ? (
              <Image source={{ uri: item }} style={[styles.galleryPhoto, { width: galleryWidth }]} />
            ) : (
              <View style={[styles.galleryPhoto, styles.photoPlaceholder, { width: galleryWidth }]}>
                <Text style={styles.photoPlaceholderText}>no photos. bold strategy.</Text>
              </View>
            )
          }
        />
        {profile.photos.length > 1 && (
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {photoIndex + 1} / {profile.photos.length}
            </Text>
          </View>
        )}
        {/* 3-dot menu */}
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(v => !v)}>
          <Text style={styles.menuIcon}>•••</Text>
        </Pressable>
        {menuOpen && (
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); onSave(); }}>
              <Text style={styles.menuItemText}>save for later</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); onBlock(); }}>
              <Text style={styles.menuItemText}>block</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); onReport(); }}>
              <Text style={[styles.menuItemText, { color: Colors.error }]}>report</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 2. Identity row */}
      <View style={styles.section}>
        <Text style={styles.nameAge}>
          {profile.displayName},{' '}
          <Text style={styles.ageQuoted}>"{profile.age}"</Text>
        </Text>
        <Text style={styles.distanceText}>{formatDistance(profile.distanceM)} away</Text>
        <View style={styles.pillsRow}>
          {profile.lookingFor && (
            <View style={styles.pill}><Text style={styles.pillText}>{profile.lookingFor.replace(/_/g, ' ')}</Text></View>
          )}
          {profile.relationshipStructure && (
            <View style={styles.pill}><Text style={styles.pillText}>{profile.relationshipStructure.replace(/_/g, ' ')}</Text></View>
          )}
          <View style={styles.pill}><Text style={styles.pillText}>{profile.pronouns.replace(/_/g, '/')}</Text></View>
        </View>
      </View>

      {/* 3. Pet widget */}
      {profile.petActive && profile.petEmoji && profile.petOneliner && (
        <View style={[styles.section, styles.petPill]}>
          <Text style={styles.petEmoji}>{profile.petEmoji}</Text>
          <Text style={styles.petText}>{profile.petOneliner}</Text>
        </View>
      )}

      {/* 4. Chaos score */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>chaos score</Text>
        <View style={styles.chaosRow}>
          <View style={styles.chaosBarTrack}>
            <View style={[styles.chaosBarFill, { width: `${Math.min(100, Math.max(0, profile.chaosScore))}%` as any }]} />
          </View>
          <Text style={styles.chaosNumber}>{profile.chaosScore}</Text>
        </View>
        {profile.employmentStatus && (
          <Text style={styles.employment}>{profile.employmentStatus.replace(/_/g, ' ')}</Text>
        )}
      </View>

      {/* 5. Red flags */}
      {profile.flags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>red flags</Text>
          <View style={styles.flagsWrap}>
            {profile.flags.map(flag => (
              <Pressable
                key={flag.id}
                style={[styles.flagTag, selectedFlagId === flag.id && styles.flagTagSelected]}
                onLongPress={() => onFlagLongPress(flag.id)}
                delayLongPress={500}
              >
                <Text style={styles.flagText}>🚩 {flag.label}</Text>
              </Pressable>
            ))}
          </View>
          {selectedFlagId && (
            <Text style={styles.flagHint}>
              flag selected — tap 🤢 below for a targeted ick
            </Text>
          )}
        </View>
      )}

      {/* 6. Prompts */}
      {profile.prompts.map((p, i) => (
        <View key={i} style={styles.section}>
          <Text style={styles.sectionLabel}>{p.question.toLowerCase()}</Text>
          <Text style={styles.promptAnswer}>"{p.answer}"</Text>
        </View>
      ))}

      {/* 7. Biggest failure */}
      {profile.biggestFailure && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>my biggest failure</Text>
          <Text style={styles.promptAnswer}>{profile.biggestFailure}</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const GALLERY_HEIGHT = 360;

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { flexGrow: 1 },
  galleryContainer: {
    height: GALLERY_HEIGHT,
    position: 'relative',
  },
  galleryPhoto: {
    height: GALLERY_HEIGHT,
  },
  photoPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  photoCounterText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  menuBtn: {
    position: 'absolute',
    top: 12,
    right: 56,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  menuIcon: {
    color: Colors.textPrimary,
    fontSize: 14,
    letterSpacing: 1,
  },
  menu: {
    position: 'absolute',
    top: 44,
    right: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameAge: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ageQuoted: { opacity: 0.8 },
  distanceText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  petPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a2e',
  },
  petEmoji: { fontSize: 20 },
  petText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  chaosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chaosBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chaosBarFill: {
    height: '100%',
    backgroundColor: '#ff6b00',
    borderRadius: 3,
  },
  chaosNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ff6b00',
    minWidth: 44,
    textAlign: 'right',
  },
  employment: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  flagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flagTag: {
    backgroundColor: '#1a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,0,80,0.2)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  flagTagSelected: {
    borderColor: '#ff0050',
    transform: [{ scale: 1.05 }],
  },
  flagText: {
    fontSize: 12,
    color: '#ff7099',
  },
  flagHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  promptAnswer: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
