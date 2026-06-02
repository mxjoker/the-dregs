# Door Mechanic — Design Spec
Date: 2026-06-01

## Overview

When a match expires, the conversation "closes the door." Either user can reopen it by tapping a large tap target (200–800 taps, weighted 300–500). The other person can skip the remaining taps by answering early with one of 10 locked reasons. When the door opens, both users return to the chat screen.

## Scope

- Two new Supabase Edge Functions: `record-door-knock`, `answer-door-early`
- Matches list updated to show expired matches with door state
- New knock screen for the tapping interaction
- New answer-early bottom sheet for the non-knocking participant
- No new DB migrations — all columns exist in the initial schema

## Edge Functions

### record-door-knock

**Trigger:** HTTP POST, JWT required  
**Input:** `{ match_id: string, tap_count: number }`

Logic:
1. Resolve caller's profile ID from JWT
2. Verify caller is `user_a_id` or `user_b_id` on the match → 403 if not
3. Verify `match.status = 'expired'` OR `door_status = 'knocking'` → 400 otherwise
4. Verify `door_status ≠ 'open'` → 400 if already open
5. If first knock (`door_status = 'closed'`): set `door_status = 'knocking'`, `door_knocked_by = caller_profile_id`; send push to the other participant: *"[Name] is at the door."*
6. Increment `door_knock_count` by `tap_count`
7. If `door_knock_count >= door_knock_target`: set `door_status = 'open'`, `door_opened_at = now()`, `match.status = 'door_open'`; send push to both: *"the door's open. one of you knocked long enough."*
8. Award DP: `min(tap_count, 20 - knock_taps_today)` — daily cap shared with vibe check knocks. Push notifications for DP deferred to push notifications feature.
9. Returns `{ door_status, knock_count, knock_target, dp_awarded }`

**Error responses:**
- User not in match → 403
- Match not expired and door not knocking → 400 `"match not eligible for knocking"`
- Door already open → 400 `"door already open"`

Push notifications fail gracefully if no Expo token exists — door still opens.

### answer-door-early

**Trigger:** HTTP POST, JWT required  
**Input:** `{ match_id: string, reason: string }`

Logic:
1. Resolve caller's profile ID from JWT
2. Verify caller is NOT `door_knocked_by` (must be the non-knocking participant) → 403
3. Verify `door_status = 'knocking'` → 400
4. Validate `reason` is one of the 10 locked strings (exact match) → 400 if invalid
5. Set `door_status = 'open'`, `door_opened_at = now()`, `door_early_answer_reason = reason`, `match.status = 'door_open'`
6. Send push to knocker: *"[Name] answered the door. apparently they were [reason]."*
7. Insert system message into `messages`: `{ message_type: 'system', system_payload: { type: 'door_answered', reason } }`
8. Returns `{ door_open: true }`

**Error responses:**
- Caller is the knocker → 403 `"you cannot answer your own door"`
- Door not in knocking state → 400 `"door is not being knocked"`
- Invalid reason → 400 `"invalid reason"`

**The 10 locked reasons (exact strings):**
1. `"I was in my flop era"`
2. `"I needed time to spiral privately"`
3. `"I forgot this app existed (not a metaphor)"`
4. `"I was collecting myself. still working on it"`
5. `"ghost mode. no reason. classic me"`
6. `"I was going to text first. I wasn't"`
7. `"phone died. emotionally"`
8. `"I thought you'd come back. you did"`
9. `"life admin. all of it fake"`
10. `"I was fine. I wasn't"`

## lib/matches.ts

### Extended MatchListItem type

```ts
export type MatchListItem = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  matchedAt: string;
  matchStatus: string;        // 'active' | 'expired' | 'door_open' | 'unmatched'
  doorStatus: string;         // 'closed' | 'knocking' | 'open'
  doorKnockedBy: string | null; // profile ID of knocker
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};
```

### fetchMatches update

Extended to include expired and door_open matches. The query adds `status`, `door_status`, `door_knocked_by` from `matches_with_context` (or falls back to direct `matches` query if the view doesn't expose these). Sorting: active/door_open first by `last_message_at`, then knocking, then expired/closed — all descending by `matched_at` within group.

### New helper functions

```ts
// Calls record-door-knock edge function
export async function recordDoorKnock(matchId: string, tapCount: number): Promise<{
  doorStatus: string;
  knockCount: number;
  knockTarget: number;
  dpAwarded: number;
}>

// Calls answer-door-early edge function
export async function answerDoorEarly(matchId: string, reason: string): Promise<{
  doorOpen: boolean;
}>
```

Both use `supabase.functions.invoke(...)`.

## Matches List (app/(tabs)/two.tsx)

### Row subtitle logic for door states

| Condition | Subtitle | Extra UI |
|-----------|----------|----------|
| `matchStatus='expired'`, `doorStatus='closed'` | *"expired · tap to knock"* (dim) | none |
| `doorStatus='knocking'`, viewer is knocker | *"you're knocking… {n}/{target}"* | none |
| `doorStatus='knocking'`, viewer is non-knocker | *"[Name] is at the door"* | "answer" button |
| `matchStatus='door_open'` | normal last-message subtitle | none |

### Navigation

- Expired/closed rows → `router.push('/matches/knock', { matchId })`
- Knocking rows (viewer is knocker) → `router.push('/matches/knock', { matchId })`
- Knocking rows (viewer is non-knocker) → opens `AnswerDoorSheet`
- Door_open rows → `router.push('/matches/[matchId]', { matchId })` (chat, as before)

`AnswerDoorSheet` is rendered at the bottom of `MatchesScreen` (same pattern as `ButWhySheet` in the discover screen).

## Knock Screen (app/matches/knock.tsx)

Stack-navigated under `app/matches/`. Params: `{ matchId: string }`.

### Layout

- `Stack.Screen` title: `"[Name]'s door"`
- Large full-screen `Pressable` tap area
- Progress display: `{knock_count} / {knock_target}` + thin progress bar
- Rotating copy line (from brief's knock copy pool, cycles on each batch flush)
- Dim "give up" text link at bottom (navigates back)

### Tap batching

```
pendingTaps (local ref, not state — no re-render per tap)
displayedCount (state — updates on flush)

onPress:
  pendingTaps++
  show local optimistic count (pendingTaps + lastFlushedCount)
  debounce timer reset (1500ms)

flush():
  if pendingTaps === 0: return
  batch = pendingTaps
  pendingTaps = 0
  result = await recordDoorKnock(matchId, batch)
  lastFlushedCount = result.knockCount
  setDisplayedCount(result.knockCount)
  if result.doorStatus === 'open': navigate to chat
```

Flush also triggers when `pendingTaps >= 50`. On flush error, `pendingTaps += batch` (re-queues, not lost).

### Copy pool (rotating on each flush)

All lines from the brief's knock copy pool, cycled in order (index % pool.length). Use the full multi-personality pool from `The_Dregs_Algorithm_2026-05-28.md` lines 613–625 — sarcastic, enthusiastic, unbothered, therapy-speak, chronically online, conspiracy theorist variants. A representative subset to hardcode in the client:

```ts
const KNOCK_COPY = [
  "you knock. perhaps they will answer. perhaps not.",
  "tapping on a closed door. classic you.",
  "knocking on a door that expired. respect the commitment.",
  "one is knocking. how terribly optimistic.",
  "you're knocking. okay.",
  "KEEP GOING. they might answer. they MIGHT.",
  "you're knocking on an expired match. no notes. carry on.",
  "you're knocking. what does that mean to you?",
  "bro said 'I'm not a quitter' and started tapping.",
  "keep knocking. they can hear you. they're deciding.",
];
```

## Answer-Early Sheet (components/AnswerDoorSheet.tsx)

Bottom sheet following the same pattern as `ButWhySheet`. Props:
```ts
{ matchId: string; visible: boolean; onClose: () => void; onOpened: () => void }
```

Renders the 10 reasons as a scrollable list. Tapping a reason:
1. Shows loading state on that row
2. Calls `answerDoorEarly(matchId, reason)`
3. On success: calls `onOpened()` → parent navigates to chat and dismisses sheet
4. On error: shows brief error text, re-enables list

## Files

| File | Action |
|------|--------|
| `supabase/functions/record-door-knock/index.ts` | Create |
| `supabase/functions/answer-door-early/index.ts` | Create |
| `lib/matches.ts` | Modify — extend type, extend fetch, add helpers |
| `app/(tabs)/two.tsx` | Modify — door state rows, answer sheet |
| `app/matches/knock.tsx` | Create |
| `components/AnswerDoorSheet.tsx` | Create |

## Out of Scope

- DP ledger / balance display — award is calculated but not shown
- Push notifications — edge functions attempt push but fail gracefully; full push feature is next
- `matches_with_context` view changes — if the view doesn't expose `door_status` etc., the fetch falls back to a direct `matches` query
