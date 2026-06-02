# Unread Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a numeric badge on the matches tab counting unread messages and unopened matches, cleared when the user opens each chat.

**Architecture:** A DB migration adds `last_read_at_a/b` columns to `matches` and a `get_unread_count` RPC. A `useUnreadCount` hook subscribes to realtime events and calls the RPC. The tab layout passes the count to `tabBarBadge`. The chat screen calls `markMatchRead` on mount to clear the badge for that match.

**Tech Stack:** React Native, Expo Router, Supabase (Postgres RPC, Realtime), TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260601000001_add_last_read_at.sql` | Create | DB columns + RPC |
| `lib/matches.ts` | Modify | Add `markMatchRead` |
| `hooks/useUnreadCount.ts` | Create | Unread count hook with realtime |
| `app/(tabs)/_layout.tsx` | Modify | Wire hook + tabBarBadge |
| `app/matches/[matchId].tsx` | Modify | Call markMatchRead on mount |

---

### Task 1: DB migration — columns + RPC

**Files:**
- Create: `supabase/migrations/20260601000001_add_last_read_at.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260601000001_add_last_read_at.sql

-- Add last-read timestamps to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS last_read_at_a timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_at_b timestamptz;

-- RPC: returns count of matches with unread activity for the viewer
-- A match is unread if:
--   (a) the viewer has never opened it (their last_read_at IS NULL), OR
--   (b) there is a message from the other person sent after the viewer's last_read_at
CREATE OR REPLACE FUNCTION get_unread_count(viewer_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM matches m
  WHERE
    -- viewer is a participant
    (m.user_a_id = viewer_profile_id OR m.user_b_id = viewer_profile_id)
    AND (
      -- case 1: viewer never opened the chat
      CASE
        WHEN m.user_a_id = viewer_profile_id THEN m.last_read_at_a IS NULL
        ELSE m.last_read_at_b IS NULL
      END
      OR
      -- case 2: there is a newer message from the other person
      EXISTS (
        SELECT 1
        FROM messages msg
        WHERE
          msg.match_id = m.id
          AND msg.sender_id <> viewer_profile_id
          AND msg.sent_at > CASE
            WHEN m.user_a_id = viewer_profile_id THEN m.last_read_at_a
            ELSE m.last_read_at_b
          END
      )
    );
$$;
```

- [ ] **Step 2: Apply the migration via Supabase CLI**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx supabase db push --linked
```

Expected output: migration applied successfully, no errors.

- [ ] **Step 3: Verify columns and RPC exist**

```bash
npx supabase db remote commit --dry-run 2>&1 | head -20
```

Or open the Supabase dashboard → Table Editor → matches and confirm `last_read_at_a` and `last_read_at_b` columns are present.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601000001_add_last_read_at.sql
git commit -m "feat: add last_read_at columns and get_unread_count RPC"
```

---

### Task 2: markMatchRead in lib/matches.ts

**Files:**
- Modify: `lib/matches.ts` (append after `sendMessage` export)

- [ ] **Step 1: Add the markMatchRead function**

Open `lib/matches.ts` and append this function at the end of the file:

```ts
/**
 * Marks a match as read for the given viewer by setting their last_read_at column.
 * Fire-and-forget — caller does not need to await.
 */
export async function markMatchRead(matchId: string, viewerProfileId: string): Promise<void> {
  // Resolve which column to update (a or b)
  const { data: match, error } = await supabase
    .from('matches')
    .select('user_a_id')
    .eq('id', matchId)
    .single();
  if (error || !match) return;

  const column = (match as any).user_a_id === viewerProfileId
    ? 'last_read_at_a'
    : 'last_read_at_b';

  await supabase
    .from('matches')
    .update({ [column]: new Date().toISOString() })
    .eq('id', matchId);
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 3: Commit**

```bash
git add lib/matches.ts
git commit -m "feat: add markMatchRead helper"
```

---

### Task 3: useUnreadCount hook

**Files:**
- Create: `hooks/useUnreadCount.ts`

- [ ] **Step 1: Create the hook**

```ts
// hooks/useUnreadCount.ts
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadCount(profileId: string | null): { count: number } {
  const [count, setCount] = useState(0);
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;

  useEffect(() => {
    if (!profileId) {
      setCount(0);
      return;
    }

    let cancelled = false;

    async function fetchCount() {
      const { data, error } = await supabase.rpc('get_unread_count', {
        viewer_profile_id: profileIdRef.current,
      });
      if (!cancelled && !error && typeof data === 'number') {
        setCount(data);
      }
    }

    fetchCount();

    // Re-fetch on any new message or new match
    const channel = supabase
      .channel(`unread_count:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchCount(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        () => fetchCount(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        () => fetchCount(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return { count };
}
```

Note: the UPDATE subscription on `matches` ensures the badge re-fetches when `markMatchRead` writes `last_read_at`, which clears the badge for that chat.

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useUnreadCount.ts
git commit -m "feat: add useUnreadCount hook with realtime subscription"
```

---

### Task 4: Wire badge into tab layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Update the layout file**

Replace the full content of `app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { useSession } from '@/hooks/useSession';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { supabase } from '@/lib/supabase';

function TabsWithBadge({ profileId }: { profileId: string }) {
  const { count } = useUnreadCount(profileId);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarStyle: { backgroundColor: Colors.bg, borderTopColor: Colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'discover', tabBarLabel: 'discover' }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'matches',
          tabBarLabel: 'matches',
          tabBarBadge: count > 0 ? count : undefined,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
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
      <TabsWithBadge profileId={profileId} />
    </OnboardingProvider>
  );
}
```

Rationale: `TabsWithBadge` is extracted so `useUnreadCount` can be called inside the `OnboardingProvider` tree — hooks must be called in a component, and the hook is simpler if it receives a guaranteed non-null `profileId`.

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: show unread badge on matches tab"
```

---

### Task 5: Mark match as read when chat opens

**Files:**
- Modify: `app/matches/[matchId].tsx`

- [ ] **Step 1: Add import and markMatchRead call**

In `app/matches/[matchId].tsx`, add `markMatchRead` to the existing import from `@/lib/matches`:

```ts
import { fetchMessages, sendMessage, markMatchRead, type Message } from '@/lib/matches';
```

Then, after the existing `useEffect` that loads the other person's name (around line 35), add a new `useEffect` to fire mark-as-read:

```ts
// Mark this match as read when the chat opens
useEffect(() => {
  if (!matchId || !profileId) return;
  markMatchRead(matchId, profileId).catch(err =>
    console.warn('markMatchRead error:', err),
  );
}, [matchId, profileId]);
```

This is fire-and-forget — no loading state needed. The `useUnreadCount` hook's UPDATE subscription will pick up the DB write and re-fetch the count automatically.

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/matches/[matchId].tsx
git commit -m "feat: mark match as read when chat screen opens"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start the app**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx expo start --ios
```

- [ ] **Step 2: Log in as test5@thedregs.app (password: dregs2026!)**

- [ ] **Step 3: Verify badge appears**

From a second device/simulator, log in as test2@thedregs.app and send a message to test5. Switch back to test5's simulator. The matches tab should show a numeric badge (e.g. "1").

- [ ] **Step 4: Verify badge clears**

On test5's simulator, tap the matches tab and open the chat with test2. The badge on the tab should disappear (or decrement) as soon as the chat screen mounts.

- [ ] **Step 5: Verify badge re-appears**

Without leaving the chat, have test2 send another message. Switch test5 to the discover tab, then back to matches — badge should re-appear.

- [ ] **Step 6: Commit if any fixup was needed; otherwise done**

```bash
git log --oneline -6
```

Confirm all 5 feature commits are present.
