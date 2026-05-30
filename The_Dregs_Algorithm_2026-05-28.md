# The Dregs — Matching Algorithm
# Generated: 2026-05-28
#
# This document covers:
#   1. Design philosophy
#   2. Eligibility filtering (who can appear in whose stack)
#   3. Scoring model (how the stack is ranked)
#   4. Desperation Boost interaction
#   5. Second Thoughts (discard pile)
#   6. Stack assembly + pagination
#   7. Supabase Edge Function structure
#   8. Schema additions required
#   9. Worked example
#
# Format: annotated pseudocode + SQL fragments.
# Implementation language: TypeScript (Supabase Edge Function).
# ============================================================


# ============================================================
# 1. DESIGN PHILOSOPHY
# ============================================================
#
# The Dregs is not Hinge. We are not trying to predict compatibility
# or surface "your most likely match." The app's value is in the
# honesty, the chaos, and the humour. Over-optimising the feed
# trains users to tune out everything that doesn't perfectly match
# their preferences, which kills the experience.
#
# So the algorithm has one primary job:
#   Keep the stack feeling fresh, varied, and alive.
#
# And a few secondary jobs:
#   - Respect the hard filters (distance, age, blocks)
#   - Give shared red flags a slight signal boost (they're meaningful)
#   - Reward profiles that are "in the spirit" of the app (higher chaos)
#   - Not bury anyone permanently (recency + Desperation Boost)
#   - Introduce randomness intentionally (prevents filter-bubble lock-in)
#
# What the algorithm deliberately does NOT do:
#   - Filter by chaos score (brief: no chaos score filter)
#   - Filter by employment, relationship structure, flags (brief: minimal filters)
#   - Penalise low chaos score (that's the joke, not a disqualifier)
#   - Personalise beyond shared flags (no collaborative filtering, no ML)
#   - Show profiles in strict popularity order (kills discovery)


# ============================================================
# 2. ELIGIBILITY FILTERING
# (Applied before scoring — these are hard excludes)
# ============================================================
#
# A profile P is ELIGIBLE to appear in user U's discover stack if
# ALL of the following are true:
#
#   E1. P.vibe_check_passed = true
#   E2. P.onboarding_step = 'complete'
#   E3. P.is_visible = true AND P.is_paused = false
#   E4. P.user is not banned (users.is_banned = false)
#   E5. P.user is not soft-deleted (users.deleted_at IS NULL)
#   E6. P is not U (can't see your own profile)
#   E7. U has not already swiped on P
#         EXCEPT: P is in U's Second Thoughts pile
#         (swipes.action = 'pass' AND second_thoughts mode active)
#   E8. No block exists in either direction between U and P
#   E9. Distance: ST_Distance(P.location, U.location) <= U.max_distance_km * 1000
#  E10. Age: P's age is within U's [min_age_pref, max_age_pref] range
#  E11. (Optional filter, off by default)
#        IF U has enabled relationship_structure filter:
#          P.relationship_structure = U's selected preference
#
# Note on E7: Second Thoughts is a separate query path (Section 5).
# The main stack never re-shows passed profiles. Second Thoughts does.
#
# Note on E9/E10: PostGIS handles distance. Age is computed from
# date_of_birth at query time — never stored as an integer.

# SQL fragment — eligibility base query:
# (U = requesting user's profile_id, params supplied by edge function)


```sql
-- ELIGIBILITY BASE QUERY
-- :viewer_id       = requesting user's profile UUID
-- :viewer_user_id  = requesting user's users.id UUID
-- :max_dist_m      = max_distance_km * 1000
-- :min_dob         = current_date - max_age_pref years
-- :max_dob         = current_date - min_age_pref years
-- :rel_filter      = relationship_structure enum or NULL (filter off)
-- :page_size       = how many candidates to fetch (suggest 200)
-- :last_seen_score = for keyset pagination (explained in Section 6)

SELECT
  p.id                    AS profile_id,
  p.chaos_score,
  p.employment_status,
  p.desperation_boost_eligible,
  p.desperation_boost_activated_at,
  u.date_of_birth,
  ST_Distance(p.location, viewer.location) AS distance_m,

  -- Shared red flag count (used in scoring)
  (
    SELECT COUNT(*)
    FROM profile_red_flags prf_them
    JOIN profile_red_flags prf_me
      ON prf_them.red_flag_id = prf_me.red_flag_id
    WHERE prf_them.profile_id = p.id
      AND prf_me.profile_id   = :viewer_id
  ) AS shared_flag_count,

  -- Days since profile was last updated (freshness signal)
  EXTRACT(DAYS FROM now() - p.updated_at) AS days_since_update

FROM profiles p
JOIN users u ON u.id = p.user_id
JOIN profiles viewer ON viewer.id = :viewer_id

WHERE
  -- Hard eligibility (E1–E5)
  p.vibe_check_passed  = true
  AND p.onboarding_step = 'complete'
  AND p.is_visible      = true
  AND p.is_paused       = false
  AND u.deleted_at      IS NULL
  AND u.is_banned       = false

  -- Not self (E6)
  AND p.id != :viewer_id

  -- Not already swiped (E7) — second thoughts handled separately
  AND NOT EXISTS (
    SELECT 1 FROM swipes s
    WHERE s.swiper_id = :viewer_id
      AND s.swiped_id = p.id
  )

  -- No block in either direction (E8)
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = :viewer_id AND b.blocked_id = p.id)
       OR (b.blocker_id = p.id       AND b.blocked_id = :viewer_id)
  )

  -- Distance filter (E9) — only if user has set a location
  AND (
    viewer.location IS NULL
    OR p.location IS NULL
    OR ST_Distance(p.location, viewer.location) <= :max_dist_m
  )

  -- Age filter (E10)
  AND u.date_of_birth BETWEEN :min_dob AND :max_dob

  -- Optional relationship structure filter (E11)
  AND (
    :rel_filter IS NULL
    OR p.relationship_structure = :rel_filter
  )

ORDER BY -- keyset pagination anchor; actual ranking done in app layer
  p.id  -- stable secondary sort

LIMIT :page_size;
```


# ============================================================
# 3. SCORING MODEL
# ============================================================
#
# After eligibility filtering, each candidate gets a STACK SCORE.
# The stack is sorted descending by this score before being served.
#
# The score is computed in the Edge Function (TypeScript), not in SQL,
# because it involves randomness and multi-factor weighting that would
# be cumbersome in pure SQL.
#
# SCORE COMPONENTS
# ────────────────────────────────────────────────────────────
#
# Component A — Chaos Affinity            weight: 30 pts max
#   The app rewards being "in the spirit." Higher chaos scores surface
#   slightly more, but the curve is gentle — we never bury low scores.
#
#   affinity = Math.min(30, Math.floor(candidate.chaos_score * 0.30))
#   (chaos score 97 → 29 pts; chaos score 20 → 6 pts)
#
#   Why 30% weight, not higher? The brief is explicit that low chaos
#   is still a valid presence (the auto-tags are a joke, not a penalty).
#   We want chaos to matter but not dominate.
#
# Component B — Shared Red Flags         weight: 10 pts max
#   Each shared flag = 2 pts, capped at 10.
#   Rationale: the match moment surfaces shared flags specifically.
#   Giving them a small boost makes matches feel less random without
#   becoming a compatibility filter.
#
#   flag_score = Math.min(10, candidate.shared_flag_count * 2)
#
# Component C — Profile Freshness        weight: 10 pts max
#   Profiles updated recently float slightly higher.
#   Prevents long-inactive profiles from permanently dominating.
#
#   freshness = Math.max(0, 10 - Math.floor(candidate.days_since_update / 7))
#   (updated this week → 10 pts; updated 10+ weeks ago → 0 pts)
#
# Component D — Recency Penalty          weight: -15 pts max
#   Profiles the viewer has seen before (but only in the current session,
#   tracked in a seen_this_session set) get gently deprioritised.
#   This prevents the same profiles dominating the top of the stack.
#
#   seen_penalty = seenThisSession.has(candidate.profile_id) ? -15 : 0
#
#   Note: "seen this session" means the card was rendered to the user,
#   not that they swiped. Tracked in memory in the edge function's
#   session state (or a short-lived Supabase KV if cross-device needed).
#
# Component E — Desperation Boost        weight: +25 pts
#   If a candidate has desperation_boost_eligible = true AND
#   desperation_boost_activated_at IS NOT NULL (user paid/unlocked it),
#   they get a flat +25 boost.
#
#   boost = (candidate.desperation_boost_eligible &&
#            candidate.desperation_boost_activated_at) ? 25 : 0
#
#   Why flat? The brief says boost is presentation-only (pulse animation
#   + fire badge) — score doesn't change on the profile itself. But it
#   DOES affect where they appear in other people's stacks. This is the
#   actual mechanism. The profile's own chaos_score is untouched.
#
# Component F — Controlled Randomness    weight: 0–20 pts
#   A random jitter is added to every candidate score. This is the
#   most important component for discovery feel.
#
#   jitter = Math.floor(Math.random() * 20)
#
#   Why randomness? Without it, the top of the stack is always the same
#   profiles in the same order. With a 20-pt jitter against a 75-pt
#   max deterministic score, a profile with chaos score 20 can
#   occasionally appear above one with chaos score 90. That's correct.
#   The app is anti-algorithmic by design.
#
#   The jitter is re-rolled on every stack fetch, not stored.
#   This means refreshing the stack gives a genuinely different order.
#
# ────────────────────────────────────────────────────────────
# TOTAL MAX SCORE: 30 + 10 + 10 + 25 + 20 = 95 pts
# (minus up to 15 for seen-this-session)
# ────────────────────────────────────────────────────────────
#
# TypeScript implementation:


```typescript
// Types
interface Candidate {
  profile_id: string;
  chaos_score: number;          // 12–97
  shared_flag_count: number;
  days_since_update: number;
  desperation_boost_eligible: boolean;
  desperation_boost_activated_at: string | null;
}

interface ScoredCandidate extends Candidate {
  stack_score: number;
  score_breakdown: {
    chaos_affinity: number;
    shared_flags: number;
    freshness: number;
    seen_penalty: number;
    desperation_boost: number;
    jitter: number;
  };
}

function scoreCandidate(
  candidate: Candidate,
  seenThisSession: Set<string>
): ScoredCandidate {
  const chaos_affinity = Math.min(30, Math.floor(candidate.chaos_score * 0.30));
  const shared_flags   = Math.min(10, candidate.shared_flag_count * 2);
  const freshness      = Math.max(0, 10 - Math.floor(candidate.days_since_update / 7));
  const seen_penalty   = seenThisSession.has(candidate.profile_id) ? -15 : 0;
  const desperation_boost = (
    candidate.desperation_boost_eligible &&
    candidate.desperation_boost_activated_at !== null
  ) ? 25 : 0;
  const jitter = Math.floor(Math.random() * 20);

  const stack_score =
    chaos_affinity + shared_flags + freshness +
    seen_penalty + desperation_boost + jitter;

  return {
    ...candidate,
    stack_score,
    score_breakdown: {
      chaos_affinity, shared_flags, freshness,
      seen_penalty, desperation_boost, jitter,
    },
  };
}

function buildStack(
  candidates: Candidate[],
  seenThisSession: Set<string>,
  pageSize: number = 20
): ScoredCandidate[] {
  return candidates
    .map(c => scoreCandidate(c, seenThisSession))
    .sort((a, b) => b.stack_score - a.stack_score)
    .slice(0, pageSize);
}
```


# ============================================================
# 4. DESPERATION BOOST — FULL INTERACTION MODEL
# ============================================================
#
# The brief locks the following:
#   - After 90+ days with zero matches, profile gets pulse animation + 🔥
#   - Score doesn't change on the profile itself
#   - Boost is a presentation change + IAP prompt
#   - "Desperation Boost" costs 150 Chaos Coins
#
# What the brief doesn't specify (and we're locking here):
#   - How eligibility is detected
#   - How the boost actually affects ranking
#   - Duration of the boost
#   - Whether it can be purchased multiple times
#
# LOCKED DECISIONS:
#
# Eligibility detection:
#   A scheduled Edge Function runs daily. It queries:
#     SELECT profile_id FROM profiles p
#     WHERE p.desperation_boost_eligible = false
#       AND p.onboarding_completed_at < now() - interval '90 days'
#       AND NOT EXISTS (
#         SELECT 1 FROM matches m
#         WHERE (m.user_a_id = p.id OR m.user_b_id = p.id)
#           AND m.status != 'unmatched'
#       )
#   Sets desperation_boost_eligible = true on any that qualify.
#   Also fires push notification (see brief: push copy locked).
#
# Boost activation:
#   User must explicitly activate it via IAP (150 coins).
#   Eligibility ≠ activation. Eligible but not activated = pulse animation
#   + fire badge but NO stack score boost. Only activated users get +25.
#   This is intentional: the badge is free; the ranking uplift costs coins.
#
# Boost duration:
#   7 days from activation. After 7 days, desperation_boost_activated_at
#   is nulled by the daily cron. User can buy again.
#   (Stored as desperation_boost_activated_at; edge function checks
#    activated_at + 7 days > now())
#
# Multiple purchases:
#   Yes, can be purchased again after the 7-day window expires.
#   Each purchase resets desperation_boost_activated_at to now().
#   Coins are spent each time. No lifetime cap.
#
# Does a match reset eligibility?
#   Yes. If a user gets a match while boost-eligible, a trigger sets
#   desperation_boost_eligible = false. The boost was working.
#   They'd need another 90 days without a match to re-qualify.
#
# Schema additions for this:
#   profiles.desperation_boost_activated_at  (already in schema)
#   profiles.desperation_boost_eligible      (already in schema)
#   -- No additional columns needed.
#
# Edge function needed:
#   fn: check-desperation-boost (daily cron, see Section 7)


# ============================================================
# 5. SECOND THOUGHTS (DISCARD PILE)
# ============================================================
#
# Second Thoughts shows all profiles U has previously passed,
# in chronological pass order. Full swipe actions available.
# Not a monetisation moment. No limit.
#
# This is a SEPARATE query from the main stack.
# The eligibility filter (E7) excludes passed profiles from the main
# stack — Second Thoughts is where they go instead.
#
# Query:


```sql
-- SECOND THOUGHTS QUERY
-- Returns profiles the viewer has passed, for re-swiping.
-- No scoring — chronological order, oldest pass first.
-- Pagination: cursor-based on swiped_at.
-- Still respects blocks (if blocked after passing, they don't appear).
-- Does NOT respect the age/distance filter — you already saw them.

SELECT
  p.id              AS profile_id,
  p.display_name,
  p.chaos_score,
  s.swiped_at       AS passed_at
FROM swipes s
JOIN profiles p ON p.id = s.swiped_id
JOIN users u    ON u.id = p.user_id
WHERE
  s.swiper_id = :viewer_id
  AND s.action = 'pass'
  AND p.is_visible  = true
  AND p.is_paused   = false
  AND u.deleted_at  IS NULL
  AND u.is_banned   = false
  AND p.vibe_check_passed = true
  -- Respect blocks (can happen after the pass)
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = :viewer_id AND b.blocked_id = p.id)
       OR (b.blocker_id = p.id       AND b.blocked_id = :viewer_id)
  )
  -- Cursor pagination
  AND (:cursor IS NULL OR s.swiped_at > :cursor)
ORDER BY s.swiped_at ASC
LIMIT :page_size;
```

# When the user swipes from Second Thoughts, the swipe row is UPDATED
# (not inserted) — we already have a row with action='pass'.
# UPDATE swipes SET action = :new_action, swiped_at = now()
# WHERE swiper_id = :viewer_id AND swiped_id = :target_id
#
# This preserves the unique(swiper_id, swiped_id) constraint and
# gives us accurate timing on the new action.


# ============================================================
# 6. STACK ASSEMBLY + PAGINATION
# ============================================================
#
# The main stack is not infinite — it's a pre-fetched buffer.
# The edge function fetches a batch of eligible candidates (e.g. 200),
# scores them in memory, sorts, and returns the top N (e.g. 20) to
# the client. The client holds these 20 in a local queue.
#
# When the local queue drops below 5 cards, the client calls the
# edge function again for the next batch.
#
# This pattern avoids per-swipe API calls while keeping the stack fresh.
#
# PAGINATION APPROACH: exclude-already-fetched
#
# Problem with offset pagination: if new profiles join or old ones get
# removed, offset=20 returns different results than expected.
#
# Solution: the edge function receives a list of profile IDs the client
# has already been served this session. These are excluded from the
# next batch query with:
#   AND p.id != ALL(:already_served_ids)
#
# The client maintains this list in memory (or AsyncStorage).
# On cold start, the list is empty and scoring/jitter handles ordering.
#
# SESSION EXPIRY:
# After 2 hours of inactivity (or explicit app kill), the already_served
# list is cleared. This means reopening the app can show profiles you've
# already seen but not swiped — correct behaviour, since you haven't
# made a decision on them yet.
#
# EMPTY STATE:
# If the eligible pool is exhausted (all profiles in range have been
# swiped), return an empty array. Client shows:
# "you've seen everyone. they've seen you. ball's in someone's court."


# ============================================================
# 7. MATCH CREATION
# ============================================================
#
# A match is created when:
#   User A likes User B  AND  User B has already liked User A
#   (mutual like detected on swipe insert)
#
# The Edge Function handling swipe inserts checks for a reciprocal like:

```typescript
async function handleSwipe(
  supabase: SupabaseClient,
  swiperId: string,
  swipedId: string,
  action: 'like' | 'pass' | 'ick',
  targetedFlagId?: string,
  butWhyTag?: string
): Promise<{ matched: boolean; matchId?: string }> {

  // 1. Record the swipe
  await supabase.from('swipes').upsert({
    swiper_id:        swiperId,
    swiped_id:        swipedId,
    action,
    swiped_at:        new Date().toISOString(),
    targeted_flag_id: targetedFlagId ?? null,
    but_why_tag:      butWhyTag ?? null,
  });

  // 2. Update ick count if applicable
  if (action === 'ick' && targetedFlagId) {
    await supabase.rpc('increment_ick_count', {
      p_profile_id:  swipedId,
      p_flag_id:     targetedFlagId,
    });
  }

  // 3. Update but_why aggregate if applicable
  if (action === 'like' && butWhyTag) {
    await supabase.rpc('increment_but_why', {
      p_profile_id: swipedId,
      p_tag_slug:   butWhyTag,
    });
  }

  // 4. Check for mutual like (only on 'like' action)
  if (action !== 'like') return { matched: false };

  const { data: reciprocal } = await supabase
    .from('swipes')
    .select('id')
    .eq('swiper_id', swipedId)
    .eq('swiped_id', swiperId)
    .eq('action', 'like')
    .maybeSingle();

  if (!reciprocal) return { matched: false };

  // 5. Create match (canonical ordering: lower UUID first)
  const userA = swiperId < swipedId ? swiperId : swipedId;
  const userB = swiperId < swipedId ? swipedId : swiperId;

  const { data: match } = await supabase
    .from('matches')
    .insert({
      user_a_id:  userA,
      user_b_id:  userB,
      status:     'active',
      matched_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  // 6. Insert system message for match moment screen
  await supabase.from('messages').insert({
    match_id:       match.id,
    sender_id:      swiperId,  // convention: last swiper "sends" the system msg
    message_type:   'system',
    system_payload: { type: 'match_created' },
  });

  // 7. Push notifications (both users)
  await sendMatchNotifications(supabase, swiperId, swipedId, match.id);

  return { matched: true, matchId: match.id };
}
```

# SHARED FLAGS AT MATCH MOMENT
# The match moment screen surfaces shared red flags between the two users.
# This is a simple query at match creation time — no need to store it:

```sql
SELECT rf.id, rf.slug, rf.label, rf.is_certified_chaotic
FROM profile_red_flags prf_a
JOIN profile_red_flags prf_b ON prf_a.red_flag_id = prf_b.red_flag_id
JOIN red_flags rf ON rf.id = prf_a.red_flag_id
WHERE prf_a.profile_id = :user_a_id
  AND prf_b.profile_id = :user_b_id;
```


# ============================================================
# 8. SUPABASE EDGE FUNCTIONS REQUIRED
# ============================================================
#
# fn: get-discover-stack
#   Trigger: client request (GET)
#   Inputs:  viewer_id, already_served_ids[], filters
#   Does:    runs eligibility query, scores, returns top N
#   Returns: ScoredCandidate[] with profile preview data
#   Notes:   uses service role key; bypasses RLS for query performance;
#            re-applies block check in SQL to protect privacy
#
# fn: record-swipe
#   Trigger: client request (POST)
#   Inputs:  swiper_id, swiped_id, action, targeted_flag_id?, but_why_tag?
#   Does:    inserts/updates swipe row, checks for mutual like,
#            creates match if so, sends push notifications
#   Returns: { matched: boolean, matchId?: string, sharedFlags?: Flag[] }
#
# fn: check-match-expiry  [CRON: every hour]
#   Trigger: scheduled
#   Does:    finds matches where last_message_at < now() - 23 days
#            (7-day warning) and last_message_at < now() - 30 days (expire)
#            Updates match status, sends push notifications
#            Sets expires_at, expired_at, door_knock_target (random 200–800)
#
# fn: check-silence-detector  [CRON: every 6 hours]
#   Trigger: scheduled
#   Does:    finds active matches where neither user has messaged in 7 days
#            AND both have 'matches_and_never_messages' flag
#            Sets status='silent', fires push notification (once only)
#
# fn: check-desperation-boost  [CRON: daily at 02:00 UTC]
#   Trigger: scheduled
#   Does:    finds profiles eligible for Desperation Boost (90 days, no match)
#            Sets desperation_boost_eligible=true
#            Fires push notification
#            Also expires activated boosts older than 7 days
#
# fn: record-door-knock
#   Trigger: client request (POST)
#   Inputs:  match_id, knocker_id, tap_count (batch taps, not 1-by-1)
#   Does:    increments door_knock_count, checks if >= door_knock_target,
#            opens door if so, sends push to other user,
#            awards Desperation Points for knocking (capped at 20/day
#            against the knock tap daily allowance — shared with
#            vibe check knock mechanic)
#
# fn: answer-door-early
#   Trigger: client request (POST)
#   Inputs:  match_id, answerer_id, reason
#   Does:    sets door_status='open', door_early_answer_reason,
#            door_opened_at, sends push to knocker with reason
#
# fn: compute-chaos-score
#   Trigger: called internally by profile save (also available as
#            a direct endpoint for onboarding score preview)
#   Inputs:  profile_id
#   Does:    calls the SQL compute_chaos_score() function
#   Returns: { score: number }
#   Notes:   the SQL trigger handles the save path; this endpoint
#            is for the real-time score bar in onboarding UI
#
# fn: delete-account
#   Trigger: client request (DELETE, requires auth + typed "delete")
#   Does:    in a transaction:
#            - deletes all messages for user's matches
#            - deletes all matches
#            - deletes all swipes (both directions)
#            - deletes photos from Supabase Storage
#            - deletes voice notes from Storage
#            - deletes profile row (cascades to: photos, flags, prompts,
#              ex_entries, pet, pet_cosmetics, saved_profiles, blocks,
#              push_tokens, dp_ledger, cc_ledger, skins, but_why)
#            - deletes users row
#            - updates user_account_history (hashed email, increments count)
#            - revokes auth.users entry
#   Returns: 200 OK
#   Notes:   service role only; all cascades defined in schema
#
# fn: process-iap-receipt
#   Trigger: client request (POST) after Apple StoreKit purchase
#   Inputs:  apple_transaction_id, product_id, receipt_data
#   Does:    validates with Apple's verifyReceipt endpoint,
#            records in iap_receipts,
#            for coins: credits chaos_coins_ledger,
#            for subscription: upserts subscriptions row,
#            for chaos pack: calls open-chaos-pack
#
# fn: open-chaos-pack
#   Trigger: called by process-iap-receipt, or directly for coin packs
#   Inputs:  user_id, tier
#   Does:    runs weighted random roll per tier odds (brief has them),
#            records in chaos_pack_openings,
#            credits any coin rewards to ledger,
#            adds any cosmetics to pet_cosmetics or profile_skins
#   Returns: { rewards: Reward[] }


# ============================================================
# 9. SCHEMA ADDITIONS REQUIRED
# (Things the algorithm needs that aren't in the base schema)
# ============================================================
#
# All of these are small and additive — the base schema handles them
# already or nearly so. Confirmed additions:
#
# 1. increment_ick_count() — SQL function for atomic ick count update


```sql
-- Atomic ick count increment (safe for concurrent updates)
CREATE OR REPLACE FUNCTION increment_ick_count(
  p_profile_id uuid,
  p_flag_id    uuid
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO red_flag_ick_counts (profile_id, red_flag_id, ick_count)
  VALUES (p_profile_id, p_flag_id, 1)
  ON CONFLICT (profile_id, red_flag_id)
  DO UPDATE SET ick_count = red_flag_ick_counts.ick_count + 1;
END; $$;

-- Atomic but_why aggregate increment
CREATE OR REPLACE FUNCTION increment_but_why(
  p_profile_id uuid,
  p_tag_slug   text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO but_why_aggregates (profile_id, tag_slug, count)
  VALUES (p_profile_id, p_tag_slug, 1)
  ON CONFLICT (profile_id, tag_slug)
  DO UPDATE SET count = but_why_aggregates.count + 1;
END; $$;

-- Trigger: when a match is created, reset desperation_boost_eligible
-- (they got a match; the boost worked; they need to re-qualify)
CREATE OR REPLACE FUNCTION trigger_match_resets_boost()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET desperation_boost_eligible      = false,
      desperation_boost_activated_at  = NULL
  WHERE id IN (NEW.user_a_id, NEW.user_b_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER match_created_reset_boost
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION trigger_match_resets_boost();

-- Trigger: chaos score recompute when ex_entries added/removed
-- (ex count affects score; entries have soft delete so we watch both)
CREATE OR REPLACE FUNCTION trigger_ex_entries_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_pid uuid;
BEGIN
  v_pid := coalesce(NEW.profile_id, OLD.profile_id);
  UPDATE profiles
  SET chaos_score            = compute_chaos_score(v_pid),
      chaos_score_updated_at = now()
  WHERE id = v_pid;
  RETURN NULL;
END; $$;

CREATE TRIGGER ex_entries_chaos_update
  AFTER INSERT OR UPDATE OF deleted_at ON ex_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_ex_entries_changed();

-- Trigger: chaos score recompute when photos added/removed
CREATE OR REPLACE FUNCTION trigger_photos_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_pid uuid;
BEGIN
  v_pid := coalesce(NEW.profile_id, OLD.profile_id);
  UPDATE profiles
  SET chaos_score            = compute_chaos_score(v_pid),
      chaos_score_updated_at = now()
  WHERE id = v_pid;
  RETURN NULL;
END; $$;

CREATE TRIGGER profile_photos_chaos_update
  AFTER INSERT OR DELETE ON profile_photos
  FOR EACH ROW EXECUTE FUNCTION trigger_photos_changed();

-- Trigger: chaos score recompute when prompts added/removed
CREATE OR REPLACE FUNCTION trigger_prompts_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_pid uuid;
BEGIN
  v_pid := coalesce(NEW.profile_id, OLD.profile_id);
  UPDATE profiles
  SET chaos_score            = compute_chaos_score(v_pid),
      chaos_score_updated_at = now()
  WHERE id = v_pid;
  RETURN NULL;
END; $$;

CREATE TRIGGER profile_prompts_chaos_update
  AFTER INSERT OR DELETE ON profile_prompts
  FOR EACH ROW EXECUTE FUNCTION trigger_prompts_changed();
```


# ============================================================
# 10. WORKED EXAMPLE
# ============================================================
#
# User: Alex, profile_id = "abc", chaos score 45
# Location: London. Distance filter: 30km. Age pref: 25–40.
# Red flags selected: emotionally_unavailable, has_a_podcast, cries_at_adverts
#
# Eligible pool (after E1–E11 filtering): 80 profiles returned by SQL.
# already_served_ids: [5 profiles from earlier this session]
#
# Three candidates from the pool, for illustration:
#
# Candidate 1 — Sam, chaos 78, 2 shared flags, updated 3 days ago,
#               no boost, not seen this session
#   chaos_affinity  = min(30, floor(78 * 0.30))  = 23
#   shared_flags    = min(10, 2 * 2)              = 4
#   freshness       = max(0, 10 - floor(3/7))     = 10
#   seen_penalty    = 0
#   boost           = 0
#   jitter          = 14  (random)
#   TOTAL           = 51
#
# Candidate 2 — Jordan, chaos 22, 0 shared flags, updated 60 days ago,
#               boost ACTIVE, not seen this session
#   chaos_affinity  = min(30, floor(22 * 0.30))  = 6
#   shared_flags    = 0
#   freshness       = max(0, 10 - floor(60/7))   = 0
#   seen_penalty    = 0
#   boost           = 25  (boost active)
#   jitter          = 7   (random)
#   TOTAL           = 38
#
# Candidate 3 — Riley, chaos 55, 1 shared flag, updated 10 days ago,
#               no boost, SEEN this session already
#   chaos_affinity  = min(30, floor(55 * 0.30))  = 16
#   shared_flags    = min(10, 1 * 2)             = 2
#   freshness       = max(0, 10 - floor(10/7))   = 9
#   seen_penalty    = -15  (seen this session)
#   boost           = 0
#   jitter          = 19  (random)
#   TOTAL           = 31
#
# Stack order: Sam (51) → Jordan (38) → Riley (31)
#
# Key observations:
# - Jordan's Desperation Boost puts them above Riley despite lower chaos
#   and no shared flags — the boost is meaningful but not overwhelming
# - Riley's seen_penalty hurts but the jitter means on a different
#   session roll they might outrank Jordan
# - A fourth candidate with chaos 97, 5 shared flags, updated today,
#   no boost, not seen: 29 + 10 + 10 + 0 + 0 + jitter = 49–68
#   They'd likely top the stack but jitter keeps it probabilistic


# ============================================================
# 11. THINGS DELIBERATELY NOT IN THE ALGORITHM
# ============================================================
#
# Not included — and intentionally so:
#
# • Mutual likes visibility: non-subscribers can't see who liked them.
#   This has no effect on stack ordering — we don't boost profiles
#   who have liked you. We could, but it would reward superficial
#   engagement over genuine discovery. Brief doesn't specify this
#   and the answer should stay no.
#
# • Chaos score filtering: brief explicitly prohibits it. Someone
#   with chaos score 15 ("slumming it" tourist) absolutely appears
#   in the stack. Their auto-tag is the joke, not their invisibility.
#
# • Collaborative filtering / "people like you also liked":
#   Would require much more data and would create filter bubbles.
#   Not appropriate for early stage. Revisit at scale.
#
# • Penalising Ick'd profiles: if a profile gets a lot of Icks,
#   should they rank lower? No. Icks are part of the culture.
#   More Icks = their flags float higher on their OWN profile.
#   It has no effect on who sees them.
#
# • Location weighting (closer = higher score): we filter by max
#   distance, but within that radius all distances are equal.
#   Adding a proximity boost would cluster everyone around dense
#   urban areas and punish rural users. Hard filter only.
#
# • Time-of-day signals: who's online right now, last_active, etc.
#   Not tracking online status — adds complexity, raises privacy
#   concerns, and the brief doesn't mention it. Skip.


# ============================================================
# 12. PERFORMANCE NOTES
# ============================================================
#
# The eligibility query hits:
#   profiles.location (PostGIS GiST index) — distance filter
#   profiles.(is_visible, is_paused, vibe_check_passed) — composite index
#   swipes(swiper_id) — NOT EXISTS subquery
#   blocks(blocker_id, blocked_id) — both indexed
#
# The shared_flag_count subquery is a correlated subquery per candidate.
# At early scale (<10k users) this is fine. At scale, materialise it:
#   Add shared_flag_counts to a cache table, updated by trigger.
#   Or compute shared flag count in a single unnested query and join.
#
# The scoring (Component A–F) runs in TypeScript, not SQL.
# At 200 candidates * 6 arithmetic operations = 1200 ops in memory.
# Negligible. This is the right call — SQL randomness functions are
# awkward and the TypeScript is readable.
#
# Stack fetch frequency: the client buffers 20 cards and refetches
# at 5 remaining. Average user sees ~40–60 cards per session.
# That's 2–3 edge function calls per session. Fine.

# ============================================================
# END OF ALGORITHM DOCUMENT
# ============================================================
