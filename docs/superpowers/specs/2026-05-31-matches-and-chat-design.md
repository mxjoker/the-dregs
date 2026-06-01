# Matches List + Chat — Design Spec

**Date:** 2026-05-31

## Overview

Replace the matches tab stub with a real matches list, and add a chat screen for each match. Scoped to basic text messaging — door mechanic, voice notes, digital gifts, and expiry/silence tracking are out of scope for this session.

---

## Screens

### 1. Matches List (`app/(tabs)/two.tsx`)

Replaces the current placeholder.

**Data source:** `matches_with_context` view, filtered to rows where `user_a_id = viewerProfileId OR user_b_id = viewerProfileId`, ordered by `last_message_at DESC NULLS LAST, matched_at DESC`.

**Each row shows:**
- Initials avatar (first letter of other person's `display_name`, colored circle)
- Display name
- Subtitle: last message preview (truncated to ~40 chars) or "matched [X] days ago" if no messages yet
- Tapping a row navigates to `app/matches/[matchId]`

**Empty state:** "no disasters yet. keep swiping." (italic, muted)

**Loading state:** spinner while fetching

Dev buttons (sign out, skip onboarding) are preserved at the bottom.

---

### 2. Chat Screen (`app/matches/[matchId].tsx`)

New screen, navigated to from the matches list or the match moment modal.

**Header:** other person's display name (back button via Expo Router default)

**Message list:**
- FlatList, `inverted` so newest messages appear at the bottom
- Each message: sender-aligned (right = viewer, left = other), bubble with body text and timestamp
- Only `message_type = 'text'` for now; non-text messages show a placeholder "(unsupported message)"
- Messages fetched on mount, newest 50 first, then paginated on scroll

**Realtime:**
- Subscribe to `INSERT` on `messages` table filtered to `match_id = matchId`
- New messages appended to top of inverted list in real time

**Input:**
- Text input + send button at bottom (above keyboard)
- Send inserts into `messages` (sender_id = viewerProfileId, match_id, body)
- After send: clear input, optimistic update (append to message list immediately)

**Match moment modal navigation:**
- "send a disaster opening line" in `MatchMomentModal` currently navigates to `/(tabs)/matches`
- Update it to navigate to `app/matches/[matchId]` when `matchId` is available

---

## Data layer (`lib/matches.ts`)

Add to existing file (keep `fetchMatchMomentData` as-is):

```ts
export type MatchListItem = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  otherPhotoUrl: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  matchedAt: string;
};

export async function fetchMatches(viewerProfileId: string): Promise<MatchListItem[]>

export type Message = {
  id: string;
  matchId: string;
  senderId: string;
  body: string | null;
  messageType: string;
  sentAt: string;
};

export async function fetchMessages(matchId: string, limit?: number): Promise<Message[]>

export async function sendMessage(params: {
  matchId: string;
  senderId: string;
  body: string;
}): Promise<Message>
```

`fetchMatches` queries `matches_with_context` and the most recent message per match via a join or separate query.

---

## Navigation

- `app/matches/[matchId].tsx` — new file, Expo Router dynamic route
- No new tab; chat is a stack screen pushed on top of the matches tab
- Back button returns to matches list

---

## Out of scope

- Door mechanic (door_status, knocking, opening)
- Pre-match messages
- Voice notes, digital gifts
- Expiry / silence tracking
- Unread counts / badges
- Read receipts
- Message deletion
- Reporting individual messages
