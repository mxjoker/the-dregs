# The Dregs — Discover Screen + Photo Upload Design Spec
# Generated: 2026-05-30

## Scope

This spec covers:
- Discover tab (card stack swipe screen)
- Full profile view (tap card → scrollable)
- "But Why" tag screen (fires after ♥ Like)
- Second Thoughts (discard pile)
- Filters bottom sheet
- Photo upload UI (added to onboarding Step 1 — Basics)
- Stack assembly (calls `assemble_stack` Edge Function)

Out of scope (separate specs):
- Matches list, match moment screen, chat
- My Profile tab
- Red flags selection UI
- Desperation Boost IAP

---

## Locked Decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Card layout | Photo-dominant (55%), info strip below (45%) |
| Chaos score on card | Bold gradient number + bar |
| Red flags on card | Max 3 shown, muted "+N more" chip for overflow |
| Action buttons | Filled circles: dark pass, dark-green ick, pink-red like |
| Photo upload location | Onboarding Step 1 (Basics) |
| Photo on card | Single (primary) photo only |
| Prompt on card | First answered prompt |
| Gesture library | `react-native-gesture-handler` + `react-native-reanimated` |
| Swipe interaction | Drag-to-swipe + button shortcuts |

---

## Screen Structure

The Discover screen has three fixed vertical zones — no ScrollView.

```
┌─────────────────────────┐
│  top bar                │  "second thoughts" ghost (left) · filter icon (right)
├─────────────────────────┤
│                         │
│      card stack         │  fills remaining space, cards centred
│                         │
├─────────────────────────┤
│  action buttons         │  ✕ · 🤢 · ♥  — fixed ~80pt height
└─────────────────────────┘
```

**Top bar:**
- Left: "second thoughts" — small ghost text button, lowercase. Hidden if discard pile is empty.
- Right: filter icon. Tapping opens a bottom sheet with the three permitted filters.
- No screen title — the card is the screen.

**Card stack:**
- 3 cards rendered simultaneously. Top card is full size. 2nd card is scaled to 0.95 and slightly offset upward. 3rd card is scaled to 0.92.
- All 3 are absolutely positioned and layered by z-index.
- Stack refills from server when ≤ 5 cards remain in local queue (background fetch, silent).

**Action buttons:**
- Centred row. ✕ Pass (56pt circle, dark fill) · 🤢 Ick (44pt circle, dark-green fill) · ♥ Like (56pt circle, pink-red fill with glow).
- Tapping a button fires the same animation as the corresponding swipe direction.
- Text labels below each button: "pass" · "ick" · "like" (9pt, muted).

---

## Swipe Card Component

**Dimensions:** Full screen width minus 24pt horizontal padding. Height: ~72% of screen height. Border radius: 20pt. Background: #111.

**Layout:**

### Photo zone (top 55%)
- Single `Image` — the user's primary photo (first in their photos array).
- No photo uploaded: dark placeholder with empty state copy "no photos. bold strategy."
- Bottom of photo zone: gradient scrim (transparent → rgba(0,0,0,0.85)) overlaid with:
  - Name + `"age"` in 20pt bold (e.g. `Jamie, "29"`)
  - Distance in 12pt muted text below

### Info strip (bottom 45%)
Background: #111. Padding: 12pt horizontal, 10pt top, 12pt bottom.

**Row 1 — Chaos score:**
- Left side: label "chaos score" (8pt, uppercase, muted, letter-spacing 0.5pt) stacked above the bar.
- Bar: full remaining width, 4pt tall, rounded, gradient #ff0050 → #ff8800. Fill % = chaos score / 100.
- Right side: chaos score number (28pt, font-weight 900, same gradient via `-webkit-background-clip: text` equivalent in RN via `MaskedView` or `expo-linear-gradient` on text).

**Row 2 — Red flag tags:**
- Up to 3 tags shown, wrapping. Sorted by most-Ick'd first.
- Tag style: dark red background (#1a0a12), border 1px rgba(255,0,80,0.2), text color #ff7099, border-radius 10pt, 🚩 prefix, 10pt text.
- Overflow: muted "+N more" chip (dark background, white 30% opacity text). Tapping chip opens full profile.
- Row hidden entirely if user has no flags.

**Row 3 — Prompt:**
- Label: prompt question text (9pt, uppercase, muted, letter-spacing 0.4pt).
- Answer: 13pt, 90% opacity, max 2 lines, truncated with ellipsis. Shows first answered prompt.
- Row hidden entirely if no prompts answered.

**Row 4 — Pet widget:**
- Dark-navy pill (#1a1a2e), border-radius 8pt. Pet emoji + one-liner in 10pt italic, 65% opacity.
- Hidden entirely if user has no active pet.

---

## Card Interactions

### Drag gesture
- `PanGestureHandler` on the top card only.
- `translateX`, `translateY`, `rotate` driven by shared animated values (UI thread worklets).
- Rotation formula: `rotate = (translateX / screenWidth) * 15deg`.
- 2nd card: `scale` interpolates 0.95 → 1.0 as top card's `translateX` increases toward threshold.

### Swipe threshold
- Commit threshold: 120pt horizontal offset OR flick velocity > 800 pt/s (whichever is met first).
- Below threshold: spring snap back to origin (stiffness 300, damping 30).
- On commit: card animates off-screen in 400ms (spring), then unmounts. Next card becomes top.
- Ick direction: card slides down and off in 300ms.

### Overlay indicators
- Right drag > 60pt: ♥ label fades in at top-left of card (green tint).
- Left drag > 60pt: ✕ label fades in at top-right of card (grey).
- Down drag > 60pt: 🤢 fades in at centre of card.

### Targeted Ick (long-press a flag)
- Long-pressing a flag tag (500ms): tag gets a highlight ring (border brightens to full #ff0050, scale 1.05).
- Next tap of 🤢 button fires targeted Ick on that specific flag. Server writes `targeted_flag_id` to the swipe row.
- Tapping anywhere else on the card (not 🤢): cancels selection, ring clears.
- Targeted Ick: recipient gets a push notification naming the specific flag. No identity revealed.

### Tap to open full profile
- Tap anywhere on card (not on a flag tag, not a drag gesture): navigates to full profile view.

---

## "But Why" Screen

Fires immediately after tapping ♥ Like (from card or from full profile). Modal bottom sheet, not a navigation push.

**Header:** "but why tho" (lowercase, 22pt, bold)

**Content:** 12 tags in a wrapping grid (from brief):
- pretty enough to ignore the red flags
- i'm swiping on everybody
- somebody has to
- i'm a bot
- the chaos score did it for me
- i relate to this on a personal level
- the pet sold me
- i've made worse decisions
- my therapist would not approve
- felt cute, might unmatch
- i'm the red flag here
- unironically into this

**Tag style:** outlined pill, tappable. Tap selects, second tap deselects.

**Footer:** "skip (coward)" — small muted text button.

**Behaviour:**
- Tap a tag → sheet dismisses, selection sent to server async (non-blocking).
- Tap "skip (coward)" → sheet dismisses, no tag sent.
- Auto-dismiss after 8 seconds (treated as skip).
- Tags are anonymous. Aggregate shown to recipient on their own profile only.

---

## Full Profile View

Navigation push from Discover. Back swipe = return to stack.

### Layout
Single `ScrollView`. Sticky footer with action buttons at bottom — user must scroll to reach them.

**Top-right 3-dot menu:** always visible. Options: Report / Block / Save for later. (2-tap Apple requirement satisfied.)

### Section order

1. **Photo gallery** — full-width swipeable `FlatList`, same height as card photo zone. Counter pill top-right (e.g. `2 / 5`).
2. **Identity row** — name, `"age"`, distance · looking for · relationship structure · pronouns. Small muted pills.
3. **Pet widget** (if active) — pet emoji + one-liner.
4. **Chaos score** — full bar + bold number + employment status label below.
5. **Red flags** — all flags, sorted by most-Ick'd. Each long-pressable for targeted Ick.
6. **Prompt answers** — all 3, each with prompt label above and answer below.
7. **My biggest failure** — free text. Hidden if empty.
8. **Ex entries** — Work History or Verified Purchases framing. Hidden entirely if no entries.
9. **Sticky footer** — ✕ Pass · 🤢 Ick · ♥ Like (same filled-circle buttons). Always visible.

### Targeted Ick in full profile
Same mechanic as on card: long-press flag → highlight ring → tap 🤢 in sticky footer → targeted Ick. Tap elsewhere → cancel.

---

## Second Thoughts (Discard Pile)

Accessed via "second thoughts" ghost button in Discover top bar. Navigation push.

**Header:** "second thoughts" (lowercase)

**List:** Previously passed profiles in chronological order, most recent first. Each row:
- Compact card: photo thumbnail (48pt square, rounded), name + `"age"`, chaos score pill, top flag.
- Tapping a row: opens full profile view (same component as Discover's full profile).

**Actions from full profile inside Second Thoughts:** pass again (removes from pile), ick, or like. Like fires "But Why" sheet identically.

**Empty state:** *"nothing here. you either like everyone or you're lying to yourself."*

---

## Filters Bottom Sheet

Opened via filter icon in Discover top bar.

**Controls (per brief — nothing else):**
- Distance slider: 1–100 km.
- `"Age"` range: dual-handle slider, 18–99. Label always shows `"Age"` in quotes.
- Relationship structure: multi-select toggle buttons. Off by default.

**Persistence:** saved to `AsyncStorage` locally + synced to user's profile row on change. Stack refetches immediately on filter change.

---

## Photo Upload (Onboarding Step 1 — Basics)

Added to existing `app/(onboarding)/basics.tsx`.

**Grid layout:**
- 6 slots. Slot 1 (primary) spans the full top row (full width). Slots 2–4 fill a 3-column row below it. Slots 5–6 fill the left two cells of a final 3-column row (rightmost cell empty).
- All slots are rounded squares (16pt radius), dark placeholder background when empty. `display_order` in DB maps directly to slot number 1–6.

**Adding a photo:**
- Tap empty slot → `expo-image-picker` system picker → crop to square → upload to Supabase Storage bucket `profile-photos` → thumbnail shown in slot.
- Upload in progress: slot shows spinner overlay.
- Upload failure: slot shows error state with retry icon. Copy: "that photo didn't make it. try again or embrace the mystery."

**Managing photos:**
- Tap filled slot → options sheet: "replace" / "remove".
- Drag-to-reorder: long-press to lift a slot, drag to reposition. Slot 1 is always the primary photo shown on the swipe card.

**No photos state:**
- All slots empty: nudge label below the grid: "no photos. bold strategy."
- At least 1 photo is not required to proceed in onboarding (optional per brief). Chaos Score formula already accounts for it (+3 for 1 photo).

---

## Stack Assembly

**On mount:** Discover screen calls `assemble_stack` Edge Function with viewer's profile ID + current filter params. Response: ordered array of profile IDs.

**Pagination:** Profiles fetched in batches of 10. When ≤ 5 remain in local queue, background-fetch next 10 silently.

**Swipe recording:** Pass / Like / Ick are written to the `swipes` table immediately via direct Supabase client insert. Not routed through the edge function. Fields: `swiper_id`, `swiped_id`, `action` (pass/like/ick), `targeted_flag_id` (nullable, for targeted Ick), `but_why_tag` (nullable).

**Match detection:** Server-side via Supabase Realtime subscription on the `matches` table. When a mutual like creates a match row, the client receives the event and navigates to the match moment screen (separate spec).

**Empty states:**
- Stack exhausted: *"you've seen everyone. they've seen you. ball's in someone's court."*
- No users in area: *"no disasters in your area yet. either you're early or everyone nearby has their life together. concerning either way."*
- Loading (first fetch): skeleton card placeholder.

---

## File Structure

```
app/
  (tabs)/
    index.tsx                    ← Discover screen (replaces placeholder)
  discover/
    full-profile.tsx             ← Full profile view
    second-thoughts.tsx          ← Discard pile screen
  (onboarding)/
    basics.tsx                   ← Add photo upload grid here

components/
  discover/
    SwipeCard.tsx                ← Card component (photo + info strip)
    CardStack.tsx                ← Stack of 3 cards, gesture orchestration
    ActionButtons.tsx            ← ✕ · 🤢 · ♥ button row
    ButWhySheet.tsx              ← "But why tho" bottom sheet
    FiltersSheet.tsx             ← Filters bottom sheet
    OverlayIndicator.tsx         ← ♥ / ✕ / 🤢 drag feedback labels
    FullProfileView.tsx          ← Scrollable full profile content
    SecondThoughtsList.tsx       ← Discard pile list
  onboarding/
    PhotoUploadGrid.tsx          ← 6-slot photo grid (new)

lib/
  discover.ts                    ← assembleStack(), recordSwipe(), fetchProfiles()
```

---

## Key Constraints (from CLAUDE.md + brief)

- `"Age"` always in quotes in all user-facing copy and labels.
- All bio/prompt text fields capped at 140 characters (enforced in DB; display truncates with ellipsis on card).
- Report/Block reachable in 2 taps or fewer on every profile (3-dot menu, always visible).
- No humor targeting protected characteristics.
- Safety copy (report, block) uses plain language — no jokes.
- Free tier: 20 swipes/day. Unlimited swipes with paid tier (separate spec handles the gate).
