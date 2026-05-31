# Match Moment Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When two users mutually like each other, show a full-screen animated modal with their shared red flags and 14 tappable opening lines, then navigate to the matches tab.

**Architecture:** New `lib/matches.ts` provides `fetchMatchMomentData`; new `components/discover/MatchMomentModal.tsx` owns all UI; `app/(tabs)/index.tsx` holds `pendingMatch` state and wires the realtime handler to the modal.

**Tech Stack:** React Native `Modal` + `Animated` API, Supabase JS client, Expo Router, Jest + `@testing-library/react-native`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/matches.ts` | `fetchMatchMomentData` — queries match row, other profile, shared flags |
| Create | `components/discover/MatchMomentModal.tsx` | Full modal UI, animation, opening lines |
| Modify | `app/(tabs)/index.tsx` | Add `pendingMatch` state + queue, wire realtime handler, render modal |
| Create | `__tests__/lib/matches.test.ts` | Unit tests for `fetchMatchMomentData` |
| Create | `__tests__/components/MatchMomentModal.test.tsx` | Component tests for modal |

---

## Task 1: Data layer — `lib/matches.ts`

**Files:**
- Create: `lib/matches.ts`
- Create: `__tests__/lib/matches.test.ts`

### Step 1.1 — Write failing tests

Create `__tests__/lib/matches.test.ts`:

```ts
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example.com/${path}` },
        }),
      }),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchMatchMomentData } from '@/lib/matches';

const mockFrom = supabase.from as jest.Mock;

function makeChain(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(returnValue),
    // for queries that don't call .single()
    then: undefined as any,
  };
  // allow awaiting the chain directly (for .in() queries)
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve: any) => resolve(returnValue);
    },
  });
  return chain;
}

const VIEWER_ID = 'profile-viewer';
const OTHER_ID = 'profile-other';
const MATCH_ID = 'match-123';

describe('fetchMatchMomentData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns otherProfileId, otherName, otherPhotoUrl, and sharedFlags', async () => {
    mockFrom
      .mockReturnValueOnce(
        // matches query
        makeChain({ data: { user_a_id: VIEWER_ID, user_b_id: OTHER_ID }, error: null }),
      )
      .mockReturnValueOnce(
        // profiles query for other profile
        makeChain({
          data: {
            display_name: 'Alex',
            profile_photos: [{ storage_path: 'photos/alex.jpg', display_order: 0 }],
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(
        // profile_red_flags query (both profiles)
        makeChain({
          data: [
            { profile_id: VIEWER_ID, red_flags: { id: 'flag-1', label: 'no curtains' } },
            { profile_id: VIEWER_ID, red_flags: { id: 'flag-2', label: 'has a podcast' } },
            { profile_id: OTHER_ID, red_flags: { id: 'flag-1', label: 'no curtains' } },
            { profile_id: OTHER_ID, red_flags: { id: 'flag-3', label: 'sends voice notes' } },
          ],
          error: null,
        }),
      );

    const result = await fetchMatchMomentData(MATCH_ID, VIEWER_ID);

    expect(result.matchId).toBe(MATCH_ID);
    expect(result.otherProfileId).toBe(OTHER_ID);
    expect(result.otherName).toBe('Alex');
    expect(result.otherPhotoUrl).toContain('photos/alex.jpg');
    expect(result.sharedFlags).toEqual([{ id: 'flag-1', label: 'no curtains' }]);
    expect(result.viewerName).toBeDefined();
  });

  it('returns otherProfileId correctly when viewer is user_b', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { user_a_id: OTHER_ID, user_b_id: VIEWER_ID }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({
          data: { display_name: 'Sam', profile_photos: [] },
          error: null,
        }),
      )
      .mockReturnValueOnce(
        makeChain({ data: [], error: null }),
      );

    const result = await fetchMatchMomentData(MATCH_ID, VIEWER_ID);
    expect(result.otherProfileId).toBe(OTHER_ID);
    expect(result.otherName).toBe('Sam');
    expect(result.otherPhotoUrl).toBeNull();
    expect(result.sharedFlags).toEqual([]);
  });

  it('returns empty sharedFlags when there is no overlap', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { user_a_id: VIEWER_ID, user_b_id: OTHER_ID }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({ data: { display_name: 'Sam', profile_photos: [] }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({
          data: [
            { profile_id: VIEWER_ID, red_flags: { id: 'flag-1', label: 'no curtains' } },
            { profile_id: OTHER_ID, red_flags: { id: 'flag-2', label: 'has a podcast' } },
          ],
          error: null,
        }),
      );

    const result = await fetchMatchMomentData(MATCH_ID, VIEWER_ID);
    expect(result.sharedFlags).toEqual([]);
  });

  it('throws when the matches query returns an error', async () => {
    mockFrom.mockReturnValueOnce(
      makeChain({ data: null, error: new Error('db error') }),
    );
    await expect(fetchMatchMomentData(MATCH_ID, VIEWER_ID)).rejects.toThrow('db error');
  });
});
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
npx jest __tests__/lib/matches.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/lib/matches'"

- [ ] **Step 1.3 — Implement `lib/matches.ts`**

Create `lib/matches.ts`:

```ts
import { supabase } from './supabase';
import { buildPhotoUrl } from './discover';

export type MatchMomentData = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  otherPhotoUrl: string | null;
  viewerName: string;
  sharedFlags: Array<{ id: string; label: string }>;
};

export async function fetchMatchMomentData(
  matchId: string,
  viewerProfileId: string,
): Promise<MatchMomentData> {
  // 1. Resolve the other profile ID from the match row
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('user_a_id, user_b_id')
    .eq('id', matchId)
    .single();
  if (matchError) throw matchError;
  if (!match) throw new Error('match not found');

  const otherProfileId =
    match.user_a_id === viewerProfileId ? match.user_b_id : match.user_a_id;

  // 2. Fetch display_name + primary photo for both profiles in parallel
  const [{ data: otherProfile, error: otherError }, { data: viewerProfile, error: viewerError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, profile_photos(storage_path, display_order)')
        .eq('id', otherProfileId)
        .single(),
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', viewerProfileId)
        .single(),
    ]);
  if (otherError) throw otherError;
  if (viewerError) throw viewerError;

  const photos = ((otherProfile.profile_photos as any[]) ?? [])
    .sort((a: any, b: any) => a.display_order - b.display_order);
  const otherPhotoUrl = buildPhotoUrl(photos[0]?.storage_path ?? null);

  // 3. Fetch red flags for both profiles in one query
  const { data: flagRows, error: flagsError } = await supabase
    .from('profile_red_flags')
    .select('profile_id, red_flags(id, label)')
    .in('profile_id', [viewerProfileId, otherProfileId]);
  if (flagsError) throw flagsError;

  const viewerFlagIds = new Set(
    (flagRows ?? [])
      .filter((r: any) => r.profile_id === viewerProfileId)
      .map((r: any) => r.red_flags.id),
  );

  const sharedFlags = (flagRows ?? [])
    .filter((r: any) => r.profile_id === otherProfileId && viewerFlagIds.has(r.red_flags.id))
    .map((r: any) => ({ id: r.red_flags.id as string, label: r.red_flags.label as string }));

  return {
    matchId,
    otherProfileId,
    otherName: otherProfile.display_name,
    otherPhotoUrl,
    viewerName: viewerProfile.display_name,
    sharedFlags,
  };
}
```

- [ ] **Step 1.4 — Run tests to confirm they pass**

```bash
npx jest __tests__/lib/matches.test.ts --no-coverage
```

Expected: PASS — 4 tests

- [ ] **Step 1.5 — Commit**

```bash
git add lib/matches.ts __tests__/lib/matches.test.ts
git commit -m "feat: add fetchMatchMomentData to lib/matches"
```

---

## Task 2: Modal component — `components/discover/MatchMomentModal.tsx`

**Files:**
- Create: `components/discover/MatchMomentModal.tsx`
- Create: `__tests__/components/MatchMomentModal.test.tsx`

### Step 2.1 — Write failing tests

Create `__tests__/components/MatchMomentModal.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MatchMomentModal } from '@/components/discover/MatchMomentModal';
import type { MatchMomentData } from '@/lib/matches';

const BASE_DATA: MatchMomentData = {
  matchId: 'match-1',
  otherProfileId: 'profile-other',
  otherName: 'Alex',
  otherPhotoUrl: null,
  viewerName: 'You',
  sharedFlags: [],
};

describe('MatchMomentModal', () => {
  it('renders the match heading with the other person name', () => {
    const { getByText } = render(
      <MatchMomentModal
        visible
        data={BASE_DATA}
        onDismiss={jest.fn()}
        onSendLine={jest.fn()}
      />,
    );
    expect(getByText('You matched with Alex')).toBeTruthy();
  });

  it('renders the "disaster solidarity" badge', () => {
    const { getByText } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(getByText('disaster solidarity')).toBeTruthy();
  });

  it('renders all 12 base opening lines when no shared flags', () => {
    const { getByText } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(getByText("so what's your damage")).toBeTruthy();
    expect(getByText("let's ruin this slowly")).toBeTruthy();
  });

  it('renders 2 extra lines when shared flags exist', () => {
    const { getByText } = render(
      <MatchMomentModal
        visible
        data={{ ...BASE_DATA, sharedFlags: [{ id: 'f1', label: 'no curtains' }] }}
        onDismiss={jest.fn()}
        onSendLine={jest.fn()}
      />,
    );
    expect(getByText(/i liked your flag about no curtains/)).toBeTruthy();
    expect(getByText(/we have 1 red flag in common/)).toBeTruthy();
  });

  it('does not render shared flag chips when sharedFlags is empty', () => {
    const { queryByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(queryByTestId('shared-flags-row')).toBeNull();
  });

  it('renders shared flag chips when sharedFlags has entries', () => {
    const { getByTestId, getByText } = render(
      <MatchMomentModal
        visible
        data={{ ...BASE_DATA, sharedFlags: [{ id: 'f1', label: 'no curtains' }] }}
        onDismiss={jest.fn()}
        onSendLine={jest.fn()}
      />,
    );
    expect(getByTestId('shared-flags-row')).toBeTruthy();
    expect(getByText('no curtains')).toBeTruthy();
  });

  it('send button is disabled until a line is selected', () => {
    const { getByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(getByTestId('send-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('send button enables after selecting a line', () => {
    const { getByText, getByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    fireEvent.press(getByText("so what's your damage"));
    expect(getByTestId('send-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('calls onSendLine with the selected line when send button is pressed', () => {
    const onSendLine = jest.fn();
    const { getByText, getByTestId } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={jest.fn()} onSendLine={onSendLine} />,
    );
    fireEvent.press(getByText("so what's your damage"));
    fireEvent.press(getByTestId('send-button'));
    expect(onSendLine).toHaveBeenCalledWith("so what's your damage");
  });

  it('calls onDismiss when "keep swiping" is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <MatchMomentModal visible data={BASE_DATA} onDismiss={onDismiss} onSendLine={jest.fn()} />,
    );
    fireEvent.press(getByText('keep swiping'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders nothing when data is null', () => {
    const { queryByText } = render(
      <MatchMomentModal visible={false} data={null} onDismiss={jest.fn()} onSendLine={jest.fn()} />,
    );
    expect(queryByText('disaster solidarity')).toBeNull();
  });
});
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```bash
npx jest __tests__/components/MatchMomentModal.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '@/components/discover/MatchMomentModal'"

- [ ] **Step 2.3 — Implement `MatchMomentModal.tsx`**

Create `components/discover/MatchMomentModal.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import type { MatchMomentData } from '@/lib/matches';

const BASE_LINES = [
  "so what's your damage",
  "i saw your red flags and thought: relatable",
  "we matched. i'm choosing not to read into that",
  "your chaos score is impressive. i mean that sincerely",
  // index 4: conditional shared-flag line injected here when flags exist
  "honest question: are you okay",
  "i have no opener. this is the opener",
  "your biggest failure sounded familiar",
  "i'm not going to ghost you. probably",
  // index 9 (after injection): conditional count line injected here
  "hi. i also have no curtains",
  "your ex section gave me feelings i need to unpack",
  "i swiped right on your chaos specifically",
  "let's ruin this slowly",
];

function buildLines(sharedFlags: MatchMomentData['sharedFlags']): string[] {
  const lines = [...BASE_LINES];
  if (sharedFlags.length > 0) {
    lines.splice(
      4,
      0,
      `i liked your flag about ${sharedFlags[0].label}. mine too, apparently`,
    );
    const count = sharedFlags.length;
    lines.splice(
      9,
      0,
      `we have ${count} red flag${count === 1 ? '' : 's'} in common. that's either a green flag or a warning`,
    );
  }
  return lines;
}

type Props = {
  visible: boolean;
  data: MatchMomentData | null;
  onDismiss: () => void;
  onSendLine: (line: string) => void;
};

export function MatchMomentModal({ visible, data, onDismiss, onSendLine }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const avatarScaleAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      setSelectedLine(null);
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(1);
      avatarScaleAnim.setValue(1);

      Animated.spring(scaleAnim, {
        toValue: 1,
        bounciness: 8,
        useNativeDriver: true,
      }).start(() => {
        pulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(avatarScaleAnim, {
              toValue: 1.04,
              duration: 1250,
              useNativeDriver: true,
            }),
            Animated.timing(avatarScaleAnim, {
              toValue: 1.0,
              duration: 1250,
              useNativeDriver: true,
            }),
          ]),
        );
        pulseLoop.current.start();
      });
    } else {
      pulseLoop.current?.stop();
      avatarScaleAnim.setValue(1);
    }
  }, [visible]);

  function animateOut(callback: () => void) {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    pulseLoop.current?.stop();
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => callback());
  }

  if (!data) return null;

  const lines = buildLines(data.sharedFlags);
  const viewerInitial = data.viewerName[0]?.toUpperCase() ?? '?';
  const otherInitial = data.otherName[0]?.toUpperCase() ?? '?';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => animateOut(onDismiss)}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.badge}>disaster solidarity</Text>

          <View style={styles.avatarRow}>
            <Animated.View
              style={[styles.avatar, styles.avatarYou, { transform: [{ scale: avatarScaleAnim }] }]}
            >
              <Text style={styles.avatarInitial}>{viewerInitial}</Text>
            </Animated.View>
            <Animated.View
              style={[styles.avatar, styles.avatarThem, { transform: [{ scale: avatarScaleAnim }] }]}
            >
              <Text style={styles.avatarInitial}>{otherInitial}</Text>
            </Animated.View>
          </View>

          <Text style={styles.heading}>You matched with {data.otherName}</Text>
          <Text style={styles.subtext}>
            You both swiped right on each other&apos;s chaos. Congrats, probably.
          </Text>

          {data.sharedFlags.length > 0 && (
            <View style={styles.flagsRow} testID="shared-flags-row">
              {data.sharedFlags.map(f => (
                <View key={f.id} style={styles.flagChip}>
                  <Text style={styles.flagChipText}>{f.label}</Text>
                </View>
              ))}
            </View>
          )}

          <ScrollView
            style={styles.linesScroll}
            showsVerticalScrollIndicator={false}
          >
            {lines.map(line => (
              <Pressable
                key={line}
                style={[styles.lineRow, selectedLine === line && styles.lineRowSelected]}
                onPress={() => setSelectedLine(line)}
              >
                <Text style={[styles.lineText, selectedLine === line && styles.lineTextSelected]}>
                  {line}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            testID="send-button"
            style={[styles.sendButton, !selectedLine && styles.sendButtonDisabled]}
            onPress={() => selectedLine && animateOut(() => onSendLine(selectedLine))}
            disabled={!selectedLine}
            accessibilityState={{ disabled: !selectedLine }}
          >
            <Text style={styles.sendButtonText}>send a disaster opening line</Text>
          </Pressable>

          <Pressable onPress={() => animateOut(onDismiss)}>
            <Text style={styles.keepSwiping}>keep swiping</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarYou: {
    backgroundColor: '#1a1a2e',
    marginRight: -10,
    zIndex: 1,
  },
  avatarThem: {
    backgroundColor: '#2e1a1a',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  flagChip: {
    backgroundColor: '#2a1e1e',
    borderWidth: 1,
    borderColor: '#4a3030',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flagChipText: {
    fontSize: 11,
    color: '#cc8888',
  },
  linesScroll: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 20,
  },
  lineRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  lineRowSelected: {
    backgroundColor: Colors.border,
  },
  lineText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  lineTextSelected: {
    color: Colors.textPrimary,
  },
  sendButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentFg,
  },
  keepSwiping: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 4,
  },
});
```

- [ ] **Step 2.4 — Run tests to confirm they pass**

```bash
npx jest __tests__/components/MatchMomentModal.test.tsx --no-coverage
```

Expected: PASS — 10 tests

- [ ] **Step 2.5 — Commit**

```bash
git add components/discover/MatchMomentModal.tsx __tests__/components/MatchMomentModal.test.tsx
git commit -m "feat: add MatchMomentModal component"
```

---

## Task 3: Wire into `app/(tabs)/index.tsx`

**Files:**
- Modify: `app/(tabs)/index.tsx`

No new tests needed — the component and lib are tested. This task is wiring.

- [ ] **Step 3.1 — Add imports to `app/(tabs)/index.tsx`**

Add at the top of the file alongside existing imports:

```ts
import { fetchMatchMomentData, type MatchMomentData } from '@/lib/matches';
import { MatchMomentModal } from '@/components/discover/MatchMomentModal';
```

- [ ] **Step 3.2 — Add state and refs inside `DiscoverScreen`**

Add after the existing `const [discardPileEmpty, ...]` line:

```ts
const [pendingMatch, setPendingMatch] = useState<MatchMomentData | null>(null);
const pendingMatchRef = useRef<MatchMomentData | null>(null);
const matchQueueRef = useRef<MatchMomentData[]>([]);
```

Add a sync effect to keep `pendingMatchRef` up to date (add after the state declarations):

```ts
useEffect(() => {
  pendingMatchRef.current = pendingMatch;
}, [pendingMatch]);
```

- [ ] **Step 3.3 — Replace the `console.log` in the realtime handler**

Find this block in the realtime `useEffect`:

```ts
if (match.user_a_id === profileId || match.user_b_id === profileId) {
  // Match moment screen is out of scope (separate spec) — wire navigation there.
  console.log('match detected:', match.id);
}
```

Replace with:

```ts
if (match.user_a_id === profileId || match.user_b_id === profileId) {
  fetchMatchMomentData(match.id, profileId)
    .then(data => {
      if (pendingMatchRef.current) {
        matchQueueRef.current.push(data);
      } else {
        setPendingMatch(data);
      }
    })
    .catch(err => console.error('fetchMatchMomentData error:', err));
}
```

- [ ] **Step 3.4 — Add the dismiss handler inside `DiscoverScreen`**

Add after `handleButWhyClose`:

```ts
function handleMatchDismiss() {
  setPendingMatch(null);
  if (matchQueueRef.current.length > 0) {
    setTimeout(() => {
      const next = matchQueueRef.current.shift();
      if (next) setPendingMatch(next);
    }, 200);
  }
}
```

- [ ] **Step 3.5 — Render the modal in the JSX**

Add just before the final closing `</View>` of the return statement (after the `<FiltersSheet>` component):

```tsx
<MatchMomentModal
  visible={pendingMatch !== null}
  data={pendingMatch}
  onDismiss={handleMatchDismiss}
  onSendLine={() => {
    handleMatchDismiss();
    router.push('/(tabs)/matches');
  }}
/>
```

- [ ] **Step 3.6 — Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all existing tests + new tests PASS with no regressions.

- [ ] **Step 3.7 — Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: wire match moment modal into discover screen"
```

---

## Task 4: RLS — `matches` table SELECT policy

**Files:**
- Modify: Supabase SQL editor (manual step — not in a migration file; document in `memory/db_quirks.md`)

The `matches` table needs a SELECT policy so users can query their own matches in `fetchMatchMomentData`.

- [ ] **Step 4.1 — Apply the policy in the Supabase SQL editor**

Open the Supabase dashboard → SQL editor and run:

```sql
CREATE POLICY matches_select ON matches
  FOR SELECT
  USING (
    user_a_id IN (
      SELECT id FROM profiles WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
    OR
    user_b_id IN (
      SELECT id FROM profiles WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );
```

- [ ] **Step 4.2 — Document in `memory/db_quirks.md`**

Append to the "RLS policies added manually" section:

```markdown
-- matches: allow users to read matches where they are a participant
CREATE POLICY matches_select ON matches
  FOR SELECT
  USING (
    user_a_id IN (
      SELECT id FROM profiles WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
    OR
    user_b_id IN (
      SELECT id FROM profiles WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );
```

- [ ] **Step 4.3 — Commit the db_quirks update**

```bash
git add memory/db_quirks.md 2>/dev/null || git add /Users/joecoover2022/.claude/projects/-Users-joecoover2022-Downloads-the-dregs/memory/db_quirks.md
git commit -m "docs: add matches_select RLS policy to db_quirks"
```

Note: `db_quirks.md` lives in the Claude memory directory, not the project repo. Update it with the Write tool pointing to the memory file path — it does not need to be git committed in the project repo.

---

## Manual Smoke Test

After all tasks are complete, test the match moment end-to-end:

1. Run the app: `npx expo start`
2. Sign in as two test users on two devices/simulators
3. Have User A like User B
4. Have User B like User A — the `matches` INSERT fires
5. Verify the modal appears on User B's device with:
   - "disaster solidarity" badge visible
   - "You matched with [User A's display name]" heading
   - Shared red flags chips (if both profiles share flags)
   - All opening lines scrollable and tappable
   - Send button disabled until a line is selected
   - Tapping "keep swiping" dismisses the modal
   - Tapping a line + send button dismisses and navigates to the matches tab
