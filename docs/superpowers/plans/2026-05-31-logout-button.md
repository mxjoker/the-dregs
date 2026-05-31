# Logout Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a logout button so users (and developers testing with multiple accounts) can sign out without reinstalling the app.

**Architecture:** `supabase.auth.signOut()` is all that's needed — the root layout (`app/_layout.tsx`) already watches session state and redirects to `/(auth)/sign-in` on `status === 'unauthenticated'`. The button just needs to call signOut; navigation is automatic.

**Tech Stack:** Expo Router, Supabase JS client, React Native `Pressable`

---

## Context

- `app/_layout.tsx` — root layout. Already handles routing on session change. When `useSession()` returns `unauthenticated`, it calls `router.replace('/(auth)/sign-in')`. No changes needed here.
- `app/(tabs)/_layout.tsx` — tab layout. Has a `<Tabs>` with `discover` and `matches` tabs. Currently no header, no settings.
- `app/(tabs)/two.tsx` — the stub matches tab. Currently unused — a good candidate for a temporary logout button until a proper Settings screen exists.
- `supabase` is imported from `@/lib/supabase` throughout the app.
- No logout-related code exists anywhere in the codebase yet.

---

## Placement decision

Put the logout button in the **tab bar header of the matches tab** for now (`app/(tabs)/two.tsx`). This is where Settings will eventually live, so it's the right neighbourhood. It's a developer-facing feature at this stage — no need for a Settings screen yet.

---

## File Map

| Action | Path | Change |
|--------|------|--------|
| Modify | `app/(tabs)/two.tsx` | Add logout button to the matches stub screen |

---

## Task 1: Logout button in matches stub screen

**Files:**
- Modify: `app/(tabs)/two.tsx`

No new tests — this is a one-component change with no logic to unit-test. Verify manually.

- [ ] **Step 1.1 — Read the current file**

```bash
cat app/\(tabs\)/two.tsx
```

Understand the current stub before editing.

- [ ] **Step 1.2 — Replace with logout-capable screen**

Replace the full contents of `app/(tabs)/two.tsx` with:

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function MatchesScreen() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Root layout's useSession listener handles redirect to /(auth)/sign-in
  }

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>no disasters yet. keep swiping.</Text>

      <Pressable
        style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut
          ? <ActivityIndicator size="small" color={Colors.textMuted} />
          : <Text style={styles.signOutText}>sign out</Text>
        }
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  placeholder: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  signOutButtonDisabled: {
    opacity: 0.4,
  },
  signOutText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
```

- [ ] **Step 1.3 — Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 1.4 — Commit**

```bash
git add app/\(tabs\)/two.tsx
git commit -m "feat: add sign out button to matches stub screen"
```

- [ ] **Step 1.5 — Manual smoke test**

1. Run the app: `npx expo start`
2. Sign in as any test account
3. Tap the "matches" tab
4. Tap "sign out"
5. Verify: loading spinner appears briefly, then app redirects to sign-in screen
6. Sign back in — confirm normal flow resumes

---

## Notes for next session

- This is a developer-facing button on the matches stub screen. When the real matches screen is built, pull the sign-out action into a proper Settings or profile screen.
- The `signingOut` state prevents double-taps but is local — if `supabase.auth.signOut()` rejects (network error), the button stays disabled. For a dev tool this is fine; a production settings screen should handle the error and reset `signingOut`.
