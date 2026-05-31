# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs so a brand-new account created via the sign-up screen can complete onboarding end-to-end without blank screens or routing errors.

**Architecture:** Three targeted changes — (1) `OnboardingContext` makes `profileId` nullable and exposes a setter, (2) the onboarding layout removes its guard on `profileId` so new users aren't blocked, (3) `sign-up.tsx` routes explicitly after the `users` INSERT instead of relying on the auth event. No new screens, no new tables.

**Note on Fix 4 from the spec:** The spec described a DB trigger for `vibe_check_timer_expiry`. This is already handled: `app/(onboarding)/prompt-answer.tsx` sets `vibe_check_timer_expiry = now() + 24h` client-side when writing `onboarding_step: 'prompts'`. No migration needed.

**Tech Stack:** React Native, Expo Router, TypeScript, Supabase JS client

---

## File Map

| File | Change |
|---|---|
| `context/OnboardingContext.tsx` | `profileId: string \| null`, add `setProfileId` |
| `app/(onboarding)/_layout.tsx` | Remove `profileId` null guard |
| `app/(onboarding)/basics.tsx` | Call `setProfileId` after upsert |
| `app/(auth)/sign-up.tsx` | Explicit `router.replace` after users INSERT |

---

### Task 1: Make `profileId` nullable in OnboardingContext

**Files:**
- Modify: `context/OnboardingContext.tsx`

`ex-reviews.tsx` already reads `profileId` from context (to insert `ex_reviews` rows). After this task, it will receive `string | null` — that's fine because by the time the user reaches that screen, `basics` will have set it (Task 2). No changes needed to `ex-reviews.tsx`.

- [ ] **Step 1: Update the context type and provider**

Replace the entire file with:

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import { ExReviewFraming } from '@/lib/database.types';

type OnboardingContextValue = {
  userId: string;
  profileId: string | null;
  setProfileId: (id: string) => void;
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
  profileId: initialProfileId,
  children,
}: {
  userId: string;
  profileId: string | null;
  children: ReactNode;
}) {
  const [profileId, setProfileId] = useState<string | null>(initialProfileId);
  const [selectedPromptSlugs, setSelectedPromptSlugs] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedFraming, setSelectedFraming] = useState<ExReviewFraming | null>(null);

  return (
    <OnboardingContext.Provider
      value={{
        userId,
        profileId,
        setProfileId,
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

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new errors (the provider now accepts `string | null` for `profileId`).

- [ ] **Step 3: Commit**

```bash
git add context/OnboardingContext.tsx
git commit -m "feat: make profileId nullable in OnboardingContext, add setProfileId"
```

---

### Task 2: Unblock onboarding layout for new users

**Files:**
- Modify: `app/(onboarding)/_layout.tsx`

The layout currently renders a blank screen if `profileId` is null. New users have no profile row until `basics.tsx` creates it, so they're permanently blocked. Fix: only guard on `userId`.

- [ ] **Step 1: Update the guard condition and provider call**

In `app/(onboarding)/_layout.tsx`, make two changes:

1. Change the guard from `if (!userId || !profileId)` to `if (!userId)`.
2. Pass `profileId` (which may be `null`) directly to `OnboardingProvider` — the type now accepts `string | null`.

The full file after changes:

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

      setUserId(userData.id);
      setProfileId(profileData?.id ?? null);
    })();
  }, [sessionState.status]);

  if (!userId) {
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

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(onboarding)/_layout.tsx"
git commit -m "fix: unblock onboarding layout for new users with no profile yet"
```

---

### Task 3: basics.tsx propagates profileId to context after upsert

**Files:**
- Modify: `app/(onboarding)/basics.tsx`

After `basics` creates the profile row via upsert, downstream screens (`ex-reviews.tsx`) need `profileId` from context. Currently `basics` stores the id in local state only. Add a call to `setProfileId` from context after the fetch.

- [ ] **Step 1: Pull `setProfileId` from context and call it after upsert**

In `app/(onboarding)/basics.tsx`:

1. Destructure `setProfileId` from `useOnboarding()`:

```typescript
const { userId, setProfileId } = useOnboarding();
```

2. The local state setter and the context setter will have the same name `setProfileId` — rename the local state to avoid the collision. Replace the local `profileId` state declaration and all its usages:

```typescript
// Replace this line near the top of BasicsScreen:
const [profileId, setProfileId] = useState<string | null>(null);
// with:
const [localProfileId, setLocalProfileId] = useState<string | null>(null);
```

And update the two places that use `profileId` / `setProfileId` local state:

```typescript
// In handleSubmit, replace:
if (profileRow) setProfileId(profileRow.id);
// with:
if (profileRow) {
  setLocalProfileId(profileRow.id);
  setProfileId(profileRow.id);  // context setter
}
```

```typescript
// In the JSX, replace:
{profileId ? (
  <PhotoUploadGrid profileId={profileId} />
// with:
{localProfileId ? (
  <PhotoUploadGrid profileId={localProfileId} />
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(onboarding)/basics.tsx"
git commit -m "fix: propagate profileId to OnboardingContext after basics upsert"
```

---

### Task 4: Sign-up routes explicitly after users INSERT

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

Currently sign-up inserts the `users` row and then does nothing — it relies on the Supabase SIGNED_IN auth event to trigger routing via the root layout. If that event fires before the INSERT completes, the root layout finds no `users` row and sends the user to sign-in. Fix: after the INSERT succeeds, call `router.replace('/(onboarding)/basics')` directly.

- [ ] **Step 1: Import router and add explicit navigation**

At the top of `app/(auth)/sign-up.tsx`, `router` is not currently imported. Add it:

```typescript
import { Link, router } from 'expo-router';
```

At the end of `handleSignUp`, replace the comment block after the `users` INSERT with:

```typescript
// Explicit navigation — don't rely on auth event firing after INSERT completes.
router.replace('/(onboarding)/basics');
```

The full `handleSignUp` try block after the change looks like:

```typescript
try {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists')) {
      setErrors({
        general: 'an account with that email already exists. sign in instead?',
      });
    } else {
      setErrors({ general: 'something went wrong. try again.' });
    }
    return;
  }

  if (!data.session) {
    setErrors({ general: 'check your email to confirm your account, then sign in.' });
    return;
  }

  const authUser = data.user;
  if (!authUser) {
    setErrors({ general: 'something went wrong. try again.' });
    return;
  }

  const dateOfBirth = formatDateOfBirth(mm, dd, yyyy);

  const { data: userData, error: usersError } = await supabase
    .from('users')
    .insert({
      auth_id: authUser.id,
      email: email.trim().toLowerCase(),
      date_of_birth: dateOfBirth,
    })
    .select('id')
    .single();

  if (usersError || !userData) {
    console.error('users insert failed:', usersError);
    setErrors({ general: 'something went wrong creating your account. please try again.' });
    return;
  }

  router.replace('/(onboarding)/basics');
} catch {
  setErrors({ general: 'something went wrong. try again.' });
} finally {
  setLoading(false);
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/sign-up.tsx"
git commit -m "fix: route explicitly to onboarding after users INSERT in sign-up"
```

---

## Manual Verification

After all tasks complete, test the full flow in the iOS simulator:

1. **Fresh sign-up** — create a new account with a unique email. Confirm: lands on `basics` screen, not sign-in.
2. **Complete all onboarding steps** — basics → disaster-profile → ex-reviews → prompts → prompt-answer → vibe-check. Confirm: no blank screens, no spinner hangs between screens.
3. **Vibe check timer** — confirm the countdown is visible on the vibe-check screen after completing prompt-answer.
4. **Knock to complete** — knock enough times to drain the timer to 0. Confirm: routes to Discover tab.
5. **Returning user** — kill the app and reopen. Confirm: still lands on Discover (not re-running onboarding).
