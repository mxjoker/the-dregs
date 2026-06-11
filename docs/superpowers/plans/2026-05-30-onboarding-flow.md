# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 5-step onboarding flow (basics → disaster profile → ex reviews → prompts → vibe check) that new users complete before reaching the main app.

**Architecture:** Each screen is a self-contained component that writes its step to Supabase and advances `onboarding_step`. An `OnboardingContext` carries cross-screen state (selected prompt slugs, ex framing, userId, profileId). The root layout routing table directs authenticated users to the correct onboarding screen on resume. Shared shell components (`ProgressDots`, `OnboardingShell`) eliminate style repetition across screens.

**Tech Stack:** React Native, Expo Router, TypeScript, Supabase JS v2, jest-expo

---

### Task 1: Migration — decrement_vibe_check_timer RPC

**Files:**
- Create: `supabase/migrations/20260529000002_decrement_vibe_check_timer.sql`

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260529000002_decrement_vibe_check_timer.sql`:
```sql
CREATE OR REPLACE FUNCTION decrement_vibe_check_timer(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET vibe_check_timer_expiry = vibe_check_timer_expiry - interval '1 second'
  WHERE user_id = p_user_id
    AND vibe_check_timer_expiry > now()
    AND vibe_check_passed = false;
END; $$;
```

- [ ] **Step 2: Apply migration locally**
```bash
npx supabase db push
```
Expected: Migration applied, no errors.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260529000002_decrement_vibe_check_timer.sql
git commit -m "feat: add decrement_vibe_check_timer RPC"
```

---

### Task 2: Extend database.types.ts

**Files:**
- Modify: `lib/database.types.ts`

Adds exported enum types, extends `profiles` Row/Insert/Update with all onboarding fields, adds `prompts`, `profile_prompts`, `ex_entries`, `vibe_check_knocks` table types, and registers the two RPCs in `Functions`.

- [ ] **Step 1: Replace lib/database.types.ts with the full version**

```typescript
// Minimal hand-written types for tables used so far.
// Replace with full generated types by running:
//   npx supabase gen types typescript --project-id uhqulmxdcjkpxbxsatug > lib/database.types.ts

export type EmploymentStatus =
  | 'technically_consulting' | 'funemployed' | 'its_complicated'
  | 'between_callings' | 'employed_unfortunately' | 'self_employed_loosely'
  | 'working_on_something' | 'in_a_band' | 'full_time_creative'
  | 'student_professionally' | 'freelance_everything' | 'on_sabbatical_unplanned';

export type LookingForOption =
  | 'emotional_damage' | 'someone_to_blame' | 'situationship_with_potential'
  | 'chaos_but_make_it_romantic' | 'someone_who_texts_back'
  | 'a_reason_to_stay_in_this_city' | 'to_be_perceived'
  | 'mostly_this_app_to_work_out' | 'something_undefined'
  | 'a_person_not_a_project' | 'my_keys_and_also_love'
  | 'to_relocate_for_wrong_reasons';

export type RelationshipStructure =
  | 'monogamous' | 'ethically_non_monogamous' | 'polyamorous'
  | 'open_relationship' | 'relationship_anarchist' | 'solo_poly'
  | 'still_figuring_it_out' | 'its_complicated'
  | 'not_a_conversation_im_having_on_app';

export type GenderIdentityOption =
  | 'man' | 'woman' | 'non_binary' | 'genderfluid' | 'genderqueer'
  | 'agender' | 'transgender_man' | 'transgender_woman' | 'two_spirit'
  | 'intersex' | 'questioning' | 'self_describe' | 'prefer_not_to_say';

export type PronounsOption =
  | 'he_him' | 'she_her' | 'they_them' | 'he_they' | 'she_they'
  | 'any_pronouns' | 'ask_me' | 'self_describe';

export type ExReviewFraming = 'work_history' | 'verified_purchases';
export type ExVerifiedBadge = 'verified_situationship' | 'verified_chaos';
export type OnboardingStep =
  | 'not_started' | 'basics' | 'disaster_profile' | 'ex_reviews' | 'prompts' | 'complete';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          date_of_birth: string;
          created_at: string;
          deleted_at: string | null;
          is_banned: boolean;
          ban_reason: string | null;
          account_number: number;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          date_of_birth: string;
          created_at?: string;
          deleted_at?: string | null;
          is_banned?: boolean;
          ban_reason?: string | null;
          account_number?: number;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          date_of_birth?: string;
          created_at?: string;
          deleted_at?: string | null;
          is_banned?: boolean;
          ban_reason?: string | null;
          account_number?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          pronouns: PronounsOption;
          pronouns_text: string | null;
          gender_identity: GenderIdentityOption;
          gender_identity_text: string | null;
          employment_status: EmploymentStatus | null;
          looking_for: LookingForOption | null;
          relationship_structure: RelationshipStructure | null;
          biggest_failure: string | null;
          ex_review_framing: ExReviewFraming;
          onboarding_step: OnboardingStep;
          vibe_check_passed: boolean;
          vibe_check_passed_at: string | null;
          vibe_check_timer_expiry: string | null;
          chaos_score: number;
          is_visible: boolean;
          is_paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          pronouns?: PronounsOption;
          pronouns_text?: string | null;
          gender_identity?: GenderIdentityOption;
          gender_identity_text?: string | null;
          onboarding_step?: OnboardingStep;
          vibe_check_passed?: boolean;
        };
        Update: {
          display_name?: string;
          pronouns?: PronounsOption;
          pronouns_text?: string | null;
          gender_identity?: GenderIdentityOption;
          gender_identity_text?: string | null;
          employment_status?: EmploymentStatus | null;
          looking_for?: LookingForOption | null;
          relationship_structure?: RelationshipStructure | null;
          biggest_failure?: string | null;
          ex_review_framing?: ExReviewFraming;
          onboarding_step?: OnboardingStep;
          vibe_check_passed?: boolean;
          vibe_check_timer_expiry?: string | null;
          is_visible?: boolean;
          is_paused?: boolean;
        };
        Relationships: [];
      };
      prompts: {
        Row: {
          id: string;
          slug: string;
          prompt_text: string;
          display_order: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profile_prompts: {
        Row: {
          id: string;
          profile_id: string;
          prompt_id: string;
          answer: string;
          display_order: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          prompt_id: string;
          answer: string;
          display_order: number;
          answered_at?: string;
        };
        Update: {
          answer?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      ex_entries: {
        Row: {
          id: string;
          profile_id: string;
          display_order: number;
          nickname: string;
          wh_job_title: string | null;
          wh_start_date: string | null;
          wh_end_date: string | null;
          wh_role_description: string | null;
          wh_reason_for_leaving: string | null;
          vp_star_rating: number | null;
          vp_review_title: string | null;
          vp_review_body: string | null;
          vp_badge: ExVerifiedBadge | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          display_order: number;
          nickname: string;
          wh_job_title?: string | null;
          wh_start_date?: string | null;
          wh_end_date?: string | null;
          wh_role_description?: string | null;
          wh_reason_for_leaving?: string | null;
          vp_star_rating?: number | null;
          vp_review_title?: string | null;
          vp_review_body?: string | null;
          vp_badge?: ExVerifiedBadge | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      vibe_check_knocks: {
        Row: { id: string; user_id: string; tapped_at: string };
        Insert: { id?: string; user_id: string; tapped_at?: string };
        Update: never;
        Relationships: [];
      };
      desperation_points_balance: {
        Row: { user_id: string; balance: number; updated_at: string };
        Insert: { user_id: string; balance?: number; updated_at?: string };
        Update: { balance?: number; updated_at?: string };
        Relationships: [];
      };
      chaos_coins_balance: {
        Row: { user_id: string; balance: number; updated_at: string };
        Insert: { user_id: string; balance?: number; updated_at?: string };
        Update: { balance?: number; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      decrement_vibe_check_timer: {
        Args: { p_user_id: string };
        Returns: void;
      };
      complete_vibe_check: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
};
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add lib/database.types.ts
git commit -m "feat: extend database types for onboarding tables and enums"
```

---

### Task 3: Validation helpers + tests

**Files:**
- Create: `lib/onboarding.ts`
- Create: `__tests__/lib/onboarding.test.ts`

- [ ] **Step 1: Write failing tests**

`__tests__/lib/onboarding.test.ts`:
```typescript
import { validateDisplayName, validateYear } from '@/lib/onboarding';

describe('validateDisplayName', () => {
  it('returns error for empty string', () => {
    expect(validateDisplayName('')).toBe('display name is required');
  });

  it('returns error for whitespace only', () => {
    expect(validateDisplayName('   ')).toBe('display name is required');
  });

  it('returns null for valid name', () => {
    expect(validateDisplayName('chaos goblin')).toBeNull();
  });
});

describe('validateYear', () => {
  it('returns error for empty string', () => {
    expect(validateYear('')).toBe('enter a year');
  });

  it('returns error for non-numeric input', () => {
    expect(validateYear('abcd')).toBe('enter a year');
  });

  it('returns error for year before 1900', () => {
    expect(validateYear('1899')).toBe('enter a year');
  });

  it('returns error for year after current year', () => {
    const next = String(new Date().getFullYear() + 1);
    expect(validateYear(next)).toBe('enter a year');
  });

  it('returns null for valid year', () => {
    expect(validateYear('2019')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npx jest __tests__/lib/onboarding.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/onboarding'`

- [ ] **Step 3: Implement lib/onboarding.ts**

```typescript
export function validateDisplayName(name: string): string | null {
  if (!name.trim()) return 'display name is required';
  return null;
}

export function validateYear(year: string): string | null {
  const n = parseInt(year, 10);
  if (!year || isNaN(n) || n < 1900 || n > new Date().getFullYear()) {
    return 'enter a year';
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**
```bash
npx jest __tests__/lib/onboarding.test.ts --no-coverage
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**
```bash
git add lib/onboarding.ts __tests__/lib/onboarding.test.ts
git commit -m "feat: onboarding validation helpers with tests"
```

---

### Task 4: OnboardingContext

**Files:**
- Create: `context/OnboardingContext.tsx`

Holds cross-screen state: `userId` (our `users.id`), `profileId` (`profiles.id`), selected prompt slugs, current prompt index, and chosen ex framing. Both IDs are fetched once at layout level to avoid repeated DB calls in every screen.

- [ ] **Step 1: Create context/OnboardingContext.tsx**

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import { ExReviewFraming } from '@/lib/database.types';

type OnboardingContextValue = {
  userId: string;
  profileId: string;
  selectedPromptSlugs: string[];
  setSelectedPromptSlugs: (slugs: string[]) => void;
  currentPromptIndex: number;
  setCurrentPromptIndex: (index: number) => void;
  selectedFraming: ExReviewFraming | null;
  setSelectedFraming: (framing: ExReviewFraming | null) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  userId,
  profileId,
  children,
}: {
  userId: string;
  profileId: string;
  children: ReactNode;
}) {
  const [selectedPromptSlugs, setSelectedPromptSlugs] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedFraming, setSelectedFraming] = useState<ExReviewFraming | null>(null);

  return (
    <OnboardingContext.Provider
      value={{
        userId,
        profileId,
        selectedPromptSlugs,
        setSelectedPromptSlugs,
        currentPromptIndex,
        setCurrentPromptIndex,
        selectedFraming,
        setSelectedFraming,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add context/OnboardingContext.tsx
git commit -m "feat: OnboardingContext for cross-screen onboarding state"
```

---

### Task 5: (onboarding) layout + root layout update

**Files:**
- Create: `app/(onboarding)/_layout.tsx`
- Modify: `app/_layout.tsx`

The onboarding layout fetches `users.id` and `profiles.id` on mount, then wraps screens in `OnboardingProvider`. The root layout routing table covers all 6 `onboarding_step` states.

- [ ] **Step 1: Create app/(onboarding)/_layout.tsx**

```typescript
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

export default function OnboardingLayout() {
  const sessionState = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionState.status !== 'authenticated') return;
    const authId = sessionState.session.user.id;

    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single();
      if (!userData) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .single();
      if (!profileData) return;

      setUserId(userData.id);
      setProfileId(profileData.id);
    })();
  }, [sessionState.status]);

  if (!userId || !profileId) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <OnboardingProvider userId={userId} profileId={profileId}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </OnboardingProvider>
  );
}
```

- [ ] **Step 2: Update app/_layout.tsx**

Add `import { supabase } from '@/lib/supabase';` to imports.

Register the `(onboarding)` group inside the `<Stack>` (alongside the existing `(auth)` and `(tabs)` entries):
```typescript
<Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
```

Replace the `useEffect` routing block with:
```typescript
  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();

    if (sessionState.status === 'unauthenticated') {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (sessionState.status === 'authenticated') {
      const authId = sessionState.session.user.id;

      (async () => {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authId)
          .single();

        if (!userData) {
          router.replace('/(auth)/sign-in');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, vibe_check_passed')
          .eq('user_id', userData.id)
          .single();

        if (!profile) {
          router.replace('/(onboarding)/basics');
          return;
        }

        const { onboarding_step, vibe_check_passed } = profile;

        if (onboarding_step === 'complete' && vibe_check_passed) {
          router.replace('/(tabs)');
          return;
        }

        const stepRoutes: Record<string, string> = {
          not_started: '/(onboarding)/basics',
          basics: '/(onboarding)/disaster-profile',
          disaster_profile: '/(onboarding)/ex-reviews',
          ex_reviews: '/(onboarding)/prompts',
          prompts: '/(onboarding)/vibe-check',
          complete: '/(onboarding)/vibe-check',
        };

        router.replace(stepRoutes[onboarding_step] as any);
      })();
    }
  }, [isReady, sessionState.status]);
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**
```bash
git add app/(onboarding)/_layout.tsx app/_layout.tsx
git commit -m "feat: onboarding layout with provider, root layout onboarding routing"
```

---

### Task 6: Shared onboarding UI components

**Files:**
- Create: `components/onboarding/ProgressDots.tsx`
- Create: `components/onboarding/OnboardingShell.tsx`

- [ ] **Step 1: Create components/onboarding/ProgressDots.tsx**

```typescript
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current ? styles.dotDone : i === current ? styles.dotActive : styles.dotFuture,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 32 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotDone: { backgroundColor: '#3a3a3a' },
  dotActive: { backgroundColor: Colors.accent },
  dotFuture: { backgroundColor: '#1e1e1e' },
});
```

- [ ] **Step 2: Create components/onboarding/OnboardingShell.tsx**

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**
```bash
git add components/onboarding/
git commit -m "feat: shared ProgressDots and OnboardingShell components"
```

---

### Task 7: Step 1 — basics.tsx

**Files:**
- Create: `app/(onboarding)/basics.tsx`

**Note on pronouns:** The DB `pronouns` column is a single `pronouns_option` enum (not an array). Multi-select is allowed in the UI per spec. Store the first selected value as the primary. The `pronouns_text` column captures free-text expansion when `self_describe` is toggled.

- [ ] **Step 1: Create app/(onboarding)/basics.tsx**

```typescript
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';
import { validateDisplayName } from '@/lib/onboarding';
import { GenderIdentityOption, PronounsOption } from '@/lib/database.types';

const PRONOUNS: { label: string; value: PronounsOption }[] = [
  { label: 'he/him', value: 'he_him' },
  { label: 'she/her', value: 'she_her' },
  { label: 'they/them', value: 'they_them' },
  { label: 'he/they', value: 'he_they' },
  { label: 'she/they', value: 'she_they' },
  { label: 'any pronouns', value: 'any_pronouns' },
  { label: 'ask me', value: 'ask_me' },
  { label: 'self describe', value: 'self_describe' },
];

const GENDER_OPTIONS: { label: string; value: GenderIdentityOption }[] = [
  { label: 'man', value: 'man' },
  { label: 'woman', value: 'woman' },
  { label: 'non-binary', value: 'non_binary' },
  { label: 'genderfluid', value: 'genderfluid' },
  { label: 'genderqueer', value: 'genderqueer' },
  { label: 'agender', value: 'agender' },
  { label: 'transgender man', value: 'transgender_man' },
  { label: 'transgender woman', value: 'transgender_woman' },
  { label: 'two spirit', value: 'two_spirit' },
  { label: 'intersex', value: 'intersex' },
  { label: 'questioning', value: 'questioning' },
  { label: 'self describe', value: 'self_describe' },
  { label: 'prefer not to say', value: 'prefer_not_to_say' },
];

export default function BasicsScreen() {
  const { userId } = useOnboarding();
  const [displayName, setDisplayName] = useState('');
  const [selectedPronouns, setSelectedPronouns] = useState<PronounsOption[]>([]);
  const [pronounsText, setPronounsText] = useState('');
  const [gender, setGender] = useState<GenderIdentityOption>('prefer_not_to_say');
  const [genderText, setGenderText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; general?: string }>({});

  function togglePronoun(value: PronounsOption) {
    setSelectedPronouns(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value],
    );
  }

  async function handleSubmit() {
    const nameErr = validateDisplayName(displayName);
    if (nameErr) {
      setErrors({ displayName: nameErr });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const pronouns: PronounsOption = selectedPronouns[0] ?? 'ask_me';
      const { error } = await supabase.from('profiles').upsert({
        user_id: userId,
        display_name: displayName.trim(),
        pronouns,
        pronouns_text: selectedPronouns.includes('self_describe') && pronounsText ? pronounsText : null,
        gender_identity: gender,
        gender_identity_text: gender === 'self_describe' && genderText ? genderText : null,
        onboarding_step: 'basics',
      });

      if (error) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      router.replace('/(onboarding)/disaster-profile');
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell subline="let's get the basics" step={1}>
      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={[styles.input, errors.displayName ? styles.inputError : null]}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="what do we call you"
        placeholderTextColor={Colors.textMuted}
        maxLength={50}
        editable={!loading}
      />
      {errors.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}

      <Text style={[styles.label, { marginTop: 20 }]}>Pronouns</Text>
      <View style={styles.chipRow}>
        {PRONOUNS.map(p => (
          <Pressable
            key={p.value}
            style={[styles.chip, selectedPronouns.includes(p.value) && styles.chipSelected]}
            onPress={() => togglePronoun(p.value)}
          >
            <Text style={[styles.chipText, selectedPronouns.includes(p.value) && styles.chipTextSelected]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {selectedPronouns.includes('self_describe') && (
        <TextInput
          style={styles.input}
          value={pronounsText}
          onChangeText={setPronounsText}
          placeholder="describe your pronouns"
          placeholderTextColor={Colors.textMuted}
          maxLength={140}
          editable={!loading}
        />
      )}

      <Text style={[styles.label, { marginTop: 20 }]}>Gender Identity</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map(g => (
          <Pressable
            key={g.value}
            style={[styles.chip, gender === g.value && styles.chipSelected]}
            onPress={() => setGender(g.value)}
          >
            <Text style={[styles.chipText, gender === g.value && styles.chipTextSelected]}>
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {gender === 'self_describe' && (
        <TextInput
          style={styles.input}
          value={genderText}
          onChangeText={setGenderText}
          placeholder="describe your gender identity"
          placeholderTextColor={Colors.textMuted}
          maxLength={140}
          editable={!loading}
        />
      )}

      {errors.general ? <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>NEXT →</Text>
        )}
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 8,
  },
  inputError: { borderColor: Colors.error },
  errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: Colors.accentFg },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add app/(onboarding)/basics.tsx
git commit -m "feat: onboarding step 1 — basics screen"
```

---

### Task 8: Step 2 — disaster-profile.tsx

**Files:**
- Create: `app/(onboarding)/disaster-profile.tsx`

- [ ] **Step 1: Create app/(onboarding)/disaster-profile.tsx**

```typescript
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';
import { EmploymentStatus, LookingForOption, RelationshipStructure } from '@/lib/database.types';

const EMPLOYMENT: { label: string; value: EmploymentStatus }[] = [
  { label: 'technically consulting', value: 'technically_consulting' },
  { label: 'funemployed', value: 'funemployed' },
  { label: "it's complicated", value: 'its_complicated' },
  { label: 'between callings', value: 'between_callings' },
  { label: 'employed, unfortunately', value: 'employed_unfortunately' },
  { label: 'self-employed (loosely)', value: 'self_employed_loosely' },
  { label: 'working on something', value: 'working_on_something' },
  { label: 'in a band', value: 'in_a_band' },
  { label: 'full-time creative', value: 'full_time_creative' },
  { label: 'student, professionally', value: 'student_professionally' },
  { label: 'freelance everything', value: 'freelance_everything' },
  { label: 'on sabbatical (unplanned)', value: 'on_sabbatical_unplanned' },
];

const LOOKING_FOR: { label: string; value: LookingForOption }[] = [
  { label: 'emotional damage', value: 'emotional_damage' },
  { label: 'someone to blame', value: 'someone_to_blame' },
  { label: 'situationship with potential', value: 'situationship_with_potential' },
  { label: 'chaos but make it romantic', value: 'chaos_but_make_it_romantic' },
  { label: 'someone who texts back', value: 'someone_who_texts_back' },
  { label: 'a reason to stay in this city', value: 'a_reason_to_stay_in_this_city' },
  { label: 'to be perceived', value: 'to_be_perceived' },
  { label: 'mostly this app to work out', value: 'mostly_this_app_to_work_out' },
  { label: 'something undefined', value: 'something_undefined' },
  { label: 'a person, not a project', value: 'a_person_not_a_project' },
  { label: 'my keys, and also love', value: 'my_keys_and_also_love' },
  { label: 'to relocate for the wrong reasons', value: 'to_relocate_for_wrong_reasons' },
];

const RELATIONSHIP: { label: string; value: RelationshipStructure }[] = [
  { label: 'monogamous', value: 'monogamous' },
  { label: 'ethically non-monogamous', value: 'ethically_non_monogamous' },
  { label: 'polyamorous', value: 'polyamorous' },
  { label: 'open relationship', value: 'open_relationship' },
  { label: 'relationship anarchist', value: 'relationship_anarchist' },
  { label: 'solo poly', value: 'solo_poly' },
  { label: 'still figuring it out', value: 'still_figuring_it_out' },
  { label: "it's complicated", value: 'its_complicated' },
  { label: "not a conversation I'm having on-app", value: 'not_a_conversation_im_having_on_app' },
];

function SelectChips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: T }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map(o => (
        <Pressable
          key={o.value}
          style={[chipStyles.chip, selected === o.value && chipStyles.chipSelected]}
          onPress={() => onSelect(o.value)}
        >
          <Text style={[chipStyles.chipText, selected === o.value && chipStyles.chipTextSelected]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: Colors.accentFg },
});

export default function DisasterProfileScreen() {
  const { userId } = useOnboarding();
  const [employment, setEmployment] = useState<EmploymentStatus | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingForOption | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStructure | null>(null);
  const [biggestFailure, setBiggestFailure] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fields?: string; general?: string }>({});

  async function handleSubmit() {
    if (!employment || !lookingFor || !relationship) {
      setErrors({ fields: 'please fill out all three fields above' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          employment_status: employment,
          looking_for: lookingFor,
          relationship_structure: relationship,
          biggest_failure: biggestFailure.trim() || null,
          onboarding_step: 'disaster_profile',
        })
        .eq('user_id', userId);

      if (error) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      router.replace('/(onboarding)/ex-reviews');
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell subline="the honest part" step={2}>
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backText}>← back</Text>
      </Pressable>

      <Text style={styles.label}>Employment Status</Text>
      <SelectChips options={EMPLOYMENT} selected={employment} onSelect={setEmployment} />

      <Text style={[styles.label, { marginTop: 20 }]}>Looking For</Text>
      <SelectChips options={LOOKING_FOR} selected={lookingFor} onSelect={setLookingFor} />

      <Text style={[styles.label, { marginTop: 20 }]}>Relationship Structure</Text>
      <SelectChips options={RELATIONSHIP} selected={relationship} onSelect={setRelationship} />

      {errors.fields ? <Text style={styles.errorText}>{errors.fields}</Text> : null}

      <Text style={[styles.label, { marginTop: 20 }]}>Biggest Failure</Text>
      <TextInput
        style={styles.textarea}
        value={biggestFailure}
        onChangeText={setBiggestFailure}
        placeholder="optional. 140 chars."
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={140}
        editable={!loading}
      />
      <Text style={styles.charCount}>{biggestFailure.length}/140</Text>

      {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>NEXT →</Text>
        )}
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  backLink: { marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  errorText: { color: Colors.error, fontSize: 11, marginTop: 8 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add app/(onboarding)/disaster-profile.tsx
git commit -m "feat: onboarding step 2 — disaster profile screen"
```

---

### Task 9: Step 3 — ex-reviews.tsx

**Files:**
- Create: `app/(onboarding)/ex-reviews.tsx`

Two internal phases (local state, no sub-routes). Phase A: framing choice cards. Phase B: optional entry form — fields depend on framing. `wh_start_date` / `wh_end_date` are stored as `YYYY-01-01` since the UI is year-only but the DB column is `date`.

- [ ] **Step 1: Create app/(onboarding)/ex-reviews.tsx**

```typescript
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';
import { validateYear } from '@/lib/onboarding';
import { ExReviewFraming, ExVerifiedBadge } from '@/lib/database.types';

type Phase = 'framing' | 'entry';

export default function ExReviewsScreen() {
  const { userId, profileId, setSelectedFraming } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('framing');
  const [framing, setFraming] = useState<ExReviewFraming>('work_history');

  // Work History fields
  const [nickname, setNickname] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [reasonForLeaving, setReasonForLeaving] = useState('');

  // Verified Purchases fields
  const [vpNickname, setVpNickname] = useState('');
  const [stars, setStars] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [badge, setBadge] = useState<ExVerifiedBadge | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ nickname?: string; year?: string; general?: string }>({});

  function handleFramingSelect(f: ExReviewFraming) {
    setFraming(f);
    setSelectedFraming(f);
  }

  async function handleAddAndContinue() {
    const nick = framing === 'work_history' ? nickname : vpNickname;
    if (!nick.trim()) {
      setErrors({ nickname: 'nickname is required' });
      return;
    }
    if (framing === 'work_history') {
      const startErr = startYear ? validateYear(startYear) : null;
      const endErr = endYear ? validateYear(endYear) : null;
      if (startErr || endErr) {
        setErrors({ year: startErr ?? endErr ?? undefined });
        return;
      }
    }
    setErrors({});
    setLoading(true);

    try {
      const entryInsert =
        framing === 'work_history'
          ? {
              profile_id: profileId,
              display_order: 1,
              nickname: nickname.trim(),
              wh_job_title: jobTitle.trim() || null,
              wh_start_date: startYear ? `${startYear}-01-01` : null,
              wh_end_date: endYear ? `${endYear}-01-01` : null,
              wh_reason_for_leaving: reasonForLeaving.trim() || null,
            }
          : {
              profile_id: profileId,
              display_order: 1,
              nickname: vpNickname.trim(),
              vp_star_rating: stars || null,
              vp_review_title: reviewTitle.trim() || null,
              vp_review_body: reviewBody.trim() || null,
              vp_badge: badge,
            };

      const { error: insertError } = await supabase.from('ex_entries').insert(entryInsert);
      if (insertError) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      await finishStep();
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    try {
      await finishStep();
    } finally {
      setLoading(false);
    }
  }

  async function finishStep() {
    await supabase
      .from('profiles')
      .update({ ex_review_framing: framing, onboarding_step: 'ex_reviews' })
      .eq('user_id', userId);
    router.replace('/(onboarding)/prompts');
  }

  if (phase === 'framing') {
    return (
      <OnboardingShell subline="your exes" step={3}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>← back</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>how do you want to frame them?</Text>
        <Pressable
          style={[styles.card, framing === 'work_history' && styles.cardSelected]}
          onPress={() => handleFramingSelect('work_history')}
        >
          <Text style={styles.cardTitle}>Work History</Text>
          <Text style={styles.cardDesc}>
            résumé style. each ex is a past job. dates, title, reason for leaving.
          </Text>
        </Pressable>
        <Pressable
          style={[styles.card, framing === 'verified_purchases' && styles.cardSelected]}
          onPress={() => handleFramingSelect('verified_purchases')}
        >
          <Text style={styles.cardTitle}>Verified Purchases</Text>
          <Text style={styles.cardDesc}>
            amazon review style. stars, a title, one sentence. badge reads 'Verified Situationship'.
          </Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setPhase('entry')}>
          <Text style={styles.buttonText}>NEXT →</Text>
        </Pressable>
      </OnboardingShell>
    );
  }

  // Phase B — optional entry form
  return (
    <OnboardingShell
      subline={framing === 'work_history' ? 'add your first ex' : 'add your first review'}
      step={3}
    >
      {framing === 'work_history' ? (
        <>
          <Text style={styles.label}>Nickname</Text>
          <Text style={styles.hint}>no real names</Text>
          <TextInput
            style={[styles.input, errors.nickname ? styles.inputError : null]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. The Musician"
            placeholderTextColor={Colors.textMuted}
            maxLength={50}
            editable={!loading}
          />
          {errors.nickname ? <Text style={styles.errorText}>{errors.nickname}</Text> : null}

          <Text style={[styles.label, { marginTop: 16 }]}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Chief Emotional Officer"
            placeholderTextColor={Colors.textMuted}
            maxLength={140}
            editable={!loading}
          />

          <View style={styles.yearRow}>
            <View style={styles.yearField}>
              <Text style={styles.label}>Start Year</Text>
              <TextInput
                style={[styles.input, errors.year ? styles.inputError : null]}
                value={startYear}
                onChangeText={setStartYear}
                placeholder="YYYY"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                editable={!loading}
              />
            </View>
            <View style={styles.yearField}>
              <Text style={styles.label}>End Year</Text>
              <TextInput
                style={[styles.input, errors.year ? styles.inputError : null]}
                value={endYear}
                onChangeText={setEndYear}
                placeholder="YYYY"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                editable={!loading}
              />
            </View>
          </View>
          {errors.year ? <Text style={styles.errorText}>{errors.year}</Text> : null}

          <Text style={[styles.label, { marginTop: 16 }]}>Reason for Leaving</Text>
          <TextInput
            style={styles.textarea}
            value={reasonForLeaving}
            onChangeText={setReasonForLeaving}
            placeholder="optional"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={140}
            editable={!loading}
          />
          <Text style={styles.charCount}>{reasonForLeaving.length}/140</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Nickname</Text>
          <Text style={styles.hint}>no real names</Text>
          <TextInput
            style={[styles.input, errors.nickname ? styles.inputError : null]}
            value={vpNickname}
            onChangeText={setVpNickname}
            placeholder="e.g. The One Who Got Away (thankfully)"
            placeholderTextColor={Colors.textMuted}
            maxLength={50}
            editable={!loading}
          />
          {errors.nickname ? <Text style={styles.errorText}>{errors.nickname}</Text> : null}

          <Text style={[styles.label, { marginTop: 16 }]}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setStars(n)}>
                <Text style={[styles.star, n <= stars && styles.starFilled]}>★</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Review Title</Text>
          <TextInput
            style={styles.input}
            value={reviewTitle}
            onChangeText={setReviewTitle}
            placeholder="optional"
            placeholderTextColor={Colors.textMuted}
            maxLength={140}
            editable={!loading}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Review</Text>
          <TextInput
            style={styles.textarea}
            value={reviewBody}
            onChangeText={setReviewBody}
            placeholder="optional"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={140}
            editable={!loading}
          />
          <Text style={styles.charCount}>{reviewBody.length}/140</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>Badge</Text>
          <View style={styles.badgeRow}>
            {(
              [
                { label: 'Verified Situationship', value: 'verified_situationship' as ExVerifiedBadge },
                { label: 'Verified Chaos', value: 'verified_chaos' as ExVerifiedBadge },
              ] as const
            ).map(b => (
              <Pressable
                key={b.value}
                style={[styles.chip, badge === b.value && styles.chipSelected]}
                onPress={() => setBadge(b.value)}
              >
                <Text style={[styles.chipText, badge === b.value && styles.chipTextSelected]}>
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddAndContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>ADD & CONTINUE →</Text>
        )}
      </Pressable>

      <Pressable style={styles.skipLink} onPress={handleSkip} disabled={loading}>
        <Text style={styles.skipText}>skip — add later</Text>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  backLink: { marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 15, marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardSelected: { borderColor: Colors.accent },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: Colors.textMuted, fontSize: 13 },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hint: { fontSize: 11, color: Colors.textMuted, marginBottom: 6, marginTop: -4 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 4,
  },
  inputError: { borderColor: Colors.error },
  textarea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  yearRow: { flexDirection: 'row', gap: 12 },
  yearField: { flex: 1 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  star: { fontSize: 28, color: Colors.border },
  starFilled: { color: Colors.accent },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: Colors.accentFg },
  errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  skipLink: { alignItems: 'center', marginTop: 16 },
  skipText: { color: Colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add app/(onboarding)/ex-reviews.tsx
git commit -m "feat: onboarding step 3 — ex reviews screen"
```

---

### Task 10: Step 4a — prompts.tsx

**Files:**
- Create: `app/(onboarding)/prompts.tsx`

Fetches all prompts from DB, allows toggling exactly 3, stores selected slugs in context before navigating to `prompt-answer`.

- [ ] **Step 1: Create app/(onboarding)/prompts.tsx**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add app/(onboarding)/prompts.tsx
git commit -m "feat: onboarding step 4a — prompt selection screen"
```

---

### Task 11: Step 4b — prompt-answer.tsx

**Files:**
- Create: `app/(onboarding)/prompt-answer.tsx`

Renders 3 times (index 0, 1, 2) by re-rendering the same screen as `currentPromptIndex` advances in context. On the last answer, sets `onboarding_step: 'prompts'` and `vibe_check_timer_expiry` to now + 24 hours, then navigates to vibe-check.

- [ ] **Step 1: Create app/(onboarding)/prompt-answer.tsx**

```typescript
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/context/OnboardingContext';

export default function PromptAnswerScreen() {
  const { userId, profileId, selectedPromptSlugs, currentPromptIndex, setCurrentPromptIndex } =
    useOnboarding();
  const [answer, setAnswer] = useState('');
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ answer?: string; general?: string }>({});

  const slug = selectedPromptSlugs[currentPromptIndex];

  useEffect(() => {
    if (!slug) return;
    setAnswer('');
    setErrors({});
    supabase
      .from('prompts')
      .select('id, prompt_text')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setPromptId(data.id);
          setPromptText(data.prompt_text);
        }
      });
  }, [slug]);

  async function handleSubmit() {
    if (!answer.trim()) {
      setErrors({ answer: 'answer is required' });
      return;
    }
    if (!promptId) return;
    setErrors({});
    setLoading(true);

    try {
      const { error: upsertError } = await supabase.from('profile_prompts').upsert({
        profile_id: profileId,
        prompt_id: promptId,
        answer: answer.trim(),
        display_order: currentPromptIndex + 1,
      });

      if (upsertError) {
        setErrors({ general: 'something went wrong. try again.' });
        return;
      }

      if (currentPromptIndex < 2) {
        setCurrentPromptIndex(currentPromptIndex + 1);
      } else {
        const expiryISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'prompts', vibe_check_timer_expiry: expiryISO })
          .eq('user_id', userId);
        router.replace('/(onboarding)/vibe-check');
      }
    } catch {
      setErrors({ general: 'something went wrong. try again.' });
    } finally {
      setLoading(false);
    }
  }

  const isLast = currentPromptIndex === 2;

  return (
    <OnboardingShell subline={`prompt ${currentPromptIndex + 1} of 3`} step={4}>
      <Pressable
        onPress={() => router.replace('/(onboarding)/prompts')}
        style={styles.backLink}
      >
        <Text style={styles.backText}>← change prompts</Text>
      </Pressable>

      <Text style={styles.promptText}>{promptText}</Text>

      <TextInput
        style={[styles.textarea, errors.answer ? styles.textareaError : null]}
        value={answer}
        onChangeText={setAnswer}
        placeholder="your answer"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={140}
        editable={!loading}
      />
      <Text style={styles.charCount}>{answer.length}/140</Text>
      {errors.answer ? <Text style={styles.errorText}>{errors.answer}</Text> : null}
      {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accentFg} />
        ) : (
          <Text style={styles.buttonText}>{isLast ? 'FINISH →' : 'NEXT PROMPT →'}</Text>
        )}
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  backLink: { marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 13 },
  promptText: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    lineHeight: 28,
  },
  textarea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textareaError: { borderColor: Colors.error },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.accentFg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add app/(onboarding)/prompt-answer.tsx
git commit -m "feat: onboarding step 4b — prompt answer screen"
```

---

### Task 12: Step 5 — vibe-check.tsx

**Files:**
- Create: `app/(onboarding)/vibe-check.tsx`

Local countdown drives the display. A 60-second DB resync corrects drift from backgrounding. `AppState` listener re-fetches expiry when the app returns to foreground. Each knock inserts a row into `vibe_check_knocks` and calls the `decrement_vibe_check_timer` RPC. When timer hits zero, calls `complete_vibe_check` and routes to `/(tabs)`.

- [ ] **Step 1: Create app/(onboarding)/vibe-check.tsx**

```typescript
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { useOnboarding } from '@/context/OnboardingContext';

const TAP_LINES = [
  'still reviewing.',
  'the committee has noted your knock.',
  'please maintain dignity while waiting.',
  'your enthusiasm has been logged.',
  'the door remains unmoved.',
  'noted.',
  "we said we'd let you know.",
  'each knock shaves one second. worth it?',
  'the velvet rope is non-negotiable.',
  'patience is not a vibe check requirement, but it helps.',
  'the committee is reviewing your commitment to the committee.',
  'this is fine.',
];

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export default function VibeCheckScreen() {
  const { userId } = useOnboarding();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [tapLine, setTapLine] = useState(TAP_LINES[0]);
  const tapLineIndex = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchAndSetTimer() {
    const { data } = await supabase
      .from('profiles')
      .select('vibe_check_timer_expiry, vibe_check_passed')
      .eq('user_id', userId)
      .single();

    if (!data) return;

    if (data.vibe_check_passed) {
      router.replace('/(tabs)');
      return;
    }

    if (data.vibe_check_timer_expiry) {
      const diff = Math.max(
        0,
        Math.floor((new Date(data.vibe_check_timer_expiry).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(diff);
    }
  }

  async function completeVibeCheck() {
    await supabase.rpc('complete_vibe_check', { p_user_id: userId });
    router.replace('/(tabs)');
  }

  // Initial fetch + periodic DB resync + foreground re-fetch
  useEffect(() => {
    fetchAndSetTimer();
    syncRef.current = setInterval(fetchAndSetTimer, 60_000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') fetchAndSetTimer();
    });
    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
      sub.remove();
    };
  }, []);

  // Local countdown — restarts whenever secondsLeft is first set (or re-set by DB sync)
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      completeVibeCheck();
      return;
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!);
          completeVibeCheck();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [secondsLeft !== null]);

  async function handleKnock() {
    tapLineIndex.current = (tapLineIndex.current + 1) % TAP_LINES.length;
    setTapLine(TAP_LINES[tapLineIndex.current]);
    setSecondsLeft(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    await supabase.from('vibe_check_knocks').insert({ user_id: userId });
    await supabase.rpc('decrement_vibe_check_timer', { p_user_id: userId });
  }

  if (secondsLeft === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>The Dregs</Text>
      <Text style={styles.subline}>vibe check</Text>

      <Pressable style={styles.door} onPress={handleKnock}>
        <View style={styles.doorKnob} />
      </Pressable>

      <Text style={styles.timer}>{formatCountdown(secondsLeft)}</Text>
      <Text style={styles.tapLine}>{tapLine}</Text>

      <Pressable style={styles.knockButton} onPress={handleKnock}>
        <Text style={styles.knockButtonText}>knock to pass the time</Text>
      </Pressable>
      <Text style={styles.knockCaption}>each knock: −1 second</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 4,
  },
  subline: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 48,
  },
  door: {
    width: 120,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 14,
    marginBottom: 48,
    backgroundColor: Colors.surface,
  },
  doorKnob: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent },
  timer: {
    fontSize: 48,
    fontFamily: 'SpaceMono',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  tapLine: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
  },
  knockButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  knockButtonText: { color: Colors.textSecondary, fontSize: 13 },
  knockCaption: { fontSize: 11, color: Colors.textMuted },
});
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add app/(onboarding)/vibe-check.tsx
git commit -m "feat: onboarding step 5 — vibe check waiting room"
```

---

### Task 13: Final integration check

- [ ] **Step 1: Run full test suite**
```bash
npx jest --no-coverage
```
Expected: All tests pass (existing auth tests + new onboarding validation tests).

- [ ] **Step 2: Full TypeScript check**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Verify all expected files exist**
```bash
ls app/(onboarding)/ && ls context/ && ls components/onboarding/ && ls supabase/migrations/
```
Expected: `_layout.tsx basics.tsx disaster-profile.tsx ex-reviews.tsx prompts.tsx prompt-answer.tsx vibe-check.tsx` / `OnboardingContext.tsx` / `OnboardingShell.tsx ProgressDots.tsx` / three migration files.

- [ ] **Step 4: Final commit**
```bash
git add -p
git commit -m "chore: onboarding flow complete"
```
