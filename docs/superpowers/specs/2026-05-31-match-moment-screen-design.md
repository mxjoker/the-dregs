# Match Moment Screen — Design Spec

**Date:** 2026-05-31  
**Status:** Approved  
**Source:** The_Dregs_Project_Brief_2026-05-28.md § "Match Moment Screen"

---

## Overview

When two users mutually like each other, a `matches` row is created by a DB trigger. The current realtime subscription in `app/(tabs)/index.tsx` detects this INSERT but only `console.log`s the match ID. This spec covers the full match moment experience: data layer, modal UI, animation, and wiring back into the discover screen.

---

## Architecture

### Option chosen: Component + lib, state lifted

- `lib/matches.ts` — data fetching
- `components/discover/MatchMomentModal.tsx` — UI
- `app/(tabs)/index.tsx` — holds `pendingMatch` state, passes to modal

The modal is not a router screen. It renders inline within the discover tab as a transparent `Modal`. This avoids router complexity now while keeping `lib/matches.ts` available for future push-notification deep-linking.

---

## Data Layer — `lib/matches.ts`

### `fetchMatchMomentData(matchId, viewerProfileId)`

**Returns:**
```ts
type MatchMomentData = {
  matchId: string
  otherProfileId: string
  otherName: string
  otherPhotoUrl: string | null
  sharedFlags: Array<{ id: string; label: string }>
}
```

**Steps:**
1. Query `matches` by `matchId` to get `user_a_id` and `user_b_id`; determine `otherProfileId` as whichever is not `viewerProfileId`
2. Fetch `display_name` + primary photo (`profile_photos` ordered by `display_order` asc, limit 1) for `otherProfileId`
3. Fetch red flag IDs+labels for both profiles via `profile_red_flags` joined to `red_flags`
4. Compute intersection client-side by matching `red_flag_id`; return labels from the viewer's join (both sides have the same label, pick either)

**Error handling:** Throw on Supabase errors. Caller (`index.tsx`) logs and swallows — a failed fetch means no modal appears, which is acceptable; the match still exists and will appear in the matches list.

---

## Modal UI — `components/discover/MatchMomentModal.tsx`

### Props
```ts
type Props = {
  visible: boolean
  data: MatchMomentData | null
  onDismiss: () => void
  onSendLine: (line: string) => void
}
```

### Layout (top to bottom)

- **Overlay:** full-screen `rgba(0,0,0,0.85)`. Not tappable-to-dismiss — user must choose a CTA.
- **Card** (centered, ~90% screen width):
  - `"disaster solidarity"` — small, muted, all-lowercase letter-spaced badge
  - **Two avatar circles** side-by-side, slight overlap (~8px). Viewer left, match right. Show primary photo if available; show initials on a solid background if not.
  - `"You matched with [Name]"` — heading
  - `"You both swiped right on each other's chaos. Congrats, probably."` — subtext
  - **Shared flags chips** — horizontal wrap row, only rendered if `sharedFlags.length > 0`. No empty-state label; section is simply omitted.
  - **Opening lines ScrollView** — 14 tappable lines (see list below). Tapping one selects it (highlighted state). Only one can be selected at a time.
  - **`"send a disaster opening line"`** — primary button. Enabled only when a line is selected. Fires `onSendLine(selectedLine)`.
  - **`"keep swiping"`** — text link below button. Fires `onDismiss()`.

### Suggested opening lines (from brief, in order)
1. "so what's your damage"
2. "i saw your red flags and thought: relatable"
3. "we matched. i'm choosing not to read into that"
4. "your chaos score is impressive. i mean that sincerely"
5. "i liked your flag about [shared red flag]. mine too, apparently" *(only shown if `sharedFlags.length > 0`; `[shared red flag]` replaced with first shared flag label)*
6. "honest question: are you okay"
7. "i have no opener. this is the opener"
8. "your biggest failure sounded familiar"
9. "i'm not going to ghost you. probably"
10. "we have [X] red flags in common. that's either a green flag or a warning" *(only shown if `sharedFlags.length > 0`; `[X]` replaced with count)*
11. "hi. i also have no curtains"
12. "your ex section gave me feelings i need to unpack"
13. "i swiped right on your chaos specifically"
14. "let's ruin this slowly"

Lines 5 and 10 are conditional on shared flags existing; omit them entirely if `sharedFlags` is empty.

---

## Animation

- **Entrance:** `Animated.spring` scale `0.7 → 1.0` with `useNativeDriver: true`, bounciness ~8. Fires when `visible` becomes true.
- **Avatar pulse:** `Animated.loop` running `Animated.sequence([scale 1.0→1.04, scale 1.04→1.0])` on a 2.5s cycle. Starts after entrance spring settles (~400ms delay).
- **Dismissal:** 150ms `Animated.timing` opacity `1.0 → 0`, then calls `onDismiss`. Prevents jarring cut.
- Modal uses `animationType="none"` (animation driven by Animated API, not the native modal transition).

---

## index.tsx Wiring

### New state
```ts
const [pendingMatch, setPendingMatch] = useState<MatchMomentData | null>(null)
const matchQueueRef = useRef<MatchMomentData[]>([])
```

### Realtime handler (replaces `console.log`)
```ts
fetchMatchMomentData(match.id, viewerProfileIdRef.current!)
  .then(data => {
    if (pendingMatchRef.current) {
      matchQueueRef.current.push(data)
    } else {
      setPendingMatch(data)
    }
  })
  .catch(err => console.error('fetchMatchMomentData error:', err))
```

`pendingMatchRef` is a ref kept in sync with `pendingMatch` state (standard pattern to read current state inside an async callback).

### On dismiss
```ts
function handleMatchDismiss() {
  setPendingMatch(null)
  if (matchQueueRef.current.length > 0) {
    // small delay so the exit animation completes before the next modal enters
    setTimeout(() => setPendingMatch(matchQueueRef.current.shift()!), 200)
  }
}
```

### JSX (before closing View)
```tsx
<MatchMomentModal
  visible={pendingMatch !== null}
  data={pendingMatch}
  onDismiss={handleMatchDismiss}
  onSendLine={() => {
    handleMatchDismiss()
    router.push('/(tabs)/matches')
  }}
/>
```

---

## RLS Notes

`profile_red_flags` joined to `red_flags` is already readable for all visible profiles — confirmed working in `fetchProfiles` (discover flow). No new RLS policies required.

The `matches` table will need a SELECT policy allowing users to read matches where they are `user_a_id` or `user_b_id`. This should be added in the same migration as the feature, or manually (document in `db_quirks.md`).

---

## Out of Scope

- Chat screen / actual message sending — `onSendLine` navigates to `/(tabs)/matches`; the selected opening line is not yet pre-loaded into chat input (deferred to chat screen spec)
- Push notification deep-linking to this screen
- "Auto-match token" IAP flow (separate spec)
