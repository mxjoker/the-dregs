# Onboarding Flow — Design Spec
**Date:** 2026-05-31

## Problem

New users who sign up via the real sign-up screen cannot complete onboarding. Three concrete bugs block them:

1. **Sign-up race condition** — after `supabase.auth.signUp()` succeeds and the `users` INSERT runs, the app relies on the SIGNED_IN auth event to trigger routing. If the event fires before the INSERT completes, the root layout finds no `users` row and sends the user back to sign-in instead of onboarding.

2. **Onboarding layout deadlock** — `app/(onboarding)/_layout.tsx` waits for both `userId` AND `profileId` to be non-null before mounting children. New users have no `profiles` row yet (it's created by `basics.tsx`). The layout renders a blank screen forever, so `basics` never runs.

3. **Vibe check timer never initialized** — `vibe_check_timer_expiry` is set manually for seeded profiles. There's no trigger or client-side code that sets it when a real user completes onboarding. The vibe check screen polls this field and spins forever when it's null.

---

## Approach

Four targeted fixes. No new screens.

---

## Fix 1 — Sign-up explicit routing

**File:** `app/(auth)/sign-up.tsx`

After the `users` INSERT succeeds in `handleSignUp`, call `router.replace('/(onboarding)/basics')` explicitly. Remove reliance on the auth state change event for routing new signups.

The auth event (`useSession` → root layout) still handles routing for returning users on app launch. New signups bypass it by routing directly after INSERT.

---

## Fix 2 — Onboarding layout tolerates missing profile

**File:** `app/(onboarding)/_layout.tsx`

Change the guard: render children once `userId` is non-null. `profileId` may be null for new users — that's fine. Pass `null` for `profileId` to `OnboardingProvider` when no profile exists yet.

The blank-screen fallback (`if (!userId || !profileId) return <View .../>`) becomes `if (!userId) return <View .../>`.

---

## Fix 3 — OnboardingContext profileId is nullable; basics updates it

**Files:** `context/OnboardingContext.tsx`, `app/(onboarding)/basics.tsx`

- `profileId` type changes from `string` to `string | null` in context value and provider props.
- Add `setProfileId: (id: string) => void` to context so screens can update it.
- In `basics.tsx`, after the upsert completes and the profile row is fetched, call `setProfileId(profileRow.id)` to propagate it to context.

`PhotoUploadGrid` in `basics.tsx` already uses local state for `profileId` — that stays as-is. The context update is for downstream screens that need it.

---

## Fix 4 — Vibe check timer DB trigger

**New migration:** `20260531000002_vibe_check_timer_trigger.sql`

A `BEFORE UPDATE` trigger on `profiles`. When `onboarding_step` transitions to `'complete'` and `vibe_check_timer_expiry` is currently null, set:

```sql
vibe_check_timer_expiry = now() + interval '24 hours'
```

This fires automatically when the `prompts` screen writes `onboarding_step: 'complete'`. No client-side timing logic needed. Idempotent — only sets the timer if it isn't already set.

---

## What this does NOT change

- The vibe check screen UI (`app/(onboarding)/vibe-check.tsx`) — already built correctly.
- The prompts/ex-reviews/disaster-profile screens — already write their `onboarding_step` values correctly.
- The root layout routing logic — still handles returning users on app launch.
- Sign-up screen fields (email, password, DOB) — no changes.

---

## Success criteria

A fresh account created via the sign-up screen can:
1. Sign up → land directly on `basics` without hitting sign-in
2. Complete all onboarding steps without blank screens or hangs
3. Reach the vibe check with a live countdown timer
4. Pass the vibe check (via knocks or waiting) and land on the Discover tab
