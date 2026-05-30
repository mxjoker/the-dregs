# Onboarding Flow — Design Spec
_The Dregs · 2026-05-29_

## Context

New users who have completed sign-up land in a 5-step onboarding flow before reaching the main app. Each step writes to Supabase and advances `profiles.onboarding_step`. After step 5 (prompts), users enter the Vibe Check — a 24-hour waiting room that gates entry to the main tabs. The flow is resumable: if the app closes mid-onboarding, the root layout reads `onboarding_step` and routes back to the correct screen.

---

## Navigation Pattern

**Section scroll** — all fields for a step on one scrollable screen. One screen per step, plus sub-screens for prompts and ex reviews. Matches the auth pattern already built.

**Progress indicator** — 5 dots at the top of every onboarding screen. Completed steps are dim (`#3a3a3a`), current step is accent (`#e8e0d0`), future steps are near-invisible (`#1e1e1e`).

**Back navigation** — every step except Basics has a "← back" text link that navigates to the previous screen without losing entered data. Basics has no back (auth is behind it).

---

## Route Structure

```
app/(onboarding)/
  _layout.tsx          ← Stack, headerShown: false, bg #0d0d0d
  basics.tsx           ← step 1
  disaster-profile.tsx ← step 2
  ex-reviews.tsx       ← step 3 (framing + optional entry, internal state)
  prompts.tsx          ← step 4a: pick 3
  prompt-answer.tsx    ← step 4b: answer current prompt (3 passes)
  vibe-check.tsx       ← step 5: waiting room
```

---

## State Management

A React Context provider (`OnboardingContext`) wraps the `(onboarding)` layout and holds:

```typescript
type OnboardingState = {
  // prompts sub-flow
  selectedPromptSlugs: string[];       // populated on prompts.tsx
  currentPromptIndex: number;          // 0, 1, 2 — tracked in prompt-answer.tsx
  // ex reviews sub-flow
  selectedFraming: 'work_history' | 'verified_purchases' | null;
};
```

All other field values are local state within each screen (not shared). Context is only needed for the prompts sub-flow (which prompts were selected) and ex framing (carried from framing screen to entry screen).

---

## Root Layout Update

`app/_layout.tsx` needs to check `onboarding_step` after resolving a session:

```
SIGNED_IN
  → fetch profiles row for this user
  → if no profile row → router.replace('/(onboarding)/basics')
  → if onboarding_step !== 'complete' → router.replace('/(onboarding)/<step>')
  → if onboarding_step === 'complete' && !vibe_check_passed → router.replace('/(onboarding)/vibe-check')
  → if onboarding_step === 'complete' && vibe_check_passed → router.replace('/(tabs)')
```

Step → route mapping:
| `onboarding_step` | Route |
|---|---|
| `not_started` | `/(onboarding)/basics` |
| `basics` | `/(onboarding)/disaster-profile` |
| `disaster_profile` | `/(onboarding)/ex-reviews` |
| `ex_reviews` | `/(onboarding)/prompts` |
| `prompts` | `/(onboarding)/vibe-check` |
| `complete` + not vibe_check_passed | `/(onboarding)/vibe-check` |

---

## Screen Specifications

### Step 1 — Basics (`basics.tsx`)

**Subline:** "let's get the basics"
**Progress:** dot 1 active

**Fields:**
- Display name — TextInput, max 50 chars, required
- Pronouns — horizontal chip selector (multi-select allowed): he/him · she/her · they/them · he/they · she/they · any pronouns · ask me · self describe. Maps to `pronouns_option` enum; if "self describe" selected, show a small free-text input (max 140 chars, maps to `pronouns_text`)
- Gender identity — dropdown/picker from `gender_identity_option` enum; if "self describe" selected, show free-text input (max 140 chars, maps to `gender_identity_text`)

**On submit:**
1. Validate: display_name non-empty
2. Upsert `profiles` row: `{ user_id, display_name, pronouns, pronouns_text?, gender_identity, gender_identity_text?, onboarding_step: 'basics' }`
3. `router.replace('/(onboarding)/disaster-profile')`

**DB types note:** `user_id` comes from `users.id` (our internal UUID), not `auth.uid()`. Must look up `users.id` from session's auth UID.

---

### Step 2 — Disaster Profile (`disaster-profile.tsx`)

**Subline:** "the honest part"
**Progress:** dot 2 active

**Fields:**
- Employment status — dropdown from `employment_status` enum, required
- Looking for — dropdown from `looking_for_option` enum, required
- Relationship structure — dropdown from `relationship_structure` enum, required
- Biggest failure — textarea, max 140 chars, optional. Char counter shown below.

**On submit:**
1. Validate: 3 dropdown fields non-empty
2. Update `profiles`: `{ employment_status, looking_for, relationship_structure, biggest_failure?, onboarding_step: 'disaster_profile' }`
3. `router.replace('/(onboarding)/ex-reviews')`

---

### Step 3 — Ex Reviews (`ex-reviews.tsx`)

Two internal phases managed by local state (no sub-routes):

**Phase A — Framing choice**

**Subline:** "your exes"
**Progress:** dot 3 active

Two tappable cards:
- **Work History** — "résumé style. each ex is a past job. dates, title, reason for leaving."
- **Verified Purchases** — "amazon review style. stars, a title, one sentence. badge reads 'Verified Situationship'."

Selecting a card updates local state and saves `ex_review_framing` to `profiles`. NEXT button advances to Phase B.

**Phase B — Optional first entry**

**Subline:** "add your first ex" (or "add your first review" for Verified Purchases)
**Progress:** dot 3 still active

**Work History fields:**
- Nickname (required if submitting, max 50 chars) — "no real names"
- Job title (max 140 chars)
- Start date / End date — year-only numeric inputs
- Reason for leaving (max 140 chars)

**Verified Purchases fields:**
- Nickname (required if submitting, max 50 chars)
- Star rating — 1–5 tappable stars
- Review title (max 140 chars)
- Review body (max 140 chars)
- Badge — chip selector: "Verified Situationship" | "Verified Chaos"

**Buttons:**
- "ADD & CONTINUE →" — validates nickname + at least one other field, inserts `ex_entries` row, advances
- "skip — add later" — skips insert entirely

**On complete (either path):**
1. Update `profiles`: `{ ex_review_framing, onboarding_step: 'ex_reviews' }`
2. `router.replace('/(onboarding)/prompts')`

---

### Step 4a — Prompts: Pick (`prompts.tsx`)

**Subline:** "choose your confessions"
**Progress:** dot 4 active

Scrollable list of all 12 prompts fetched from `prompts` table. Each row is tappable — selecting toggles it. Counter shows "pick exactly 3 · N selected". NEXT button disabled until exactly 3 are selected. Selected slugs stored in `OnboardingContext.selectedPromptSlugs`.

**12 prompts (from seed data):**
My most impressive failure was… · I peaked when… · You should swipe right if… · My love language is… · I'm a lot to deal with because… · My therapist would describe me as… · The situationship I learned the most from… · I'll know it's going well when… · My red flag I'm most proud of is… · I would be a terrible partner if… · The last thing I quit was… · Two truths and a situationship…

**On submit:** `router.replace('/(onboarding)/prompt-answer')` with `currentPromptIndex: 0`

---

### Step 4b — Prompts: Answer (`prompt-answer.tsx`)

**Subline:** "prompt N of 3" (N = currentPromptIndex + 1)
**Progress:** dot 4 active

Shows the current prompt text as a section title. Textarea below, max 140 chars, char counter. "← change prompts" link navigates back to `prompts.tsx` and clears answers.

**On submit (NEXT PROMPT → / FINISH →):**
1. Validate: answer non-empty
2. Upsert `profile_prompts`: `{ profile_id, prompt_id, answer, display_order: N }`
3. If `currentPromptIndex < 2`: increment index, re-render same screen
4. If `currentPromptIndex === 2` (last answer):
   - Update `profiles`: `{ onboarding_step: 'prompts' }`
   - Set `vibe_check_timer_expiry = now() + 24 hours` on profiles row
   - `router.replace('/(onboarding)/vibe-check')`

Button label: "NEXT PROMPT →" for prompts 1 and 2, "FINISH →" for prompt 3.

---

### Step 5 — Vibe Check (`vibe-check.tsx`)

**Subline:** "vibe check" (centred wordmark)
**Progress bar:** hidden on this screen

**Layout (centred, vertical):**
1. Wordmark "The Dregs" + "vibe check" subline
2. Door graphic — simple rectangle with a knob, tappable
3. Countdown timer — `HH:MM:SS` format, large monospaced text, updates every second via `setInterval`
4. Rotating tap line — italicised, dim, cycles through pool on each knock
5. "knock to pass the time" button (ghost style)
6. Caption: "each knock: −1 second"

**Tap mechanic:**
- Each press of the button (or door): insert row into `vibe_check_knocks`, then call RPC `rpc('decrement_vibe_check_timer', { p_user_id })` which runs:
  ```sql
  UPDATE profiles SET vibe_check_timer_expiry = vibe_check_timer_expiry - interval '1 second'
  WHERE user_id = p_user_id AND vibe_check_timer_expiry > now();
  ```
- Local timer re-syncs from DB every 60 seconds (handles app backgrounding/returning)

**Timer reaches zero:**
- Call `rpc('complete_vibe_check', { p_user_id })`
- `router.replace('/(tabs)')`

**Rotating tap lines (pool of 12):**
```
"still reviewing."
"the committee has noted your knock."
"please maintain dignity while waiting."
"your enthusiasm has been logged."
"the door remains unmoved."
"noted."
"we said we'd let you know."
"each knock shaves one second. worth it?"
"the velvet rope is non-negotiable."
"patience is not a vibe check requirement, but it helps."
"the committee is reviewing your commitment to the committee."
"this is fine."
```

**On app return from background:** re-fetch `vibe_check_timer_expiry` from DB and reset local countdown.

---

## Database Types to Add

Add to `lib/database.types.ts`:
- `profiles` insert type already exists — extend Update type with new fields
- `ex_entries` table (Insert type)
- `profile_prompts` table (Insert type)
- `prompts` table (Row type — read-only)

---

## Supabase RPC Needed

`decrement_vibe_check_timer(p_user_id uuid)` — new SQL function (migration):
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

`complete_vibe_check(p_user_id uuid)` — already exists in initial schema.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/_layout.tsx` | Modify — add onboarding routing logic after SIGNED_IN |
| `app/(onboarding)/_layout.tsx` | Create — Stack, no header, dark bg |
| `app/(onboarding)/basics.tsx` | Create |
| `app/(onboarding)/disaster-profile.tsx` | Create |
| `app/(onboarding)/ex-reviews.tsx` | Create |
| `app/(onboarding)/prompts.tsx` | Create |
| `app/(onboarding)/prompt-answer.tsx` | Create |
| `app/(onboarding)/vibe-check.tsx` | Create |
| `context/OnboardingContext.tsx` | Create — selectedPromptSlugs, currentPromptIndex, selectedFraming |
| `lib/database.types.ts` | Modify — add ex_entries, profile_prompts, prompts rows |
| `supabase/migrations/20260529000002_decrement_vibe_check_timer.sql` | Create |

---

## Out of Scope (this spec)

- Photo uploads (profile photos — separate feature)
- Location permission request
- Push notification permission request
- Daily DP earn actions
- The "knock taps today" daily cap (20/day) — enforced later via edge function
