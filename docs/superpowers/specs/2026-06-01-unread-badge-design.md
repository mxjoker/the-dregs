# Unread Badge — Design Spec
Date: 2026-06-01

## Overview

Add a numeric badge to the matches tab that counts unread activity: new matches the viewer has never opened, plus messages from the other person sent after the viewer's last visit to that chat.

## Database

### Migration

Add two nullable timestamp columns to `matches`:

```sql
ALTER TABLE matches
  ADD COLUMN last_read_at_a timestamptz,
  ADD COLUMN last_read_at_b timestamptz;
```

- `last_read_at_a` tracks when `user_a` last read this match's chat
- `last_read_at_b` tracks when `user_b` last read this match's chat
- `NULL` means the viewer has never opened the chat

### RPC: get_unread_count

New Postgres function `get_unread_count(viewer_profile_id uuid) → integer`.

Logic:
1. For each match involving the viewer, resolve `my_last_read_at` = `last_read_at_a` if viewer is `user_a`, else `last_read_at_b`
2. A match is "unread" if:
   - `my_last_read_at` IS NULL (never opened), OR
   - there exists a message with `sender_id ≠ viewer_profile_id` AND `sent_at > my_last_read_at`
3. Return the count of such matches (each match counted at most once)

Runs with the calling user's RLS context (no SECURITY DEFINER needed).

## Hook: useUnreadCount

`hooks/useUnreadCount.ts` — accepts `profileId: string | null`, returns `{ count: number }`.

Behavior:
1. Calls `get_unread_count(profileId)` on mount to get initial count
2. Subscribes to Supabase realtime on `messages` (INSERT) and `matches` (INSERT)
3. On any realtime event, re-fetches the count
4. Cleans up channel subscription on unmount
5. Returns `count: 0` while profileId is null or loading

## Mark-as-read

In `app/matches/[matchId].tsx`, on component mount (after `matchId` and `profileId` are available), call:

```sql
UPDATE matches
SET last_read_at_a = now()  -- or last_read_at_b depending on which user
WHERE id = matchId
```

Via a Supabase client call. This is a fire-and-forget update — no need to await or show loading state. The realtime subscription in `useUnreadCount` picks up the change and re-fetches.

Helper function `markMatchRead(matchId, profileId)` added to `lib/matches.ts`. The function first checks whether `profileId` is `user_a_id` or `user_b_id` on the match row, then updates the corresponding `last_read_at_a` or `last_read_at_b` column to `now()`.

## Tab Badge UI

In `app/(tabs)/_layout.tsx`:
- Call `useUnreadCount({ profileId })` (profileId already in scope)
- Pass count to the matches tab:

```tsx
<Tabs.Screen
  name="two"
  options={{
    title: 'matches',
    tabBarLabel: 'matches',
    tabBarBadge: count > 0 ? count : undefined,
  }}
/>
```

Passing `undefined` (not `0`) when count is zero ensures the badge disappears entirely.

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260601_add_last_read_at.sql` | Add columns + RPC |
| `lib/matches.ts` | Add `markMatchRead` function |
| `hooks/useUnreadCount.ts` | New hook |
| `app/(tabs)/_layout.tsx` | Wire up hook + tabBarBadge |
| `app/matches/[matchId].tsx` | Call `markMatchRead` on mount |

## Out of Scope

- Per-row unread indicators on the matches list (bold name, dot next to row) — can be added later using the same `last_read_at` data
- Push notification badge count sync — separate feature
