# Discover Screen + Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Discover tab — card stack with drag-to-swipe gestures, "But Why" sheet, full profile view, Second Thoughts, filters, and photo upload in onboarding Step 1.

**Architecture:** Pure logic lives in `lib/discover.ts` (data fetching, swipe recording, type definitions). UI is split into focused single-responsibility components under `components/discover/` and `components/onboarding/`. The Discover screen (`app/(tabs)/index.tsx`) orchestrates stack state and wires components together. Gesture logic is isolated in `CardStack.tsx` using `react-native-gesture-handler` + `react-native-reanimated` worklets on the UI thread.

**Tech Stack:** React Native, Expo Router, TypeScript, react-native-gesture-handler, react-native-reanimated, expo-image-picker, expo-linear-gradient, Supabase (auth + db + storage + realtime), AsyncStorage

---

## File Map

**New files:**
- `lib/discover.ts` — DiscoverProfile type, assembleStack(), recordSwipe(), fetchProfiles(), fetchDiscardPile()
- `components/discover/SwipeCard.tsx` — card UI (photo + info strip), no gesture logic
- `components/discover/ActionButtons.tsx` — ✕ · 🤢 · ♥ button strip
- `components/discover/OverlayIndicator.tsx` — drag feedback labels (♥ / ✕ / 🤢) on card
- `components/discover/CardStack.tsx` — 3-card stack, PanGestureHandler, reanimated swipe logic
- `components/discover/ButWhySheet.tsx` — "but why tho" modal bottom sheet
- `components/discover/FiltersSheet.tsx` — filters modal bottom sheet (distance, age, rel structure)
- `components/discover/FullProfileView.tsx` — scrollable full profile content (used in 2 screens)
- `components/onboarding/PhotoUploadGrid.tsx` — 6-slot photo grid for onboarding
- `app/(tabs)/index.tsx` — Discover screen (replaces placeholder)
- `app/discover/full-profile.tsx` — full profile navigation screen
- `app/discover/second-thoughts.tsx` — discard pile screen
- `__tests__/lib/discover.test.ts` — unit tests for lib/discover.ts pure logic

**Modified files:**
- `lib/database.types.ts` — add types for profile_photos, red_flags, profile_red_flags, swipes, matches, but_why_aggregates
- `app/(onboarding)/basics.tsx` — add PhotoUploadGrid section
- `app/_layout.tsx` — wrap with GestureHandlerRootView
- `app/(tabs)/_layout.tsx` — update tab config for Discover screen

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npx expo install)
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Install new packages**

```bash
npx expo install react-native-gesture-handler expo-image-picker expo-linear-gradient @react-native-community/slider
```

Expected output: packages added to package.json, no errors.

- [ ] **Step 2: Wrap root layout with GestureHandlerRootView**

Open `app/_layout.tsx`. Add the import and wrapper. The full file should become:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="discover/full-profile" options={{ headerShown: false }} />
          <Stack.Screen name="discover/second-thoughts" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

Note: match the exact existing import list in your `app/_layout.tsx` — only add `GestureHandlerRootView` import and wrapper. Don't remove existing screens.

- [ ] **Step 3: Verify app still launches**

```bash
npx expo start --ios
```

Expected: app launches, no red screen, no "GestureHandlerRootView" warnings.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/_layout.tsx
git commit -m "feat: install gesture-handler, image-picker, linear-gradient; add GestureHandlerRootView"
```

---

## Task 2: Extend database.types.ts

**Files:**
- Modify: `lib/database.types.ts`

- [ ] **Step 1: Add Discover-related types to the bottom of `lib/database.types.ts`**

Append after the existing `Database` export:

```typescript
// ─── Additional types for Discover / Swipe ────────────────────────────────

export type SwipeAction = 'pass' | 'like' | 'ick';

export type ProfilePhoto = {
  id: string;
  profile_id: string;
  storage_path: string;
  display_order: number; // 1–6
  uploaded_at: string;
};

export type RedFlag = {
  id: string;
  slug: string;
  label: string;
  certified_chaotic: boolean;
  points: number;
  ick_count: number;
};

export type ProfileRedFlag = {
  id: string;
  profile_id: string;
  red_flag_id: string;
  red_flags: RedFlag; // joined
};

export type SwipeRecord = {
  id: string;
  swiper_id: string;
  swiped_id: string;
  action: SwipeAction;
  swiped_at: string;
  targeted_flag_id: string | null;
  but_why_tag: string | null;
};

export type Match = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'active' | 'silent' | 'expired' | 'door_open' | 'unmatched';
  matched_at: string;
};

export type ButWhyAggregate = {
  profile_id: string;
  tag_slug: string;
  count: number;
};

// Shape returned by assemble_stack edge function
export type StackEntry = {
  profile_id: string;
  score: number;
};

// Filters stored in AsyncStorage + synced to profile row
export type DiscoverFilters = {
  maxDistanceKm: number;
  minAge: number;
  maxAge: number;
  relationshipStructure: string | null; // null = off
};

export const DEFAULT_FILTERS: DiscoverFilters = {
  maxDistanceKm: 50,
  minAge: 18,
  maxAge: 99,
  relationshipStructure: null,
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/database.types.ts
git commit -m "feat: add Discover-related types to database.types.ts"
```

---

## Task 3: lib/discover.ts — data layer

**Files:**
- Create: `lib/discover.ts`
- Create: `__tests__/lib/discover.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `__tests__/lib/discover.test.ts`:

```typescript
import {
  buildPhotoUrl,
  formatAge,
  formatDistance,
  getTopFlags,
  DISCARD_PILE_KEY,
} from '@/lib/discover';

describe('buildPhotoUrl', () => {
  it('returns null when storage_path is null', () => {
    expect(buildPhotoUrl(null)).toBeNull();
  });

  it('returns a string URL when given a storage path', () => {
    const url = buildPhotoUrl('profile-photos/abc/1.jpg');
    expect(typeof url).toBe('string');
    expect(url).toContain('profile-photos/abc/1.jpg');
  });
});

describe('formatAge', () => {
  it('computes age from date of birth string', () => {
    const dob = `${new Date().getFullYear() - 30}-06-15`;
    expect(formatAge(dob)).toBe(30);
  });

  it('subtracts 1 if birthday has not occurred yet this year', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');
    const yyyy = String(future.getFullYear() - 25);
    expect(formatAge(`${yyyy}-${mm}-${dd}`)).toBe(24);
  });
});

describe('formatDistance', () => {
  it('returns "<1 km" for distances under 1000m', () => {
    expect(formatDistance(500)).toBe('<1 km');
  });

  it('rounds to nearest km', () => {
    expect(formatDistance(3600)).toBe('4 km');
    expect(formatDistance(3400)).toBe('3 km');
  });
});

describe('getTopFlags', () => {
  const flags = [
    { id: '1', label: 'has a podcast', ick_count: 50 },
    { id: '2', label: 'attachment issues', ick_count: 80 },
    { id: '3', label: 'sends voice notes', ick_count: 30 },
    { id: '4', label: 'will not DTR', ick_count: 60 },
  ];

  it('returns top N flags sorted by ick_count desc', () => {
    const top = getTopFlags(flags as any, 3);
    expect(top.map(f => f.id)).toEqual(['2', '4', '1']);
  });

  it('returns all flags when count < N', () => {
    expect(getTopFlags(flags as any, 10)).toHaveLength(4);
  });
});

describe('DISCARD_PILE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof DISCARD_PILE_KEY).toBe('string');
    expect(DISCARD_PILE_KEY.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/discover.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/lib/discover'"

- [ ] **Step 3: Create `lib/discover.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type {
  DiscoverFilters,
  StackEntry,
  SwipeAction,
  ProfilePhoto,
  ProfileRedFlag,
} from './database.types';

export { DEFAULT_FILTERS } from './database.types';
export type { DiscoverFilters, StackEntry };

export const DISCARD_PILE_KEY = '@dregs/discard_pile';
const FILTERS_KEY = '@dregs/discover_filters';

// ─── Pure helpers (testable without Supabase) ────────────────────────────────

export function buildPhotoUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

export function formatAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatDistance(distanceMetres: number): string {
  if (distanceMetres < 1000) return '<1 km';
  return `${Math.round(distanceMetres / 1000)} km`;
}

export function getTopFlags(
  flags: Array<{ id: string; label: string; ick_count: number }>,
  n: number,
): typeof flags {
  return [...flags].sort((a, b) => b.ick_count - a.ick_count).slice(0, n);
}

// ─── Full profile shape assembled from DB ────────────────────────────────────

export type DiscoverProfile = {
  profileId: string;
  displayName: string;
  age: number;
  distanceM: number;
  chaosScore: number;
  employmentStatus: string | null;
  lookingFor: string | null;
  relationshipStructure: string | null;
  pronouns: string;
  primaryPhotoUrl: string | null;
  photos: string[]; // all photo URLs in display_order
  flags: Array<{ id: string; label: string; ick_count: number }>;
  prompts: Array<{ question: string; answer: string }>;
  biggestFailure: string | null;
  exFraming: 'work_history' | 'verified_purchases';
  exEntries: Array<Record<string, unknown>>;
  petActive: boolean;
  petEmoji: string | null;
  petOneliner: string | null;
};

// ─── Stack assembly ──────────────────────────────────────────────────────────

export async function assembleStack(
  viewerProfileId: string,
  filters: DiscoverFilters,
): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke<{ profile_ids: string[] }>(
    'assemble_stack',
    {
      body: {
        viewer_id: viewerProfileId,
        max_distance_km: filters.maxDistanceKm,
        min_age: filters.minAge,
        max_age: filters.maxAge,
        relationship_structure: filters.relationshipStructure,
      },
    },
  );
  if (error || !data) throw error ?? new Error('assemble_stack returned no data');
  return data.profile_ids;
}

// ─── Fetch profile details for a batch of IDs ────────────────────────────────

export async function fetchProfiles(
  profileIds: string[],
  viewerProfileId: string,
): Promise<DiscoverProfile[]> {
  if (profileIds.length === 0) return [];

  // Fetch location distance via the active_profiles view which joins PostGIS distance
  const { data: rows, error } = await supabase
    .from('active_profiles')
    .select(
      `
      profile_id,
      display_name,
      chaos_score,
      employment_status,
      looking_for,
      relationship_structure,
      pronouns,
      biggest_failure,
      ex_review_framing,
      date_of_birth,
      distance_m,
      profile_photos ( id, storage_path, display_order ),
      profile_red_flags ( id, red_flags ( id, label, ick_count ) ),
      profile_prompts ( answer, display_order, prompts ( prompt_text ) )
    `,
    )
    .in('profile_id', profileIds)
    .eq('viewer_id', viewerProfileId);

  if (error) throw error;
  if (!rows) return [];

  return rows.map(row => {
    const photos = ((row.profile_photos as ProfilePhoto[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(p => buildPhotoUrl(p.storage_path))
      .filter((u): u is string => u !== null);

    const flags = ((row.profile_red_flags as ProfileRedFlag[]) ?? []).map(prf => ({
      id: prf.red_flags.id,
      label: prf.red_flags.label,
      ick_count: prf.red_flags.ick_count,
    }));

    const prompts = ((row.profile_prompts as any[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(pp => ({ question: pp.prompts.prompt_text, answer: pp.answer }));

    return {
      profileId: row.profile_id,
      displayName: row.display_name,
      age: formatAge(row.date_of_birth),
      distanceM: row.distance_m ?? 0,
      chaosScore: row.chaos_score,
      employmentStatus: row.employment_status ?? null,
      lookingFor: row.looking_for ?? null,
      relationshipStructure: row.relationship_structure ?? null,
      pronouns: row.pronouns,
      primaryPhotoUrl: photos[0] ?? null,
      photos,
      flags: getTopFlags(flags, flags.length),
      prompts,
      biggestFailure: row.biggest_failure ?? null,
      exFraming: row.ex_review_framing,
      exEntries: [],
      petActive: false,
      petEmoji: null,
      petOneliner: null,
    };
  });
}

// ─── Record a swipe ──────────────────────────────────────────────────────────

export async function recordSwipe(params: {
  swiperProfileId: string;
  swipedProfileId: string;
  action: SwipeAction;
  targetedFlagId?: string | null;
  butWhyTag?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('swipes').insert({
    swiper_id: params.swiperProfileId,
    swiped_id: params.swipedProfileId,
    action: params.action,
    targeted_flag_id: params.targetedFlagId ?? null,
    but_why_tag: params.butWhyTag ?? null,
  });
  if (error) throw error;
}

// ─── Discard pile (Second Thoughts) ──────────────────────────────────────────

export async function fetchDiscardPile(viewerProfileId: string): Promise<DiscoverProfile[]> {
  const { data: swipeRows, error } = await supabase
    .from('swipes')
    .select('swiped_id, swiped_at')
    .eq('swiper_id', viewerProfileId)
    .eq('action', 'pass')
    .order('swiped_at', { ascending: false });

  if (error) throw error;
  if (!swipeRows || swipeRows.length === 0) return [];

  const ids = swipeRows.map(r => r.swiped_id);
  return fetchProfiles(ids, viewerProfileId);
}

// ─── Filter persistence ──────────────────────────────────────────────────────

export async function loadFilters(): Promise<DiscoverFilters> {
  const { DEFAULT_FILTERS } = await import('./database.types');
  const raw = await AsyncStorage.getItem(FILTERS_KEY);
  if (!raw) return DEFAULT_FILTERS;
  try {
    return JSON.parse(raw) as DiscoverFilters;
  } catch {
    return DEFAULT_FILTERS;
  }
}

export async function saveFilters(filters: DiscoverFilters): Promise<void> {
  await AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/discover.test.ts --no-coverage
```

Expected: PASS (5 test suites, all green). Note: `buildPhotoUrl` test will call `supabase.storage` — jest-expo's auto-mock may need the Supabase client mocked. If it fails with a Supabase error, add this at the top of the test file:

```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${path}` },
        }),
      }),
    },
  },
}));
```

- [ ] **Step 5: Commit**

```bash
git add lib/discover.ts __tests__/lib/discover.test.ts
git commit -m "feat: discover data layer — assembleStack, recordSwipe, fetchProfiles, helpers"
```

---

## Task 4: PhotoUploadGrid component

**Files:**
- Create: `components/onboarding/PhotoUploadGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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
      updateSlot(order, { url: data.publicUrl, storagePath: path, uploading: false });
      onPhotoCountChange?.(slots.filter(s => s.url !== null).length + 1);
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
    updateSlot(order, { url: null, storagePath: null, uploading: false, error: false });
    onPhotoCountChange?.(slots.filter(s => s.url !== null && s.order !== order).length);
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
```

Note: `expo-image` is included in Expo SDK 56. If you get "Cannot find module 'expo-image'", use `Image` from `react-native` instead (same API for `source={{ uri }}`).

- [ ] **Step 2: Commit**

```bash
git add components/onboarding/PhotoUploadGrid.tsx
git commit -m "feat: PhotoUploadGrid — 6-slot photo upload for onboarding"
```

---

## Task 5: Add photo upload to onboarding Basics screen

**Files:**
- Modify: `app/(onboarding)/basics.tsx`

- [ ] **Step 1: Read the current basics.tsx to understand its structure**

Open `app/(onboarding)/basics.tsx` and find where the form fields end and the submit button begins.

- [ ] **Step 2: Add photo upload section**

Import `PhotoUploadGrid` at the top of basics.tsx:

```tsx
import { PhotoUploadGrid } from '@/components/onboarding/PhotoUploadGrid';
```

Add a `profileId` state (populated after the profile row is created on submit, or passed via context). The `useOnboarding` context already provides `userId` — check if it also provides `profileId`. If not, use `userId` as a proxy for the storage path prefix.

Find the section in `BasicsScreen` where form fields are rendered. Add the photo grid after the existing fields, before the submit button:

```tsx
{/* Photo upload — added for Discover spec */}
<View style={{ marginTop: 24 }}>
  <Text style={styles.sectionLabel}>photos</Text>
  {userId ? (
    <PhotoUploadGrid profileId={userId} />
  ) : (
    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
      save your basics first to add photos
    </Text>
  )}
</View>
```

Add the `sectionLabel` style if not present:

```tsx
sectionLabel: {
  fontSize: 11,
  color: Colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 12,
},
```

- [ ] **Step 3: Verify photo upload renders in onboarding**

```bash
npx expo start --ios
```

Navigate through auth → onboarding Step 1. Confirm the photo grid appears with 6 slots, slot 1 is taller, tapping opens the system picker.

- [ ] **Step 4: Commit**

```bash
git add app/(onboarding)/basics.tsx
git commit -m "feat: add photo upload grid to onboarding Step 1 (Basics)"
```

---

## Task 6: SwipeCard component (static, no gestures)

**Files:**
- Create: `components/discover/SwipeCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Colors } from '@/constants/Colors';
import type { DiscoverProfile } from '@/lib/discover';
import { formatDistance, getTopFlags } from '@/lib/discover';

type Props = {
  profile: DiscoverProfile;
  onTap?: () => void;
  onFlagLongPress?: (flagId: string) => void;
  selectedFlagId?: string | null;
};

const CHAOS_RED = '#ff0050';
const CHAOS_ORANGE = '#ff8800';

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
                style={[styles.chaosBarFill, { width: `${profile.chaosScore}%` }]}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/SwipeCard.tsx
git commit -m "feat: SwipeCard component — photo, chaos bar, flags, prompt, pet"
```

---

## Task 7: ActionButtons component

**Files:**
- Create: `components/discover/ActionButtons.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onPass: () => void;
  onIck: () => void;
  onLike: () => void;
  disabled?: boolean;
};

export function ActionButtons({ onPass, onIck, onLike, disabled = false }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.pass, pressed && styles.pressed]}
          onPress={onPass}
          disabled={disabled}
        >
          <Text style={styles.passIcon}>✕</Text>
        </Pressable>
        <Text style={styles.label}>pass</Text>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.ick, styles.ickSize, pressed && styles.pressed]}
          onPress={onIck}
          disabled={disabled}
        >
          <Text style={styles.ickIcon}>🤢</Text>
        </Pressable>
        <Text style={styles.label}>ick</Text>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.like, pressed && styles.pressed]}
          onPress={onLike}
          disabled={disabled}
        >
          <Text style={styles.likeIcon}>♥</Text>
        </Pressable>
        <Text style={styles.label}>like</Text>
      </View>
    </View>
  );
}

const BTN = 56;
const ICK = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  buttonWrap: {
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.93 }],
  },
  pass: {
    backgroundColor: '#2a2a2a',
  },
  passIcon: {
    fontSize: 22,
    color: '#aaaaaa',
  },
  ick: {
    backgroundColor: '#1e2a1a',
  },
  ickSize: {
    width: ICK,
    height: ICK,
    borderRadius: ICK / 2,
  },
  ickIcon: {
    fontSize: 18,
  },
  like: {
    backgroundColor: '#cc0040',
    shadowColor: '#ff0060',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  likeIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/ActionButtons.tsx
git commit -m "feat: ActionButtons — filled circles for pass/ick/like"
```

---

## Task 8: OverlayIndicator component

**Files:**
- Create: `components/discover/OverlayIndicator.tsx`

- [ ] **Step 1: Create the component**

This component renders the drag feedback label (♥ / ✕ / 🤢) on top of the card, fading in as the card moves past the 60pt threshold.

```tsx
import { StyleSheet, Text } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Direction = 'like' | 'pass' | 'ick';

type Props = {
  direction: Direction;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
};

const CONFIG: Record<Direction, { label: string; color: string; threshold: number; side: 'left' | 'right' | 'center' }> = {
  like:  { label: '♥',  color: '#44ff88', threshold: 60,  side: 'left'   },
  pass:  { label: '✕',  color: '#888888', threshold: -60, side: 'right'  },
  ick:   { label: '🤢', color: '#ffffff', threshold: 60,  side: 'center' },
};

export function OverlayIndicator({ direction, translateX, translateY }: Props) {
  const cfg = CONFIG[direction];

  const animatedStyle = useAnimatedStyle(() => {
    let rawProgress = 0;
    if (direction === 'like') {
      rawProgress = translateX.value / cfg.threshold;
    } else if (direction === 'pass') {
      rawProgress = translateX.value / cfg.threshold; // threshold is negative
    } else {
      rawProgress = translateY.value / cfg.threshold;
    }
    const opacity = interpolate(rawProgress, [0, 1], [0, 1], 'clamp');
    return { opacity };
  });

  const positionStyle =
    cfg.side === 'left'
      ? styles.topLeft
      : cfg.side === 'right'
        ? styles.topRight
        : styles.center;

  return (
    <Animated.View style={[styles.base, positionStyle, animatedStyle]}>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    padding: 8,
  },
  topLeft: {
    top: 16,
    left: 16,
  },
  topRight: {
    top: 16,
    right: 16,
  },
  center: {
    top: '40%',
    alignSelf: 'center',
  },
  label: {
    fontSize: 36,
    fontWeight: '900',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/OverlayIndicator.tsx
git commit -m "feat: OverlayIndicator — animated drag feedback labels on card"
```

---

## Task 9: CardStack component with gesture logic

**Files:**
- Create: `components/discover/CardStack.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeCard } from './SwipeCard';
import { OverlayIndicator } from './OverlayIndicator';
import type { DiscoverProfile } from '@/lib/discover';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 800;
const CARD_HEIGHT_FRACTION = 0.72;

type SwipeDirection = 'like' | 'pass' | 'ick';

type Props = {
  profiles: DiscoverProfile[];
  onSwipe: (profileId: string, direction: SwipeDirection) => void;
  onCardTap: (profile: DiscoverProfile) => void;
  onFlagLongPress: (flagId: string) => void;
  selectedFlagId: string | null;
  imperativeSwipeRef?: React.MutableRefObject<((dir: SwipeDirection) => void) | null>;
};

export function CardStack({
  profiles,
  onSwipe,
  onCardTap,
  onFlagLongPress,
  selectedFlagId,
  imperativeSwipeRef,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  function fireSwipe(direction: SwipeDirection) {
    if (profiles.length === 0) return;
    const profileId = profiles[0].profileId;

    const targetX =
      direction === 'like'
        ? SCREEN_WIDTH * 1.5
        : direction === 'pass'
          ? -SCREEN_WIDTH * 1.5
          : 0;
    const targetY = direction === 'ick' ? 800 : 0;

    translateX.value = withTiming(targetX, { duration: 350 }, () => {
      runOnJS(onSwipe)(profileId, direction);
      translateX.value = 0;
      translateY.value = 0;
    });
    if (direction === 'ick') {
      translateY.value = withTiming(targetY, { duration: 300 });
    }
  }

  if (imperativeSwipeRef) {
    imperativeSwipeRef.current = fireSwipe;
  }

  const gesture = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(e => {
      const absX = Math.abs(e.translationX);
      const velX = Math.abs(e.velocityX);
      const reachedThreshold = absX > SWIPE_THRESHOLD || velX > VELOCITY_THRESHOLD;

      if (reachedThreshold) {
        if (e.translationY > SWIPE_THRESHOLD && absX < SWIPE_THRESHOLD) {
          runOnJS(fireSwipe)('ick');
        } else if (e.translationX > 0) {
          runOnJS(fireSwipe)('like');
        } else {
          runOnJS(fireSwipe)('pass');
        }
      } else {
        translateX.value = withSpring(0, { stiffness: 300, damping: 30 });
        translateY.value = withSpring(0, { stiffness: 300, damping: 30 });
      }
    });

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = (translateX.value / SCREEN_WIDTH) * 15;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const secondCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.sqrt(translateX.value ** 2 + translateY.value ** 2) / SWIPE_THRESHOLD,
      1,
    );
    const scale = 0.95 + progress * 0.05;
    return { transform: [{ scale }] };
  });

  const thirdCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.sqrt(translateX.value ** 2 + translateY.value ** 2) / SWIPE_THRESHOLD,
      1,
    );
    const scale = 0.92 + progress * 0.03;
    return { transform: [{ scale }] };
  });

  const cardStyles = [thirdCardStyle, secondCardStyle, topCardStyle];
  const visibleProfiles = profiles.slice(0, 3);

  return (
    <View style={styles.container}>
      {visibleProfiles
        .slice()
        .reverse()
        .map((profile, reversedIndex) => {
          const stackIndex = visibleProfiles.length - 1 - reversedIndex; // 0 = top
          const isTop = stackIndex === 0;
          const animStyle = cardStyles[Math.min(stackIndex, 2)];

          const card = (
            <Animated.View
              key={profile.profileId}
              style={[styles.cardWrapper, animStyle, { zIndex: visibleProfiles.length - stackIndex }]}
            >
              <SwipeCard
                profile={profile}
                onTap={isTop ? () => onCardTap(profile) : undefined}
                onFlagLongPress={isTop ? onFlagLongPress : undefined}
                selectedFlagId={isTop ? selectedFlagId : null}
              />
              {isTop && (
                <>
                  <OverlayIndicator direction="like" translateX={translateX} translateY={translateY} />
                  <OverlayIndicator direction="pass" translateX={translateX} translateY={translateY} />
                  <OverlayIndicator direction="ick" translateX={translateX} translateY={translateY} />
                </>
              )}
            </Animated.View>
          );

          return isTop ? (
            <GestureDetector key={profile.profileId} gesture={gesture}>
              {card}
            </GestureDetector>
          ) : (
            card
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 12,
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/CardStack.tsx
git commit -m "feat: CardStack — gesture-driven swipe stack with reanimated"
```

---

## Task 10: ButWhySheet component

**Files:**
- Create: `components/discover/ButWhySheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/ButWhySheet.tsx
git commit -m "feat: ButWhySheet — 'but why tho' tag modal with 8s auto-dismiss"
```

---

## Task 11: FiltersSheet component

**Files:**
- Create: `components/discover/FiltersSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import type { DiscoverFilters } from '@/lib/discover';
import { DEFAULT_FILTERS } from '@/lib/discover';

// Note: @react-native-community/slider is included in Expo SDK.
// If missing, run: npx expo install @react-native-community/slider

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
```

Note: If `@react-native-community/slider` isn't available, run `npx expo install @react-native-community/slider`.

- [ ] **Step 2: Commit**

```bash
git add components/discover/FiltersSheet.tsx
git commit -m "feat: FiltersSheet — distance, age range, relationship structure filters"
```

---

## Task 12: Update tabs layout for Discover

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Update the tab layout**

Replace the placeholder content in `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarStyle: { backgroundColor: Colors.bg, borderTopColor: Colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'discover', tabBarLabel: 'discover' }}
      />
      <Tabs.Screen
        name="two"
        options={{ title: 'matches', tabBarLabel: 'matches' }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: update tabs layout for Discover screen"
```

---

## Task 13: Discover screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Build the Discover screen**

Replace the placeholder:

```tsx
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { CardStack } from '@/components/discover/CardStack';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { ButWhySheet } from '@/components/discover/ButWhySheet';
import { FiltersSheet } from '@/components/discover/FiltersSheet';
import {
  assembleStack,
  fetchProfiles,
  loadFilters,
  recordSwipe,
  saveFilters,
  type DiscoverFilters,
  type DiscoverProfile,
  DEFAULT_FILTERS,
} from '@/lib/discover';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';

type SwipeDirection = 'like' | 'pass' | 'ick';

const REFILL_THRESHOLD = 5;
const BATCH_SIZE = 10;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useOnboarding();

  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [stackIds, setStackIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [butWhyProfile, setButWhyProfile] = useState<string | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [discardPileEmpty, setDiscardPileEmpty] = useState(true);

  const imperativeSwipe = useRef<((dir: SwipeDirection) => void) | null>(null);
  const viewerProfileIdRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  // Load filters and assemble stack on mount
  useEffect(() => {
    async function init() {
      const savedFilters = await loadFilters();
      setFilters(savedFilters);

      // Get viewer profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .single();
      if (!profile) return;
      viewerProfileIdRef.current = profile.id;

      await fetchStack(profile.id, savedFilters);
      setLoading(false);
    }
    if (userId) init();
  }, [userId]);

  // Realtime match subscription
  useEffect(() => {
    if (!viewerProfileIdRef.current) return;
    const channel = supabase
      .channel('matches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        payload => {
          const match = payload.new as { id: string; user_a_id: string; user_b_id: string };
          const profileId = viewerProfileIdRef.current;
          if (match.user_a_id === profileId || match.user_b_id === profileId) {
            // Match moment screen is out of scope (separate spec) — wire navigation there.
            console.log('match detected:', match.id);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewerProfileIdRef.current]);

  async function fetchStack(profileId: string, currentFilters: DiscoverFilters) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const ids = await assembleStack(profileId, currentFilters);
      if (ids.length === 0) {
        setExhausted(true);
        return;
      }
      setStackIds(ids);
      const firstBatch = ids.slice(0, BATCH_SIZE);
      const fetched = await fetchProfiles(firstBatch, profileId);
      setProfiles(fetched);
    } finally {
      fetchingRef.current = false;
    }
  }

  async function maybePrefetch(currentProfiles: DiscoverProfile[]) {
    if (fetchingRef.current) return;
    if (currentProfiles.length > REFILL_THRESHOLD) return;
    if (!viewerProfileIdRef.current) return;

    const loadedIds = currentProfiles.map(p => p.profileId);
    const remaining = stackIds.filter(id => !loadedIds.includes(id));
    if (remaining.length === 0) return;

    fetchingRef.current = true;
    const nextBatch = remaining.slice(0, BATCH_SIZE);
    const fetched = await fetchProfiles(nextBatch, viewerProfileIdRef.current);
    setProfiles(prev => [...prev, ...fetched]);
    fetchingRef.current = false;
  }

  const handleSwipe = useCallback(
    async (profileId: string, direction: SwipeDirection) => {
      setSelectedFlagId(null);

      // Remove swiped profile from top of stack
      setProfiles(prev => {
        const next = prev.filter(p => p.profileId !== profileId);
        maybePrefetch(next);
        if (next.length === 0) setExhausted(true);
        return next;
      });

      // Record swipe
      if (viewerProfileIdRef.current) {
        await recordSwipe({
          swiperProfileId: viewerProfileIdRef.current,
          swipedProfileId: profileId,
          action: direction,
          targetedFlagId: selectedFlagId,
        });
      }

      // Trigger But Why sheet on like
      if (direction === 'like') {
        setButWhyProfile(profileId);
      }
    },
    [selectedFlagId],
  );

  async function handleFiltersClose(newFilters: DiscoverFilters) {
    setShowFilters(false);
    setFilters(newFilters);
    await saveFilters(newFilters);
    setProfiles([]);
    setExhausted(false);
    if (viewerProfileIdRef.current) {
      setLoading(true);
      await fetchStack(viewerProfileIdRef.current, newFilters);
      setLoading(false);
    }
  }

  async function handleButWhyClose(tag: string | null) {
    if (tag && butWhyProfile && viewerProfileIdRef.current) {
      // Update the swipe row with the but_why_tag (fire-and-forget)
      supabase
        .from('swipes')
        .update({ but_why_tag: tag })
        .eq('swiper_id', viewerProfileIdRef.current)
        .eq('swiped_id', butWhyProfile);
    }
    setButWhyProfile(null);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>assembling your stack...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {!discardPileEmpty && (
          <Pressable onPress={() => router.push('/discover/second-thoughts')}>
            <Text style={styles.secondThoughtsBtn}>second thoughts</Text>
          </Pressable>
        )}
        <View style={styles.topBarSpacer} />
        <Pressable onPress={() => setShowFilters(true)}>
          <Text style={styles.filterIcon}>⊞</Text>
        </Pressable>
      </View>

      {/* Card stack */}
      <View style={styles.stackContainer}>
        {exhausted || profiles.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {exhausted
                ? "you've seen everyone. they've seen you. ball's in someone's court."
                : 'loading...'}
            </Text>
          </View>
        ) : (
          <CardStack
            profiles={profiles}
            onSwipe={handleSwipe}
            onCardTap={profile =>
              router.push({ pathname: '/discover/full-profile', params: { profileId: profile.profileId } })
            }
            onFlagLongPress={flagId => setSelectedFlagId(flagId)}
            selectedFlagId={selectedFlagId}
            imperativeSwipeRef={imperativeSwipe}
          />
        )}
      </View>

      {/* Action buttons */}
      <ActionButtons
        onPass={() => imperativeSwipe.current?.('pass')}
        onIck={() => imperativeSwipe.current?.('ick')}
        onLike={() => imperativeSwipe.current?.('like')}
        disabled={exhausted || profiles.length === 0}
      />

      {/* Sheets */}
      <ButWhySheet
        visible={butWhyProfile !== null}
        onClose={handleButWhyClose}
      />
      <FiltersSheet
        visible={showFilters}
        filters={filters}
        onClose={handleFiltersClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  secondThoughtsBtn: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  topBarSpacer: {
    flex: 1,
  },
  filterIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  stackContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
```

- [ ] **Step 2: Run the app and test the core swipe flow**

```bash
npx expo start --ios
```

- Sign in and complete onboarding (or use a seeded account with `vibe_check_passed = true`)
- Navigate to the Discover tab
- Confirm: cards render, drag-to-swipe works, snap-back works on short drag, card flies off on full swipe
- Confirm: ✕/🤢/♥ buttons trigger the corresponding swipe animation
- Confirm: "But Why" sheet appears after ♥ like, auto-dismisses after 8 seconds
- Confirm: filter icon opens FiltersSheet

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: Discover screen — card stack, swipe gestures, but why sheet, filters"
```

---

## Task 14: FullProfileView component

**Files:**
- Create: `components/discover/FullProfileView.tsx`

- [ ] **Step 1: Create the component**

```tsx
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* 1. Photo gallery */}
      <View style={styles.galleryContainer}>
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
              <Image source={{ uri: item }} style={styles.galleryPhoto} />
            ) : (
              <View style={[styles.galleryPhoto, styles.photoPlaceholder]}>
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
            <View style={[styles.chaosBarFill, { width: `${profile.chaosScore}%` }]} />
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

      {/* 8. Ex entries (placeholder — ex data not yet fetched) */}
      {/* Ex entries are fetched by the parent screen and passed into profile.exEntries */}

      {/* Spacer for sticky footer */}
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
    width: 375,  // will be overridden by FlatList width
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
```

Note: The `FlatList` `renderItem` gallery requires the width to match the screen. Add `onLayout` to the gallery container and pass the measured width to each photo item if needed for correct paging.

- [ ] **Step 2: Commit**

```bash
git add components/discover/FullProfileView.tsx
git commit -m "feat: FullProfileView — scrollable full profile with all sections"
```

---

## Task 15: Full profile screen

**Files:**
- Create: `app/discover/full-profile.tsx`

- [ ] **Step 1: Create the directory and screen**

```bash
mkdir -p app/discover
```

Create `app/discover/full-profile.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { FullProfileView } from '@/components/discover/FullProfileView';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { ButWhySheet } from '@/components/discover/ButWhySheet';
import {
  fetchProfiles,
  recordSwipe,
  type DiscoverProfile,
} from '@/lib/discover';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';

export default function FullProfileScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const insets = useSafeAreaInsets();
  const { userId } = useOnboarding();

  const [profile, setProfile] = useState<DiscoverProfile | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [showButWhy, setShowButWhy] = useState(false);
  const viewerProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .single();
      if (!data) return;
      viewerProfileIdRef.current = data.id;

      const [loaded] = await fetchProfiles([profileId], data.id);
      if (loaded) setProfile(loaded);
    }
    if (userId && profileId) load();
  }, [userId, profileId]);

  async function handleSwipe(direction: 'like' | 'pass' | 'ick') {
    if (!profile || !viewerProfileIdRef.current) return;
    await recordSwipe({
      swiperProfileId: viewerProfileIdRef.current,
      swipedProfileId: profile.profileId,
      action: direction,
      targetedFlagId: selectedFlagId,
    });
    if (direction === 'like') {
      setShowButWhy(true);
    } else {
      router.back();
    }
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: Colors.textMuted }}>loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Back button */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <FullProfileView
        profile={profile}
        onFlagLongPress={setSelectedFlagId}
        selectedFlagId={selectedFlagId}
        onReport={() => {/* report flow — safety feature, plain UX */}}
        onBlock={() => {/* block flow */}}
        onSave={() => {/* save to bookmarks */}}
      />

      {/* Sticky footer */}
      <View style={styles.footer}>
        <ActionButtons
          onPass={() => handleSwipe('pass')}
          onIck={() => handleSwipe('ick')}
          onLike={() => handleSwipe('like')}
        />
      </View>

      <ButWhySheet
        visible={showButWhy}
        onClose={() => {
          setShowButWhy(false);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backIcon: { color: Colors.textPrimary, fontSize: 18 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
});
```

- [ ] **Step 2: Test full profile navigation**

In the Discover screen, tap a card. Confirm the full profile view pushes, all sections render, back swipe returns to stack, action buttons in the footer work.

- [ ] **Step 3: Commit**

```bash
git add app/discover/full-profile.tsx
git commit -m "feat: full profile screen — scrollable view with sticky action footer"
```

---

## Task 16: Second Thoughts screen

**Files:**
- Create: `app/discover/second-thoughts.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { fetchDiscardPile, type DiscoverProfile } from '@/lib/discover';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';

export default function SecondThoughtsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useOnboarding();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const viewerProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .single();
      if (!data) return;
      viewerProfileIdRef.current = data.id;
      const pile = await fetchDiscardPile(data.id);
      setProfiles(pile);
      setLoading(false);
    }
    if (userId) load();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>second thoughts</Text>
        <View style={{ width: 32 }} />
      </View>

      {profiles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            nothing here. you either like everyone or you're lying to yourself.
          </Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={p => p.profileId}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/discover/full-profile',
                  params: { profileId: item.profileId },
                })
              }
            >
              {item.primaryPhotoUrl ? (
                <Image source={{ uri: item.primaryPhotoUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>
                  {item.displayName},{' '}
                  <Text style={styles.rowAge}>"{item.age}"</Text>
                </Text>
                {item.flags[0] && (
                  <Text style={styles.rowFlag}>🚩 {item.flags[0].label}</Text>
                )}
              </View>
              <View style={styles.chaosPill}>
                <Text style={styles.chaosPillText}>{item.chaosScore}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { fontSize: 20, color: Colors.textPrimary, width: 32 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  muted: { color: Colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  thumbPlaceholder: { backgroundColor: Colors.surface },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowAge: { fontWeight: '400', opacity: 0.7 },
  rowFlag: { fontSize: 12, color: '#ff7099' },
  chaosPill: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chaosPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff6b00',
  },
});
```

- [ ] **Step 2: Wire up the "second thoughts" button on the Discover screen**

In `app/(tabs)/index.tsx`, the `discardPileEmpty` state defaults to `true`. After `fetchDiscardPile` is called (or after any `pass` swipe), update this state. Add this after the `fetchStack` call in `init()`:

```typescript
const pile = await fetchDiscardPile(profile.id);
setDiscardPileEmpty(pile.length === 0);
```

Also update `discardPileEmpty` to `false` after the first pass swipe in `handleSwipe`:

```typescript
if (direction === 'pass') {
  setDiscardPileEmpty(false);
}
```

- [ ] **Step 3: Test Second Thoughts flow**

Pass a profile in Discover. The "second thoughts" button should appear in the top-left. Tap it — the discard pile list appears. Tap a row — full profile opens. Actions work from inside.

- [ ] **Step 4: Commit**

```bash
git add app/discover/second-thoughts.tsx app/(tabs)/index.tsx
git commit -m "feat: Second Thoughts discard pile screen"
```

---

## Task 17: Final integration test and cleanup

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass. Fix any failures before continuing.

- [ ] **Step 2: Run the app end-to-end on simulator**

```bash
npx expo start --ios
```

Walk through this checklist:
- [ ] Sign in → onboarding → photo upload grid visible in Step 1, slots work
- [ ] Complete onboarding → land on Discover tab
- [ ] Card renders: photo, name, `"age"`, chaos bar + bold number, flags (max 3 + overflow chip), prompt, pet (if applicable)
- [ ] Drag card left → ✕ overlay fades in → card snaps back if < 120pt
- [ ] Drag card left past threshold → card flies off → next card animates up
- [ ] ✕ / 🤢 / ♥ buttons trigger correct animation
- [ ] ♥ Like → "but why tho" sheet appears → tag selection → dismisses → stack continues
- [ ] 🤢 Ick without flag selection → general ick recorded
- [ ] Long-press a flag on the card → flag highlights → tap 🤢 → targeted ick recorded
- [ ] Tap card → full profile screen pushes
- [ ] Full profile: all sections visible, scroll to bottom, sticky footer always visible
- [ ] Long-press flag in full profile → highlighted → tap 🤢 in footer → targeted ick
- [ ] 3-dot menu top-right → report / block / save options visible
- [ ] Back from full profile → Discover stack intact
- [ ] Pass a card → "second thoughts" appears in top-left
- [ ] Tap "second thoughts" → discard pile list → tap row → full profile
- [ ] Filter icon → FiltersSheet opens → adjust distance/age → apply → stack refetches
- [ ] Stack exhausted empty state: correct copy shown
- [ ] "no photos. bold strategy." empty state when profile has no photos

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Discover screen complete — integration verified"
```
