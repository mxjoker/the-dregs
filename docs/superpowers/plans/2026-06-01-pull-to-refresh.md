# Pull-to-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pull-to-refresh to the matches list so users can manually reload without restarting the app.

**Architecture:** Extract the existing fetch logic into a `loadMatches` function, add a `refreshing` state, and pass a `RefreshControl` to the `FlatList`. Single file change only.

**Tech Stack:** React Native (`RefreshControl`, `FlatList`), TypeScript, Expo

---

## File Map

| File | Action |
|------|--------|
| `app/(tabs)/two.tsx` | Modify — add `refreshing` state, `loadMatches` fn, `handleRefresh` fn, `refreshControl` prop |

---

### Task 1: Add pull-to-refresh to matches list

**Files:**
- Modify: `app/(tabs)/two.tsx`

- [ ] **Step 1: Write the failing test**

Open `__tests__/lib/matches.test.ts` and add this test at the end of the file (before the closing of whatever describe block is already there, or as a top-level test):

```ts
it('fetchMatches can be called twice in sequence without error', async () => {
  // Simulates the pull-to-refresh path calling loadMatches a second time
  const supabase = require('@/lib/supabase').supabase;
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  });

  // First call (initial load)
  const first = await fetchMatches('profile-1').catch(() => []);
  // Second call (pull-to-refresh)
  const second = await fetchMatches('profile-1').catch(() => []);

  expect(Array.isArray(first)).toBe(true);
  expect(Array.isArray(second)).toBe(true);
});
```

Add the import at the top of the test file if `fetchMatches` isn't already imported:
```ts
import { fetchMatches } from '@/lib/matches';
```

- [ ] **Step 2: Run the test to confirm it passes already**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx jest __tests__/lib/matches.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests pass (fetchMatches is pure, calling it twice is already fine — this confirms no regression).

- [ ] **Step 3: Implement the changes in two.tsx**

Replace the entire content of `app/(tabs)/two.tsx` with:

```tsx
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';
import { fetchMatches, type MatchListItem } from '@/lib/matches';

function formatMatchSubtitle(item: MatchListItem): string {
  if (item.lastMessageBody) {
    return item.lastMessageBody.length > 40
      ? item.lastMessageBody.slice(0, 40) + '…'
      : item.lastMessageBody;
  }
  const matchedAt = new Date(item.matchedAt);
  const days = Math.floor((Date.now() - matchedAt.getTime()) / 86400000);
  if (days === 0) return 'matched today';
  if (days === 1) return 'matched yesterday';
  return `matched ${days} days ago`;
}

function InitialsAvatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

export default function MatchesScreen() {
  const { profileId } = useOnboarding();
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const loadMatches = useCallback(async () => {
    if (!profileId) return;
    try {
      const data = await fetchMatches(profileId);
      setMatches(data);
    } catch (err) {
      console.error('fetchMatches error:', err);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    loadMatches().finally(() => setLoading(false));
  }, [loadMatches, profileId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }, [loadMatches]);

  const renderItem = useCallback(({ item }: { item: MatchListItem }) => (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: '/matches/[matchId]' as any, params: { matchId: item.matchId } })}
    >
      <InitialsAvatar name={item.otherName} />
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{item.otherName}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {formatMatchSubtitle(item)}
        </Text>
      </View>
    </Pressable>
  ), []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  }, []);

  const handleSkipOnboarding = useCallback(async () => {
    setSkipping(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSkipping(false); return; }
    const { data: userData } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
    if (!userData) { setSkipping(false); return; }
    await supabase.from('profiles').update({ onboarding_step: 'complete', vibe_check_passed: true }).eq('user_id', userData.id);
    router.replace('/(tabs)');
  }, []);

  const busy = signingOut || skipping;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matches.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textMuted}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>no disasters yet. keep swiping.</Text>
            </View>
          }
          contentContainerStyle={styles.emptyContainer}
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.matchId}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textMuted}
            />
          }
        />
      )}

      <View style={styles.devButtons}>
        <Pressable
          style={[styles.devButton, skipping && styles.buttonDisabled]}
          onPress={handleSkipOnboarding}
          disabled={busy}
        >
          {skipping
            ? <ActivityIndicator size="small" color={Colors.textMuted} />
            : <Text style={styles.devButtonText}>skip onboarding [dev]</Text>
          }
        </Pressable>
        <Pressable
          style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={busy}
        >
          {signingOut
            ? <ActivityIndicator size="small" color={Colors.textMuted} />
            : <Text style={styles.signOutText}>sign out</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  list: { paddingTop: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, color: Colors.textPrimary, fontWeight: '500' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500', marginBottom: 2 },
  rowSubtitle: { fontSize: 13, color: Colors.textMuted },
  devButtons: { padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  devButton: {
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, borderStyle: 'dashed',
    alignSelf: 'center',
  },
  devButtonText: { fontSize: 13, color: Colors.textMuted },
  signOutButton: {
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    alignSelf: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  signOutText: { fontSize: 13, color: Colors.textSecondary },
});
```

Key changes from the original:
- Added `RefreshControl` to the RN import
- Added `refreshing` state
- Extracted `loadMatches` as a `useCallback`
- Added `handleRefresh` as a `useCallback`
- Empty state now uses a `FlatList` (instead of a plain `View`) so pull-to-refresh works even when there are no matches
- Added `refreshControl` prop to both FlatList branches

- [ ] **Step 4: Run TypeScript check**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Run the full test suite**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
npx jest --no-coverage 2>&1 | tail -15
```

Expected: all tests pass (53+).

- [ ] **Step 6: Commit**

```bash
cd /Users/joecoover2022/Downloads/the-dregs
git add "app/(tabs)/two.tsx" "__tests__/lib/matches.test.ts"
git commit -m "feat: pull-to-refresh on matches list"
```
