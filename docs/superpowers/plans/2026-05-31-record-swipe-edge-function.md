# record-swipe Edge Function — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the `record-swipe` Supabase Edge Function so that swiping creates match rows when two users mutually like each other, replacing the current direct `swipes` table insert in `lib/discover.ts`.

**Architecture:** New Edge Function at `supabase/functions/record_swipe/index.ts`. The app calls it via `supabase.functions.invoke('record_swipe', { body: {...} })`. The function inserts the swipe, checks for a reciprocal like, and creates a match row if found — all in one atomic operation. `lib/discover.ts` `recordSwipe` is updated to call the function instead of inserting directly.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Supabase JS client (service role), Expo/React Native client

---

## Context

### Why this matters

Match creation is currently broken. `lib/discover.ts` `recordSwipe` does a direct insert into the `swipes` table — it bypasses the Edge Function entirely. The mutual like check never runs, so no matches are ever created, and the match moment modal never fires.

### Spec reference

Full spec: `The_Dregs_EdgeFunctions_2026-05-28.md` § "2. record-swipe" (line 77).

Key logic from spec:
1. Resolve swiper `profile_id` from JWT
2. Validate `swiped_id` exists, is visible, not blocked
3. Check daily swipe limit (free tier: 20/day; bonus swipes consumed first). If cap hit → 429 `{ swipe_limit_reached: true }`
4. Upsert swipe row (ON CONFLICT handles Second Thoughts re-swipes)
5. If `ick` + `targeted_flag_id`: call `increment_ick_count()`, send targeted push
6. If `ick` + no flag: send general ick push
7. If `like` + `but_why_tag`: call `increment_but_why()`
8. If `like`: check reciprocal like. If found → create match row, return `{ recorded: true, matched: true, match_id, shared_flags }`

Returns:
- `{ recorded: true, matched: false }` — normal swipe
- `{ recorded: true, matched: true, match_id: uuid, shared_flags: [...] }` — mutual like

### What already exists

- `supabase/functions/assemble_stack/index.ts` — reference implementation for Edge Function structure, Supabase client setup, JWT auth pattern
- `lib/discover.ts` `recordSwipe` — currently does direct insert; needs to be replaced with `supabase.functions.invoke`
- `app/(tabs)/index.tsx` — realtime subscription already wired for match detection; it can stay as-is since the match row insert (from the Edge Function) will trigger the realtime event

### Existing DB functions available (callable from Edge Function via SQL)

- `increment_ick_count(flag_id)` — increments ick count on a red flag
- `increment_but_why(tag, swiper_id, swiped_id)` — check schema for exact signature
- `get_match(p_user_a, p_user_b)` — looks up existing match for two profiles

### Swipe limit note

For development/testing: implement the daily swipe limit check but make it configurable or skippable via an env var `DISABLE_SWIPE_LIMIT=true`. This avoids blocking testing while keeping the production logic in place.

### Match row insertion

Matches table uses `least()`/`greatest()` pattern for consistent ordering:
```sql
INSERT INTO matches (user_a_id, user_b_id)
VALUES (least(swiper_id, swiped_id), greatest(swiper_id, swiped_id))
ON CONFLICT DO NOTHING;
```

### Shared flags

On match creation, compute shared red flags (flags both profiles have in common) and return them in the response. This allows the client to pass them to the match moment modal immediately rather than fetching separately. The `fetchMatchMomentData` function in `lib/matches.ts` already does this client-side — the Edge Function can do the same query server-side.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/record_swipe/index.ts` | Edge Function — swipe recording + match creation |
| Modify | `lib/discover.ts` | Replace direct insert with `supabase.functions.invoke('record_swipe', ...)` |
| Modify | `app/(tabs)/index.tsx` | Optionally use `matched` + `match_id` from response to show modal immediately (faster than waiting for realtime) |

---

## Task 1: Edge Function — `supabase/functions/record_swipe/index.ts`

**Files:**
- Create: `supabase/functions/record_swipe/index.ts`

Look at `supabase/functions/assemble_stack/index.ts` for the exact pattern: Deno imports, Supabase client with service role key, JWT auth, CORS headers.

- [ ] **Step 1.1 — Create the function**

```ts
// supabase/functions/record_swipe/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // copy pattern from assemble_stack

interface RecordSwipeBody {
  swiped_id: string
  action: 'like' | 'pass' | 'ick'
  targeted_flag_id?: string | null
  but_why_tag?: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Resolve swiper profile_id from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!userData) return new Response('User not found', { status: 404 })

    const { data: swiperProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userData.id)
      .single()
    if (!swiperProfile) return new Response('Profile not found', { status: 404 })

    const swiperId = swiperProfile.id
    const body: RecordSwipeBody = await req.json()
    const { swiped_id, action, targeted_flag_id, but_why_tag } = body

    // Validate swiped profile exists and is visible
    const { data: swipedProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', swiped_id)
      .eq('is_visible', true)
      .eq('vibe_check_passed', true)
      .single()
    if (!swipedProfile) return new Response('Profile not found or not visible', { status: 404 })

    // Daily swipe limit (skip if DISABLE_SWIPE_LIMIT=true)
    if (Deno.env.get('DISABLE_SWIPE_LIMIT') !== 'true') {
      const today = new Date().toISOString().slice(0, 10)
      const { count } = await supabase
        .from('swipes')
        .select('id', { count: 'exact', head: true })
        .eq('swiper_id', swiperId)
        .gte('swiped_at', today)
      if ((count ?? 0) >= 20) {
        return new Response(
          JSON.stringify({ swipe_limit_reached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
        )
      }
    }

    // Upsert swipe row
    await supabase.from('swipes').upsert(
      {
        swiper_id: swiperId,
        swiped_id,
        action,
        targeted_flag_id: targeted_flag_id ?? null,
        but_why_tag: but_why_tag ?? null,
      },
      { onConflict: 'swiper_id,swiped_id' },
    )

    // Ick side effects
    if (action === 'ick' && targeted_flag_id) {
      await supabase.rpc('increment_ick_count', { p_flag_id: targeted_flag_id, p_profile_id: swiped_id })
    }

    // Like: check for reciprocal like → create match
    if (action === 'like') {
      const { data: reciprocal } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', swiped_id)
        .eq('swiped_id', swiperId)
        .eq('action', 'like')
        .maybeSingle()

      if (reciprocal) {
        // Create match (idempotent)
        const userA = swiperId < swiped_id ? swiperId : swiped_id
        const userB = swiperId < swiped_id ? swiped_id : swiperId

        const { data: match } = await supabase
          .from('matches')
          .upsert({ user_a_id: userA, user_b_id: userB }, { onConflict: 'user_a_id,user_b_id', ignoreDuplicates: true })
          .select('id')
          .single()

        // Compute shared flags
        const { data: flagRows } = await supabase
          .from('profile_red_flags')
          .select('profile_id, red_flags(id, label)')
          .in('profile_id', [swiperId, swiped_id])

        const swiperFlagIds = new Set(
          (flagRows ?? [])
            .filter((r: any) => r.profile_id === swiperId)
            .map((r: any) => r.red_flags.id)
        )
        const sharedFlags = (flagRows ?? [])
          .filter((r: any) => r.profile_id === swiped_id && swiperFlagIds.has(r.red_flags.id))
          .map((r: any) => ({ id: r.red_flags.id, label: r.red_flags.label }))

        return new Response(
          JSON.stringify({ recorded: true, matched: true, match_id: match?.id, shared_flags: sharedFlags }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    return new Response(
      JSON.stringify({ recorded: true, matched: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('record_swipe error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

- [ ] **Step 1.2 — Check if `_shared/cors.ts` exists**

```bash
ls supabase/functions/_shared/ 2>/dev/null || echo "missing"
```

If missing, create `supabase/functions/_shared/cors.ts` matching the pattern in `assemble_stack` (look at how it imports cors headers).

- [ ] **Step 1.3 — Deploy the function**

```bash
npx supabase functions deploy record_swipe --project-ref uhqulmxdcjkpxbxsatug
```

- [ ] **Step 1.4 — Set env var for dev (disable swipe limit)**

In Supabase dashboard → Edge Functions → record_swipe → Secrets, add:
```
DISABLE_SWIPE_LIMIT=true
```

Or via CLI:
```bash
npx supabase secrets set DISABLE_SWIPE_LIMIT=true --project-ref uhqulmxdcjkpxbxsatug
```

- [ ] **Step 1.5 — Commit**

```bash
git add supabase/functions/record_swipe/ supabase/functions/_shared/
git commit -m "feat: add record_swipe edge function with match creation"
```

---

## Task 2: Update `lib/discover.ts` to call the Edge Function

**Files:**
- Modify: `lib/discover.ts`

- [ ] **Step 2.1 — Update `recordSwipe`**

Replace the current `recordSwipe` function:

```ts
// Current (direct insert — bypasses match creation):
export async function recordSwipe(params: {
  swiperProfileId: string;
  swipedProfileId: string;
  action: SwipeAction;
  targetedFlagId?: string | null;
  butWhyTag?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('swipes').upsert(...)
  if (error) throw error;
}
```

Replace with:

```ts
export type RecordSwipeResult = {
  recorded: boolean;
  matched: boolean;
  matchId?: string;
  sharedFlags?: Array<{ id: string; label: string }>;
};

export async function recordSwipe(params: {
  swiperProfileId: string;
  swipedProfileId: string;
  action: SwipeAction;
  targetedFlagId?: string | null;
  butWhyTag?: string | null;
}): Promise<RecordSwipeResult> {
  const { data, error } = await supabase.functions.invoke<RecordSwipeResult>('record_swipe', {
    body: {
      swiped_id: params.swipedProfileId,
      action: params.action,
      targeted_flag_id: params.targetedFlagId ?? null,
      but_why_tag: params.butWhyTag ?? null,
    },
  });
  if (error) throw error;
  if (!data) throw new Error('record_swipe returned no data');
  return data;
}
```

- [ ] **Step 2.2 — Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors (callers of `recordSwipe` currently ignore the return value — that's fine, `Promise<RecordSwipeResult>` is backward compatible since callers use `await recordSwipe(...)` without capturing the result).

- [ ] **Step 2.3 — Commit**

```bash
git add lib/discover.ts
git commit -m "feat: recordSwipe calls record_swipe edge function"
```

---

## Task 3: Use match response to show modal immediately (optional optimisation)

**Files:**
- Modify: `app/(tabs)/index.tsx`

The realtime subscription will fire and show the modal, but there's a small delay. Since the Edge Function returns `matched: true` + `match_id` + `shared_flags` immediately on the swipe that creates the match, we can show the modal right away on the swiper's device without waiting for realtime.

- [ ] **Step 3.1 — Use the return value in `handleSwipe`**

In `app/(tabs)/index.tsx`, `handleSwipe` currently calls `recordSwipe` without using the return value. Update it:

```ts
if (viewerProfileIdRef.current && direction === 'like') {
  const result = await recordSwipe({
    swiperProfileId: viewerProfileIdRef.current,
    swipedProfileId: profileId,
    action: direction,
    targetedFlagId: selectedFlagId,
  });
  if (result.matched && result.matchId) {
    // Show modal immediately on the swiper's side
    // The other user sees it via realtime
    fetchMatchMomentData(result.matchId, viewerProfileIdRef.current)
      .then(data => setPendingMatch(data))
      .catch(err => console.error('fetchMatchMomentData error:', err));
  }
} else if (viewerProfileIdRef.current) {
  await recordSwipe({
    swiperProfileId: viewerProfileIdRef.current,
    swipedProfileId: profileId,
    action: direction,
    targetedFlagId: selectedFlagId,
  });
}
```

Note: the realtime subscription will also fire for the swiper, potentially showing the modal twice. Guard against this by checking `pendingMatchRef.current` before calling `fetchMatchMomentData` (already handled by the queue logic).

- [ ] **Step 3.2 — Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3.3 — Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: show match modal immediately from swipe response"
```

---

## Manual Smoke Test

1. Two simulators, two accounts, both on Discover
2. User A swipes right on User B
3. User B swipes right on User A
4. Verify:
   - Match row appears in DB: `SELECT id, user_a_id, user_b_id, matched_at FROM matches ORDER BY matched_at DESC LIMIT 1;`
   - Match moment modal fires on **both** devices
   - Shared red flags shown if both profiles share flags
   - "keep swiping" dismisses modal
   - Tapping a line + send navigates to matches tab

---

## Notes

- The `increment_ick_count` RPC signature — check the actual function name/params in the schema before deploying. Search for it in `20260528000000_initial_schema.sql`.
- The `matches` table unique constraint is on `(user_a_id, user_b_id)` — verify this in the schema before using `onConflict`. If no unique constraint exists, add `ON CONFLICT DO NOTHING` via raw SQL in the RPC or handle the insert differently.
- Push notifications for new matches are out of scope for this plan — wire them in a separate session once Expo push tokens are set up.
