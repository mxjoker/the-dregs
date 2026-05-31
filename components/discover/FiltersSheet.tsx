import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import type { DiscoverFilters } from '@/lib/discover';
import { DEFAULT_FILTERS } from '@/lib/discover';

const RELATIONSHIP_OPTIONS = [
  { label: 'monogamous', value: 'monogamous' },
  { label: 'open', value: 'open_relationship' },
  { label: 'poly', value: 'polyamorous' },
  { label: 'enm', value: 'ethically_non_monogamous' },
  { label: 'figuring it out', value: 'still_figuring_it_out' },
];

type Props = {
  visible: boolean;
  filters: DiscoverFilters;
  onClose: (filters: DiscoverFilters) => void;
};

export function FiltersSheet({ visible, filters, onClose }: Props) {
  const [local, setLocal] = useState<DiscoverFilters>(filters);

  function handleClose() {
    onClose(local);
  }

  function toggleRelStructure(value: string) {
    setLocal(prev => ({
      ...prev,
      relationshipStructure: prev.relationshipStructure === value ? null : value,
    }));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.header}>filters</Text>

          {/* Distance */}
          <View style={styles.section}>
            <Text style={styles.label}>
              distance — {local.maxDistanceKm === 100 ? 'anywhere' : `${local.maxDistanceKm} km`}
            </Text>
            <Slider
              minimumValue={1}
              maximumValue={100}
              step={1}
              value={local.maxDistanceKm}
              onValueChange={v => setLocal(prev => ({ ...prev, maxDistanceKm: v }))}
              minimumTrackTintColor="#ff0050"
              thumbTintColor="#ff0050"
            />
          </View>

          {/* Age range */}
          <View style={styles.section}>
            <Text style={styles.label}>
              "age" — {local.minAge}–{local.maxAge === 99 ? '99+' : local.maxAge}
            </Text>
            <View style={styles.ageRow}>
              <View style={styles.ageSlider}>
                <Text style={styles.ageSliderLabel}>min</Text>
                <Slider
                  minimumValue={18}
                  maximumValue={local.maxAge - 1}
                  step={1}
                  value={local.minAge}
                  onValueChange={v => setLocal(prev => ({ ...prev, minAge: v }))}
                  minimumTrackTintColor="#ff0050"
                  thumbTintColor="#ff0050"
                />
              </View>
              <View style={styles.ageSlider}>
                <Text style={styles.ageSliderLabel}>max</Text>
                <Slider
                  minimumValue={local.minAge + 1}
                  maximumValue={99}
                  step={1}
                  value={local.maxAge}
                  onValueChange={v => setLocal(prev => ({ ...prev, maxAge: v }))}
                  minimumTrackTintColor="#ff0050"
                  thumbTintColor="#ff0050"
                />
              </View>
            </View>
          </View>

          {/* Relationship structure */}
          <View style={styles.section}>
            <Text style={styles.label}>relationship structure (optional)</Text>
            <View style={styles.relRow}>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.relChip,
                    local.relationshipStructure === opt.value && styles.relChipSelected,
                  ]}
                  onPress={() => toggleRelStructure(opt.value)}
                >
                  <Text
                    style={[
                      styles.relChipText,
                      local.relationshipStructure === opt.value && styles.relChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.applyBtn} onPress={handleClose}>
            <Text style={styles.applyText}>apply</Text>
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
    paddingBottom: 48,
    gap: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'lowercase',
  },
  ageRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ageSlider: {
    flex: 1,
    gap: 2,
  },
  ageSliderLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  relChipSelected: {
    borderColor: '#ff0050',
    backgroundColor: 'rgba(255,0,80,0.1)',
  },
  relChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  relChipTextSelected: {
    color: Colors.textPrimary,
  },
  applyBtn: {
    backgroundColor: '#cc0040',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
