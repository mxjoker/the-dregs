# The Dregs — Supabase Edge Functions
# Generated: 2026-05-28
#
# This document covers every Edge Function the app needs,
# in the order they'd typically be built.
#
# Format per function:
#   - Purpose
#   - Trigger (HTTP | CRON)
#   - Auth requirement
#   - Inputs
#   - Logic (step by step)
#   - Returns
#   - Error cases
#   - Notes / gotchas
#
# All functions use the Supabase service role key internally.
# Client-facing functions additionally verify the user's JWT.
# Cron functions have no client auth — they run as service role only.
# ============================================================


# ============================================================
# 1. get-discover-stack
# ============================================================
# Purpose:
#   Returns the next batch of scored, eligible profiles for the
#   discover screen. Client buffers 20 cards and calls this again
#   when the queue drops below 5.
#
# Trigger: HTTP POST (client)
# Auth: JWT required
#
# Input (JSON body):
#   {
#     already_served_ids: string[],  // profile UUIDs served this session
#     filters: {
#       max_distance_km?: number,
#       min_age?: number,
#       max_age?: number,
#       relationship_structure?: string | null
#     }
#   }
#
# Logic:
#   1. Resolve viewer profile_id from JWT → users → profiles
#   2. Load viewer location, default distance/age prefs
#   3. Override prefs with any supplied filters
#   4. Run eligibility SQL (algorithm doc Section 2),
#      excluding already_served_ids, fetch up to 200 candidates
#   5. Score each in TypeScript via scoreCandidate()
#   6. Sort descending, take top 20
#   7. For each: load preview data (first photo, display_name,
#      chaos_score, employment_status, red_flags[], one prompt
#      answer, pet widget data)
#   8. Return array
#
# Returns:
#   { profiles: ProfilePreview[], total_eligible: number }
#   total_eligible = raw pre-scoring count, used for empty state
#
# Error cases:
#   - No profile for JWT user → 404
#   - Onboarding incomplete → 403
#   - vibe_check_passed = false → 403
#   - Location null → return without distance filter, log warning
#   - Free tier swipe cap reached → { profiles: [], swipe_limit_reached: true }
#
# Notes:
#   - score_breakdown never returned to client (no gaming the algo)
#   - Subscriber check hits subscriptions table, not profiles.is_subscribed
#   - Bonus swipes checked here: (swipes_today < 20 OR bonus_swipes_balance > 0)
#     Bonus swipes consumed first, don't count against the daily 20


# ============================================================
# 2. record-swipe
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#
# Input:
#   {
#     swiped_id:        string,
#     action:           'like' | 'pass' | 'ick',
#     targeted_flag_id?: string,
#     but_why_tag?:      string
#   }
#
# Logic:
#   1. Resolve swiper profile_id from JWT
#   2. Validate swiped_id exists, visible, not blocked
#   3. Check daily swipe limit (free tier: 20/day, bonus swipes first)
#      If cap hit → 429 { swipe_limit_reached: true }
#   4. Upsert swipe row (ON CONFLICT handles Second Thoughts re-swipes)
#   5. If ick + targeted_flag_id: increment_ick_count(), send targeted push
#   6. If ick + no flag: send general ick push
#   7. If like + but_why_tag: increment_but_why()
#   8. If like: check reciprocal like. If found, run match creation inline.
#
# Returns:
#   { recorded: true, matched: false }
#   { recorded: true, matched: true, match_id: uuid, shared_flags: [...] }
#
# Notes:
#   - Match creation inlined to keep atomic
#   - Swipe count: COUNT(*) FROM swipes WHERE swiper_id=x AND date=today


# ============================================================
# 3. compute-chaos-score
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#
# Purpose: Real-time score preview during onboarding UI.
# SQL trigger handles saves — this is for the live score bar
# before the user hits save.
#
# Input:  { profile_id: string }
# Logic:  Calls SQL compute_chaos_score() function directly
# Returns: { score: number }  — clamped 12–97 in SQL


# ============================================================
# 4. record-door-knock
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#
# Input:
#   { match_id: string, tap_count: number }
#   Client batches taps — not one request per tap.
#
# Logic:
#   1. Verify knocker is a participant in this match
#   2. Verify match status = 'expired' or door_status = 'knocking'
#   3. If first knock: set door_status='knocking', door_knocked_by,
#      send "X is at the door" push to other user
#   4. Increment door_knock_count by tap_count
#   5. If door_knock_count >= door_knock_target:
#      set door_status='open', door_opened_at, match.status='door_open'
#      send "the door's open" push to both users
#   6. Award DP: min(tap_count, 20 - knock_taps_today)
#      Daily cap shared with vibe check knock mechanic
#
# Returns:
#   { door_status: string, knock_count: number,
#     knock_target: number, dp_awarded: number }
#
# Error cases:
#   - User not in match → 403
#   - Match not expired → 400
#   - Door already open → 400


# ============================================================
# 5. answer-door-early
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#
# Input:
#   { match_id: string, reason: string }
#   reason must be one of the 10 locked strings from the brief
#
# Logic:
#   1. Verify answerer is the non-knocking participant
#   2. Verify door_status = 'knocking'
#   3. Validate reason is in the locked list
#   4. Set door_status='open', door_opened_at, door_early_answer_reason,
#      match.status='door_open'
#   5. Send push to knocker with reason
#   6. Insert system message: { type: 'door_answered', reason }
#
# Returns: { door_open: true }


# ============================================================
# 6. check-match-expiry  [CRON: hourly]
# ============================================================
# Auth: Service role only
#
# Logic:
#   Pass 1 — 7-day warnings:
#     matches where status='active' AND last_message_at < now()-23d
#     AND expiry_warning_sent_at IS NULL
#     → send "expires in 7 days" push, set expiry_warning_sent_at
#
#   Pass 2 — Expire:
#     matches where status IN ('active','silent')
#     AND (last_message_at < now()-30d OR
#          (last_message_at IS NULL AND matched_at < now()-30d))
#     → set status='expired', expired_at=now()
#     → generate door_knock_target (weighted random 200–800):
#
#       r = Math.random()
#       if r < 0.60: target = rand(200) + 300   // 300–500 (60%)
#       if r < 0.85: target = rand(100) + 500   // 500–600 (25%)
#       if r < 0.95: target = rand(100) + 200   // 200–300 (10%)
#       else:        target = rand(200) + 600   // 600–800  (5%)
#
#     → send "got away" push to both users


# ============================================================
# 7. check-silence-detector  [CRON: every 6 hours]
# ============================================================
# Auth: Service role only
#
# Logic:
#   Find matches where status='active'
#   AND (last_message_at IS NULL OR last_message_at < now()-7d)
#   AND silence_notified_at IS NULL
#
#   For each: check if BOTH users have 'matches_and_never_messages' flag
#   If both: send "you both have 'matches and never messages.' we see you." push
#   Either way: set status='silent', silent_since=now(),
#               expires_at=now()+30d, silence_notified_at=now()
#
# Notes:
#   The "we see you" push only fires if both have the flag.
#   Sending it to everyone who goes quiet would be annoying.


# ============================================================
# 8. check-desperation-boost  [CRON: daily 02:00 UTC]
# ============================================================
# Auth: Service role only
#
# Logic:
#   1. Expire activated boosts:
#      profiles where desperation_boost_activated_at < now()-7d
#      → set desperation_boost_activated_at = NULL
#
#   2. New eligibility:
#      profiles where desperation_boost_eligible=false
#      AND onboarding_completed_at < now()-90d
#      AND NOT EXISTS (match where user is participant, status != 'unmatched')
#      → set desperation_boost_eligible=true, send push
#
#   3. Defensive cleanup:
#      profiles where desperation_boost_eligible=true
#      but a match now exists (trigger should catch this, but belt+braces)
#      → reset eligibility


# ============================================================
# 9. check-pet-health  [CRON: daily 03:00 UTC]
# ============================================================
# Auth: Service role only
#
# Degradation schedule (based on last_interacted_at):
#   1–2 days:   no state change, dialogue trigger: neglect_day_1_2
#   3–5 days:   state → sad
#   6–9 days:   state → sick, happiness → 30
#   10–13 days: state → very_sick, happiness → 10
#   14+ days:   state → gone, gone_at = now()
#
# Send push on transitions to sick, very_sick, gone.
# Pet can never be permanently deleted — gone is recoverable via
# comeback fee (200 coins). Cron only degrades, never deletes.


# ============================================================
# 10. process-iap-receipt
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#
# Input:
#   { apple_transaction_id: string,
#     apple_product_id: string,
#     receipt_data: string }  // base64
#
# Logic:
#   1. Validate with Apple verifyReceipt (prod URL; fall back to sandbox
#      if status 21007)
#   2. Check apple_transaction_id not already in iap_receipts (dedup)
#   3. Insert iap_receipts row
#   4. Branch by product_id:
#      com.thedregs.sub.dumpsterfire → upsert subscriptions,
#                                      set profiles.is_subscribed=true
#      com.thedregs.coins.small      → credit 200 Chaos Coins
#      com.thedregs.coins.medium     → credit 550 Chaos Coins
#      com.thedregs.coins.large      → credit 1200 Chaos Coins
#      com.thedregs.pack.*           → call open-chaos-pack inline
#
# Returns: { success: true, credits_added?: number }
#
# Notes:
#   Coin amounts above are suggestions — lock before App Store submission.
#   Product IDs must match exactly what's in App Store Connect.


# ============================================================
# 11. open-chaos-pack
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#          Also called internally by process-iap-receipt
#
# Input: { tier: 'bad_decision' | 'the_spiral' | 'full_collapse' }
#
# Logic:
#   1. Verify user has enough Chaos Coins (50 / 150 / 400)
#   2. Debit coins via ledger insert
#   3. Roll rewards by tier:
#
#   Bad Decision (50 coins):
#     50% → 5 bonus swipes (credit to profiles.bonus_swipes_balance)
#     30% → random digital gift (credited to inventory)
#     15% → common profile skin (random from common pool)
#      5% → common pet cosmetic
#
#   The Spiral (150 coins):
#     Guaranteed: 15 bonus swipes
#     40% → rare skin
#     30% → pet food (credit 20 coins)
#     20% → Super Ick credit (1 use)
#     10% → "see who liked you" token (1 use, 24h)
#
#   Full Collapse (400 coins):
#     Guaranteed: rare or legendary skin
#     Guaranteed: rare or animated pet item
#     25% → auto-match token
#     20% → message-before-matching token
#      5% → Chaos Crown badge
#
#   4. Insert rewards into appropriate tables
#   5. Record in chaos_pack_openings
#
# Returns:
#   { rewards: [{ type, slug, rarity }, ...] }
#
# Notes:
#   Odds must be displayed in UI before purchase (Apple requirement).
#   Brief copy: "odds of receiving something good: low. you knew that."
#   followed by actual percentages in small print.


# ============================================================
# 12. delete-account
# ============================================================
# Trigger: HTTP DELETE | Auth: JWT required
#          Body must contain { confirm: "delete" }
#
# Logic (all via service role, treat as one logical transaction):
#   1. Verify JWT, resolve user_id
#   2. Verify body.confirm === "delete"
#   3. Delete voice notes from Storage (voice-notes/{user_id}/)
#   4. Delete profile photos from Storage (profile-photos/{profile_id}/)
#      Steps 3–4 happen before DB ops. Orphaned files on Storage
#      failure are logged and recoverable — don't block deletion.
#   5. Delete all messages in user's matches
#   6. Delete all matches
#   7. Delete all swipes (both as swiper and swiped)
#   8. Delete profile row — cascades handle everything else
#      (photos, flags, prompts, ex entries, pet, cosmetics, saved,
#       blocks, push tokens, ledgers, skins, but_why aggregates)
#   9. Hash email (SHA-256, lowercase), upsert user_account_history
#      (increment account_count for re-signup badge logic)
#  10. Delete users row
#  11. Call supabase.auth.admin.deleteUser(auth_id)
#
# Returns: { deleted: true }
#
# Error cases:
#   - Missing or wrong confirm string → 400
#   - Any DB failure → 500, log for manual review


# ============================================================
# 13. vibe-check-knock
# ============================================================
# Trigger: HTTP POST | Auth: JWT required
#
# Input: { tap_count: number }  — client batches taps
#
# Logic:
#   1. Verify vibe_check_passed=false and timer not yet expired
#   2. Load today's knock count from vibe_check_knocks
#   3. Cap: capped_taps = min(tap_count, 20 - taps_today)
#   4. Insert capped_taps rows into vibe_check_knocks
#   5. Decrement timer_expiry by capped_taps seconds:
#      timer_expiry = timer_expiry - (capped_taps * interval '1 second')
#   6. Award DP (shared daily cap with door knocks):
#      dp_to_award = min(capped_taps, 20 - knock_taps_today_total)
#   7. If timer_expiry <= now(): call complete-vibe-check inline
#
# Returns:
#   { timer_expiry: string, taps_recorded: number,
#     taps_today: number, dp_awarded: number, passed: boolean }


# ============================================================
# 14. check-vibe-check-timers  [CRON: every 5 minutes]
# ============================================================
# Auth: Service role only
#
# Logic:
#   Find profiles where vibe_check_passed=false
#   AND vibe_check_timer_expiry <= now()
#   For each: call complete-vibe-check logic inline
#
# Notes:
#   5-minute granularity is fine — client is counting down from the
#   server timestamp. Push fires when cron catches it. Acceptable.


# ============================================================
# 15. send-push-notification  [INTERNAL UTILITY]
# ============================================================
# Not exposed to client. Called by all other functions.
# Auth: Service role only
#
# Input:
#   { user_id, trigger_type, template_vars, reference_id? }
#
# Logic:
#   1. Look up push tokens for user_id
#   2. Interpolate push copy template (all copy locked in brief)
#   3. Send via Expo Push API
#   4. Insert into push_notification_log
#   5. On DeviceNotRegistered error: delete stale token
#
# Notes:
#   All push copy templates live in a constants file in the function,
#   not hardcoded inline. Copy changes don't touch logic.


# ============================================================
# 16. complete-vibe-check  [INTERNAL]
# ============================================================
# Called by vibe-check-knock (on timer expiry) and
# check-vibe-check-timers cron. Service role only.
#
# Logic:
#   1. Set profiles.vibe_check_passed=true, vibe_check_passed_at=now()
#   2. Send "update: we've reviewed your application.
#      honestly the bar is low. come in." push
#   3. Client listening via Supabase Realtime subscription on
#      profiles row transitions the screen automatically


# ============================================================
# SUMMARY TABLE
# ============================================================
#
# Function                    Trigger           Auth
# --------------------------  ----------------  ------------
# get-discover-stack          HTTP POST         JWT
# record-swipe                HTTP POST         JWT
# compute-chaos-score         HTTP POST         JWT
# record-door-knock           HTTP POST         JWT
# answer-door-early           HTTP POST         JWT
# vibe-check-knock            HTTP POST         JWT
# process-iap-receipt         HTTP POST         JWT
# open-chaos-pack             HTTP POST         JWT
# delete-account              HTTP DELETE       JWT
# check-match-expiry          CRON hourly       Service role
# check-silence-detector      CRON 6h           Service role
# check-desperation-boost     CRON daily 02:00  Service role
# check-pet-health            CRON daily 03:00  Service role
# check-vibe-check-timers     CRON 5min         Service role
# send-push-notification      Internal          Service role
# complete-vibe-check         Internal          Service role

# ============================================================
# END OF EDGE FUNCTIONS DOCUMENT
# ============================================================
