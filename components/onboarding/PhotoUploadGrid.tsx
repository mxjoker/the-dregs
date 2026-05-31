import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

type Slot = {
  order: number; // 1–6
  url: string | null;
  storagePath: string | null;
  uploading: boolean;
  error: boolean;
};

type Props = {
  profileId: string;
  initialPhotos?: Array<{ display_order: number; storage_path: string; url: string }>;
  onPhotoCountChange?: (count: number) => void;
};

export function PhotoUploadGrid({ profileId, initialPhotos = [], onPhotoCountChange }: Props) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: 6 }, (_, i) => {
      const order = i + 1;
      const existing = initialPhotos.find(p => p.display_order === order);
      return {
        order,
        url: existing?.url ?? null,
        storagePath: existing?.storage_path ?? null,
        uploading: false,
        error: false,
      };
    }),
  );

  function updateSlot(order: number, patch: Partial<Slot>) {
    setSlots(prev => prev.map(s => (s.order === order ? { ...s, ...patch } : s)));
  }

  async function handleSlotPress(slot: Slot) {
    if (slot.url) {
      Alert.alert('Photo', undefined, [
        { text: 'Replace', onPress: () => pickAndUpload(slot.order) },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removePhoto(slot.order, slot.storagePath),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      await pickAndUpload(slot.order);
    }
  }

  async function pickAndUpload(order: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    updateSlot(order, { uploading: true, error: false });
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${profileId}/${order}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('profile_photos').upsert({
        profile_id: profileId,
        storage_path: path,
        display_order: order,
      });
      if (dbError) throw dbError;

      const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
      setSlots(prev => {
        const next = prev.map(s =>
          s.order === order ? { ...s, url: data.publicUrl, storagePath: path, uploading: false } : s
        );
        onPhotoCountChange?.(next.filter(s => s.url !== null).length);
        return next;
      });
    } catch {
      updateSlot(order, { uploading: false, error: true });
    }
  }

  async function removePhoto(order: number, storagePath: string | null) {
    if (storagePath) {
      await supabase.storage.from('profile-photos').remove([storagePath]);
      await supabase
        .from('profile_photos')
        .delete()
        .eq('profile_id', profileId)
        .eq('display_order', order);
    }
    setSlots(prev => {
      const next = prev.map(s =>
        s.order === order ? { ...s, url: null, storagePath: null, uploading: false, error: false } : s
      );
      onPhotoCountChange?.(next.filter(s => s.url !== null).length);
      return next;
    });
  }

  const filledCount = slots.filter(s => s.url !== null).length;

  return (
    <View>
      <View style={styles.grid}>
        {slots.map(slot => (
          <Pressable
            key={slot.order}
            style={[styles.slot, slot.order === 1 && styles.primarySlot]}
            onPress={() => handleSlotPress(slot)}
          >
            {slot.url ? (
              <Image source={{ uri: slot.url }} style={styles.slotImage} />
            ) : slot.uploading ? (
              <ActivityIndicator color={Colors.textMuted} />
            ) : slot.error ? (
              <View style={styles.slotInner}>
                <Text style={styles.slotErrorIcon}>↻</Text>
                <Text style={styles.slotErrorText}>try again</Text>
              </View>
            ) : (
              <View style={styles.slotInner}>
                <Text style={styles.slotPlus}>+</Text>
                {slot.order === 1 && (
                  <Text style={styles.slotPrimaryLabel}>primary</Text>
                )}
              </View>
            )}
          </Pressable>
        ))}
      </View>
      {filledCount === 0 && (
        <Text style={styles.nudge}>no photos. bold strategy.</Text>
      )}
    </View>
  );
}

const SLOT_SIZE = 96;
const PRIMARY_HEIGHT = 160;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primarySlot: {
    width: '100%',
    height: PRIMARY_HEIGHT,
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotInner: {
    alignItems: 'center',
    gap: 4,
  },
  slotPlus: {
    fontSize: 28,
    color: Colors.textMuted,
    lineHeight: 32,
  },
  slotPrimaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slotErrorIcon: {
    fontSize: 22,
    color: Colors.error,
  },
  slotErrorText: {
    fontSize: 10,
    color: Colors.error,
  },
  nudge: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
