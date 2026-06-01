# Matches List + Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the matches tab stub with a real matches list and add a functional text-chat screen per match.

**Architecture:** Three self-contained tasks — data layer (`lib/matches.ts` additions), matches list screen (`app/(tabs)/two.tsx`), chat screen (`app/matches/[matchId].tsx`). A fourth task wires the match moment modal to navigate directly to the new chat screen. All screens use `useOnboarding()` for `profileId`.

**Tech Stack:** React Native, Expo Router, Supabase JS client, Supabase Realtime, TypeScript

---

## Context

### Project root
`/Users/joecoover2022/Downloads/the-dregs`

### Colors (from `constants/Colors.ts`)
```ts
Colors.bg = '#0d0d0d'
Colors.surface = '#1a1a1a'
Colors.border = '#2e2e2e'
Colors.textPrimary = '#ffffff'
Colors.textSecondary = '#999999'
Colors.textMuted = '#555555'
Colors.accent = '#e8e0d0'
Colors.accentFg = '#0d0d0d'
Colors.error = '#ff6b6b'
```

### Supabase tables
- `matches` — `id`, `user_a_id`, `user_b_id`, `matched_at`, `last_message_at`, `status`
- `messages` — `id`, `match_id`, `sender_id`, `body`, `message_type`, `sent_at`
- `matches_with_context` view — includes `user_a_name`, `user_b_name`, `user_a_chaos_score`, `user_b_chaos_score`, `days_since_last_message`, all `matches` columns
- **Note:** `matches_with_context` does NOT include last message body — that requires a separate query on `messages`

### Existing files
- `lib/matches.ts` — has `fetchMatchMomentData`; add new functions here
- `app/(tabs)/two.tsx` — current stub; replace content
- `app/(tabs)/_layout.tsx` — tab config; no changes needed
- `components/discover/MatchMomentModal.tsx` — "send a disaster opening line" navigates to `/(tabs)/matches`; update to navigate to chat

### Test mock pattern (from `__tests__/lib/matches.test.ts`)
```ts
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.com/${path}` } }) }) },
  },
}));
const mockFrom = supabase.from as jest.Mock;

function makeChain(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(returnValue),
    then: undefined as any,
  };
  Object.defineProperty(chain, 'then', { get() { return (resolve: any) => resolve(returnValue); } });
  return chain;
}
```

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/matches.ts` | Add `fetchMatches`, `fetchMessages`, `sendMessage`, export types |
| Modify | `__tests__/lib/matches.test.ts` | Add tests for new functions |
| Modify | `app/(tabs)/two.tsx` | Matches list UI |
| Create | `app/matches/[matchId].tsx` | Chat screen |
| Modify | `components/discover/MatchMomentModal.tsx` | Navigate to chat instead of matches tab |

---

## Task 1: Data layer — `fetchMatches`, `fetchMessages`, `sendMessage`

**Files:**
- Modify: `lib/matches.ts`
- Modify: `__tests__/lib/matches.test.ts`

### Types to add

```ts
export type MatchListItem = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  matchedAt: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

export type Message = {
  id: string;
  matchId: string;
  senderId: string;
  body: string | null;
  messageType: string;
  sentAt: string;
};
```

### Functions to add

```ts
export async function fetchMatches(viewerProfileId: string): Promise<MatchListItem[]>
export async function fetchMessages(matchId: string, limit?: number): Promise<Message[]>
export async function sendMessage(params: { matchId: string; senderId: string; body: string }): Promise<Message>
```

- [ ] **Step 1.1 — Write failing tests**

Add to `__tests__/lib/matches.test.ts` (after the existing `fetchMatchMomentData` tests):

```ts
import { fetchMatches, fetchMessages, sendMessage } from '@/lib/matches';

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';
const MATCH_ID = 'match-456';

describe('fetchMatches', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns matches where viewer is user_a', async () => {
    // matches_with_context query
    mockFrom.mockReturnValueOnce({
      ...makeChain({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: undefined,
    });
    const chain = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: undefined as any,
    };
    Object.defineProperty(chain, 'then', {
      get() {
        return (resolve: any) => resolve({
          data: [{
            id: MATCH_ID,
            user_a_id: PROFILE_A,
            user_b_id: PROFILE_B,
            user_a_name: 'Alice',
            user_b_name: 'Bob',
            matched_at: '2026-05-31T10:00:00Z',
            last_message_at: null,
          }],
          error: null,
        });
      },
    });
    mockFrom.mockReturnValueOnce(chain);

    // last message query per match
    mockFrom.mockReturnValueOnce(
      makeChain({ data: null, error: null }),
    );

    const results = await fetchMatches(PROFILE_A);
    expect(results).toHaveLength(1);
    expect(results[0].matchId).toBe(MATCH_ID);
    expect(results[0].otherProfileId).toBe(PROFILE_B);
    expect(results[0].otherName).toBe('Bob');
    expect(results[0].lastMessageBody).toBeNull();
  });
});

describe('fetchMessages', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns messages for a match in reverse chronological order', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: undefined as any,
    };
    Object.defineProperty(chain, 'then', {
      get() {
        return (resolve: any) => resolve({
          data: [
            { id: 'msg-2', match_id: MATCH_ID, sender_id: PROFILE_B, body: 'hello back', message_type: 'text', sent_at: '2026-05-31T10:01:00Z' },
            { id: 'msg-1', match_id: MATCH_ID, sender_id: PROFILE_A, body: 'hello', message_type: 'text', sent_at: '2026-05-31T10:00:00Z' },
          ],
          error: null,
        });
      },
    });
    mockFrom.mockReturnValueOnce(chain);

    const messages = await fetchMessages(MATCH_ID);
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe('msg-2');
    expect(messages[0].body).toBe('hello back');
    expect(messages[0].senderId).toBe(PROFILE_B);
  });
});

describe('sendMessage', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('inserts a message and returns the created row', async () => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'msg-new',
          match_id: MATCH_ID,
          sender_id: PROFILE_A,
          body: 'hey disaster',
          message_type: 'text',
          sent_at: '2026-05-31T11:00:00Z',
        },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const msg = await sendMessage({ matchId: MATCH_ID, senderId: PROFILE_A, body: 'hey disaster' });
    expect(msg.id).toBe('msg-new');
    expect(msg.body).toBe('hey disaster');
    expect(msg.senderId).toBe(PROFILE_A);
  });

  it('throws when insert errors', async () => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await expect(sendMessage({ matchId: MATCH_ID, senderId: PROFILE_A, body: 'hi' }))
      .rejects.toThrow('insert failed');
  });
});
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx jest __tests__/lib/matches.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `fetchMatches`, `fetchMessages`, `sendMessage` not yet exported.

- [ ] **Step 1.3 — Implement the new functions**

Add to `lib/matches.ts` (after the existing `fetchMatchMomentData` function):

```ts
export type MatchListItem = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  matchedAt: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

export async function fetchMatches(viewerProfileId: string): Promise<MatchListItem[]> {
  const { data, error } = await supabase
    .from('matches_with_context')
    .select('id, user_a_id, user_b_id, user_a_name, user_b_name, matched_at, last_message_at')
    .or(`user_a_id.eq.${viewerProfileId},user_b_id.eq.${viewerProfileId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('matched_at', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch the most recent message body for each match in one query
  const matchIds = (data as any[]).map((m: any) => m.id);
  const { data: lastMsgs } = await supabase
    .from('messages')
    .select('match_id, body, sent_at')
    .in('match_id', matchIds)
    .order('sent_at', { ascending: false });

  // Build a map: matchId → most recent message (first occurrence per match_id after ordering)
  const lastMsgMap: Record<string, { body: string | null; sent_at: string }> = {};
  for (const msg of (lastMsgs ?? []) as any[]) {
    if (!lastMsgMap[msg.match_id]) {
      lastMsgMap[msg.match_id] = { body: msg.body, sent_at: msg.sent_at };
    }
  }

  return (data as any[]).map((m: any) => {
    const isA = m.user_a_id === viewerProfileId;
    const lastMsg = lastMsgMap[m.id] ?? null;
    return {
      matchId: m.id,
      otherProfileId: isA ? m.user_b_id : m.user_a_id,
      otherName: isA ? m.user_b_name : m.user_a_name,
      matchedAt: m.matched_at,
      lastMessageBody: lastMsg?.body ?? null,
      lastMessageAt: lastMsg?.sent_at ?? m.last_message_at ?? null,
    };
  });
}

export type Message = {
  id: string;
  matchId: string;
  senderId: string;
  body: string | null;
  messageType: string;
  sentAt: string;
};

export async function fetchMessages(matchId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, match_id, sender_id, body, message_type, sent_at')
    .eq('match_id', matchId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map((m: any) => ({
    id: m.id,
    matchId: m.match_id,
    senderId: m.sender_id,
    body: m.body,
    messageType: m.message_type,
    sentAt: m.sent_at,
  }));
}

export async function sendMessage(params: {
  matchId: string;
  senderId: string;
  body: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: params.matchId,
      sender_id: params.senderId,
      body: params.body,
      message_type: 'text',
    })
    .select('id, match_id, sender_id, body, message_type, sent_at')
    .single();
  if (error) throw error;
  if (!data) throw new Error('sendMessage returned no data');
  return {
    id: (data as any).id,
    matchId: (data as any).match_id,
    senderId: (data as any).sender_id,
    body: (data as any).body,
    messageType: (data as any).message_type,
    sentAt: (data as any).sent_at,
  };
}
```

- [ ] **Step 1.4 — Run tests to confirm they pass**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx jest __tests__/lib/matches.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests pass (existing + new).

- [ ] **Step 1.5 — Run full test suite**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx jest --no-coverage 2>&1 | tail -10
```

Expected: All 49+ tests pass.

- [ ] **Step 1.6 — Commit**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && git add lib/matches.ts __tests__/lib/matches.test.ts && git commit -m "feat: add fetchMatches, fetchMessages, sendMessage to lib/matches.ts"
```

---

## Task 2: Matches list screen (`app/(tabs)/two.tsx`)

**Files:**
- Modify: `app/(tabs)/two.tsx`

No new test file needed — this is a screen component; behaviour is tested via lib tests.

The screen must:
1. Load viewer's `profileId` from `useOnboarding()`
2. Call `fetchMatches(profileId)` on mount
3. Display a `FlatList` of match rows
4. Preserve sign-out and skip-onboarding dev buttons at bottom

- [ ] **Step 2.1 — Replace `app/(tabs)/two.tsx`**

```tsx
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
  const [signingOut, setSigningOut] = useState(false);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    fetchMatches(profileId)
      .then(setMatches)
      .catch(err => console.error('fetchMatches error:', err))
      .finally(() => setLoading(false));
  }, [profileId]);

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
        <View style={styles.centered}>
          <Text style={styles.emptyText}>no disasters yet. keep swiping.</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.matchId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/matches/[matchId]', params: { matchId: item.matchId } })}
            >
              <InitialsAvatar name={item.otherName} />
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{item.otherName}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {formatMatchSubtitle(item)}
                </Text>
              </View>
            </Pressable>
          )}
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

- [ ] **Step 2.2 — Run TypeScript check**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx tsc --noEmit 2>&1 | grep -v "supabase/functions\|node_modules" | head -20
```

Expected: no new errors.

- [ ] **Step 2.3 — Commit**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && git add "app/(tabs)/two.tsx" && git commit -m "feat: matches list screen replaces stub"
```

---

## Task 3: Chat screen (`app/matches/[matchId].tsx`)

**Files:**
- Create: `app/matches/[matchId].tsx`

The screen must:
1. Read `matchId` from `useLocalSearchParams()`
2. Load `profileId` from `useOnboarding()`
3. Fetch other person's display name from the match row
4. Fetch initial messages with `fetchMessages(matchId)`
5. Subscribe to realtime `INSERT` on `messages` for this match
6. Show messages in an `inverted` FlatList (newest at bottom visually)
7. Text input + send button; optimistic update on send

- [ ] **Step 3.1 — Create `app/matches/[matchId].tsx`**

```tsx
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';
import { fetchMessages, sendMessage, type Message } from '@/lib/matches';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { profileId } = useOnboarding();

  const [otherName, setOtherName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Load other person's name
  useEffect(() => {
    if (!matchId || !profileId) return;
    supabase
      .from('matches')
      .select('user_a_id, user_b_id, profiles!matches_user_a_id_fkey(display_name), profiles!matches_user_b_id_fkey(display_name)')
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const isA = (data as any).user_a_id === profileId;
        const profiles = data as any;
        const name = isA
          ? profiles['profiles!matches_user_b_id_fkey']?.display_name
          : profiles['profiles!matches_user_a_id_fkey']?.display_name;
        setOtherName(name ?? '');
      })
      .catch(err => console.error('load match name error:', err));
  }, [matchId, profileId]);

  // Load initial messages
  useEffect(() => {
    if (!matchId) return;
    fetchMessages(matchId)
      .then(setMessages)
      .catch(err => console.error('fetchMessages error:', err))
      .finally(() => setLoading(false));
  }, [matchId]);

  // Realtime subscription
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        payload => {
          const m = payload.new as any;
          const newMsg: Message = {
            id: m.id,
            matchId: m.match_id,
            senderId: m.sender_id,
            body: m.body,
            messageType: m.message_type,
            sentAt: m.sent_at,
          };
          // Avoid duplicate from optimistic update
          setMessages(prev => {
            if (prev.some(existing => existing.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function handleSend() {
    if (!inputText.trim() || !profileId || !matchId) return;
    const body = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      matchId,
      senderId: profileId,
      body,
      messageType: 'text',
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [optimistic, ...prev]);

    try {
      const saved = await sendMessage({ matchId, senderId: profileId, body });
      // Replace optimistic with saved
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch (err) {
      console.error('sendMessage error:', err);
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: otherName || '...' }} />
        <ActivityIndicator color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: otherName, headerStyle: { backgroundColor: Colors.bg }, headerTintColor: Colors.textPrimary, headerTitleStyle: { color: Colors.textPrimary } }} />

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isViewer = item.senderId === profileId;
          return (
            <View style={[styles.bubbleRow, isViewer ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
              <View style={[styles.bubble, isViewer ? styles.bubbleViewer : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isViewer ? styles.bubbleTextViewer : styles.bubbleTextOther]}>
                  {item.body ?? '(unsupported message)'}
                </Text>
                <Text style={[styles.bubbleTime, isViewer ? styles.bubbleTimeViewer : styles.bubbleTimeOther]}>
                  {formatTime(item.sentAt)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>no messages yet. send a disaster opening line.</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="say something terrible"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color={Colors.accentFg} />
            : <Text style={styles.sendButtonText}>send</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12 },
  bubbleRow: { marginBottom: 8, flexDirection: 'row' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleViewer: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextViewer: { color: Colors.accentFg },
  bubbleTextOther: { color: Colors.textPrimary },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  bubbleTimeViewer: { color: Colors.accentFg, opacity: 0.6, textAlign: 'right' },
  bubbleTimeOther: { color: Colors.textMuted },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: Colors.accentFg, fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 3.2 — Run TypeScript check**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx tsc --noEmit 2>&1 | grep -v "supabase/functions\|node_modules" | head -20
```

Expected: no new errors.

- [ ] **Step 3.3 — Run full test suite**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx jest --no-coverage 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3.4 — Commit**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && git add "app/matches/[matchId].tsx" && git commit -m "feat: chat screen for matches"
```

---

## Task 4: Wire match moment modal to navigate to chat

**Files:**
- Modify: `components/discover/MatchMomentModal.tsx`
- Modify: `app/(tabs)/index.tsx`

The "send a disaster opening line" button currently calls `onSendLine(line)` in the discover screen, which does:
```ts
onSendLine={(_line) => {
  handleMatchDismiss();
  router.push('/(tabs)/matches');
}}
```

Update it to navigate to the chat screen with the match ID.

- [ ] **Step 4.1 — Read `components/discover/MatchMomentModal.tsx` to confirm `onSendLine` signature**

The prop is `onSendLine: (line: string) => void`. The `MatchMomentData` passed in has `matchId`. The modal calls `onSendLine(selectedLine)` when the button is tapped.

No change needed in the modal component itself — the fix is in the caller.

- [ ] **Step 4.2 — Update `onSendLine` handler in `app/(tabs)/index.tsx`**

Find the `MatchMomentModal` JSX and update the `onSendLine` prop:

Old:
```tsx
onSendLine={(_line) => {
  handleMatchDismiss();
  router.push('/(tabs)/matches');
}}
```

New:
```tsx
onSendLine={(_line) => {
  const matchId = pendingMatch?.matchId;
  handleMatchDismiss();
  if (matchId) {
    router.push({ pathname: '/matches/[matchId]', params: { matchId } });
  } else {
    router.push('/(tabs)/matches');
  }
}}
```

- [ ] **Step 4.3 — Run TypeScript check**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx tsc --noEmit 2>&1 | grep -v "supabase/functions\|node_modules" | head -20
```

Expected: no new errors.

- [ ] **Step 4.4 — Run full test suite**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && npx jest --no-coverage 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 4.5 — Commit**

```bash
cd /Users/joecoover2022/Downloads/the-dregs && git add "app/(tabs)/index.tsx" && git commit -m "feat: match modal navigates directly to chat screen"
```

---

## Manual Smoke Test

1. Open the app on a simulator
2. Matches tab shows "no disasters yet. keep swiping." if no matches
3. Create a match between two test accounts (mutual like)
4. Both users see each other in the matches list
5. Tap a match row → opens chat screen with correct name in header
6. Type and send a message → appears in chat immediately
7. On second device, message appears in realtime
8. From the match moment modal, tap "send a disaster opening line" → opens chat directly
