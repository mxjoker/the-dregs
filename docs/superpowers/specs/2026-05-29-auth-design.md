# Auth — Design Spec
_The Dregs · 2026-05-29_

## Context

The app requires email/password auth with an 18+ age gate enforced at both the client and database level. Auth is the entry point to a 5-step onboarding flow; without it nothing else is reachable. Supabase handles sessions and token refresh; we own the UI and the `users` table insert.

---

## Screens

### Sign In (`app/(auth)/sign-in.tsx`)

**Copy**
- Wordmark: "The Dregs"
- Subline: "welcome back, probably"
- Button: "SIGN IN"
- Footer link: "don't have an account? create one"

**Fields**
- Email (email keyboard, autocapitalize off)
- Password (secureTextEntry)

**Behaviour**
- `supabase.auth.signInWithPassword({ email, password })`
- Inline field-level error on failure (e.g. "wrong email or password" below password field)
- On success: root layout detects session change and routes automatically — no manual `router.push` needed

---

### Sign Up (`app/(auth)/sign-up.tsx`)

**Copy**
- Wordmark: "The Dregs"
- Subline: "create account"
- DOB label: `Your "Age"`
- DOB hint: `date of birth — MM / DD / YYYY`
- DOB note (below field): "must be 18 or older. we check."
- Button: "CREATE ACCOUNT"
- Footer link: "already a dreg? sign in"

**Fields**
- Email (email keyboard, autocapitalize off)
- Password (secureTextEntry, min 8 chars)
- Date of birth — three numeric inputs: MM · DD · YYYY, auto-advancing focus

**Validation (client-side, before any network call)**
1. Email: non-empty, basic format check
2. Password: ≥ 8 characters
3. DOB: valid calendar date, user must be ≥ 18 years old as of today

**Sign-up sequence**
1. `supabase.auth.signUp({ email, password })`
2. On success (session returned — email confirmation disabled on this project):
   - Insert into `users`: `{ auth_id: user.id, email, date_of_birth }`
   - Insert into `desperation_points_balance`: `{ user_id, balance: 0 }`
   - Insert into `chaos_coins_balance`: `{ user_id, balance: 0 }`
3. Root layout detects `SIGNED_IN` event, routes to onboarding

**Error handling**
- Supabase `User already registered` → "an account with that email already exists. sign in instead?"
- Any other error → generic "something went wrong. try again." below the button
- DB insert failure → log error, don't crash; user can still proceed (balance rows have defaults)

---

## Navigation & Session Routing

### Route groups
```
app/
  _layout.tsx          ← session guard lives here
  (auth)/
    _layout.tsx        ← Stack, headerShown: false
    sign-in.tsx
    sign-up.tsx
  (tabs)/              ← existing scaffold (guarded)
```

### Root layout logic (`app/_layout.tsx`)
1. On mount: `supabase.auth.getSession()`
2. Subscribe: `supabase.auth.onAuthStateChange`
3. `SIGNED_OUT` / no session → `router.replace('/(auth)/sign-in')`
4. `SIGNED_IN` → query `profiles.onboarding_step` for this user
   - Step is not `complete` or profile doesn't exist yet → `router.replace('/(onboarding)')` _(stub for now — routes to tabs until onboarding is built)_
   - Step is `complete` and `vibe_check_passed = true` → `router.replace('/(tabs)')`
5. Show a blank `#0d0d0d` screen while session resolves (no flash of wrong route)

---

## Visual Design

**Palette (Dark & Deadpan)**
| Token | Value |
|---|---|
| `bg` | `#0d0d0d` |
| `surface` | `#1a1a1a` |
| `border` | `#2e2e2e` |
| `text-primary` | `#ffffff` |
| `text-secondary` | `#999999` |
| `text-muted` | `#555555` |
| `accent` | `#e8e0d0` |
| `accent-fg` | `#0d0d0d` |
| `error` | `#ff6b6b` |

**Typography:** system default (-apple-system / San Francisco on iOS)

**Layout**
- Full-height `KeyboardAvoidingView` (`behavior="padding"` on iOS) so form lifts on keyboard
- `ScrollView` inside to handle small screens
- Safe area insets respected via `useSafeAreaInsets`

**Inputs**
- Background `surface`, border `border`, border-radius 6, padding 12×14
- Label row above each field (small caps, `text-muted`)
- Error text below field in `error` colour, 11px

**Button**
- Background `accent`, text `accent-fg`, font-weight 700, letter-spacing 1.5, all-caps
- `ActivityIndicator` in `accent-fg` replaces text while loading
- Disabled + 0.5 opacity while loading

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/_layout.tsx` | Update with session guard + routing logic |
| `app/(auth)/_layout.tsx` | Create — Stack, no header, bg `#0d0d0d` |
| `app/(auth)/sign-in.tsx` | Create |
| `app/(auth)/sign-up.tsx` | Create |
| `constants/Colors.ts` | Extend with Dregs palette tokens |
| `lib/supabase.ts` | Already exists — no changes needed |

---

## Out of Scope (this spec)

- Forgot password
- Social / OAuth sign-in
- Email confirmation deep-link handling
- Onboarding screens (separate spec)
