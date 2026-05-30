# The Dregs — Desperation Points Spend Rates
# Generated: 2026-05-28
#
# Earn rates are locked in the brief and the schema.
# This document locks the spend side.
#
# Design principles:
#   1. DP should feel earnable but not easily stockpiled.
#      A very active daily user earns ~35 pts/day in steady state.
#      Spend costs should reflect that — nothing should be free,
#      but nothing should require a week of grinding either.
#
#   2. DP and Chaos Coins serve different roles:
#      Coins = premium, bought with money, for meaningful features
#      DP    = earned through chaos, for small perks and flavour
#      The two currencies should not fully substitute for each other.
#      Some things are DP-only (paying doesn't get you there).
#      Some things are coins-only (grinding doesn't get you there).
#
#   3. DP spending should feel thematically correct.
#      Points called "Desperation Points" should be spent on
#      things that feel a little desperate. That's the bit.
#
# Steady-state earn reference (for cost calibration):
#   Daily login:         5
#   Knock taps (20):    20
#   Midnight check-in:  10
#   Shake + hold:        5
#   Got ick'd (avg):  3–5
#   Profile views:     1–3
#   ─────────────────────
#   Active daily max:  ~43 pts/day
#   Passive daily:     ~10 pts/day (login + a couple icks/views)
# ============================================================


# ============================================================
# SECTION 1: DP-ONLY SPEND OPTIONS
# Things you cannot buy with Chaos Coins.
# Paying does not replace playing here.
# ============================================================

# --- Vibe Check Skip ---
# Cost: 500 DP
# What it does: Skips the 24-hour rejection timer entirely on the
#   rejection screen, without needing to tap 86,400 times.
# Context: Only relevant if chaos score < 20 at onboarding end.
#   Requires ~12–50 days of earning depending on how active you are.
#   Feels like the right cost — not impossible, but not trivial.
# Unlock condition: Only available while vibe_check_passed = false.
# Schema: Edge function calls complete_vibe_check() after DP debit.

# --- Profile Resurrection ---
# Cost: 300 DP
# What it does: Re-enters your profile into the discover stacks of
#   everyone who passed you in the last 14 days. They see you again
#   as if you just joined (not in Second Thoughts — a fresh card).
# Context: For users who feel invisible. Not a boost in ranking,
#   just re-eligibility for people who already passed.
# Unlock condition: Must have been on the app for 30+ days.
# Limit: Once per 30 days.
# Schema: Edge function inserts a profile_resurrections row (new table,
#   see Section 3), temporarily removes pass swipes from those users'
#   swipe history for this profile only. Swipe re-added on next decision.

# --- Second Thoughts Notification ---
# Cost: 75 DP
# What it does: Sends an anonymous push to up to 3 people who passed
#   you, nudging them to check their Second Thoughts pile.
#   Copy: "someone from your discard pile is still out there."
#   No identity revealed — they don't know it came from you.
# Context: Low cost, low impact, thematically perfect. You're spending
#   your desperation points to haunt people's discard pile.
# Limit: Once per 7 days.
# Schema: Logged in push_notification_log with trigger_type='second_thoughts_nudge'.
#   Recipients chosen randomly from users who passed the sender in last 30 days.

# --- Chaos Score Freeze ---
# Cost: 150 DP
# What it does: Locks your displayed chaos score for 48 hours.
#   If you edit your profile and your score would drop, it shows
#   the frozen value instead. Actual score still computed and stored —
#   only the display is frozen.
# Context: For the "suspiciously together" user who wants to try
#   editing their profile without tanking their score mid-session.
#   Cosmetic and slightly absurd — correct energy for DP.
# Schema: profiles.chaos_score_frozen_until timestamptz (new column).
#   Display logic in app: if frozen_until > now(), show frozen_score.
#   profiles.chaos_score_frozen_value integer (new column).

# --- Pet Name Change ---
# Cost: 50 DP
# What it does: Allows renaming your pet.
#   First name is free (set during onboarding). Each rename costs 50 DP.
# Context: Low cost, low stakes. Fits the "earn small things through
#   activity" philosophy.
# Schema: No new columns needed — just update pets.name.
#   Log the rename in a pet_name_history table (new, see Section 3)
#   for flavour (pet's full history of names visible in pet settings).

# --- Extend Expiring Match ---
# Cost: 200 DP
# What it does: Extends an expiring match by 7 days.
#   Available once the "expires in 7 days" warning has fired.
#   Can only be used once per match.
# Context: You can't afford the door knock but you want more time.
#   Spending DP feels right — it's a desperate move.
# Unlock condition: Match must have expiry_warning_sent_at IS NOT NULL.
#   Cannot be used after match has already expired (use door knock then).
# Limit: Once per match.
# Schema: matches.expiry_extended_at timestamptz (new column).
#   Edge function: expires_at = expires_at + interval '7 days'.


# ============================================================
# SECTION 2: SHARED SPEND OPTIONS
# Available with either DP or Chaos Coins.
# DP cost is always higher than coin cost in equivalent terms —
# coins are more efficient, but DP works if you don't want to pay.
# ============================================================

# --- Pet Food ---
# Coins: 20    |    DP: 80
# Keeps pet healthy. Standard upkeep.
# The DP cost is 4x coins — paying is clearly more efficient,
# but a very active user can sustain their pet on DP alone.

# --- Pet Treat (custom bribe line, 24h) ---
# Coins: 30    |    DP: 120
# Same 4x ratio. Thematically: you're spending your accumulated
# desperation to make your pet say something for you. Correct.

# --- Pet Medicine (cures sick state) ---
# Coins: 80    |    DP: 300
# Higher DP ratio (3.75x) because sick state is a consequence of
# neglect — the DP cost being higher than prevention feels right.
# If you're spending 300 DP on medicine you really let it get bad.

# --- Pet Comeback Fee (retrieves gone pet) ---
# Coins: 200   |    DP: 800
# 800 DP is roughly 3 weeks of active earning. That's deliberate —
# losing your pet should feel like a real consequence.
# Coins option is still there so it's never permanently blocked.

# --- Bonus Swipes (5 swipes) ---
# Coins: via Chaos Pack only    |    DP: 100
# Free tier users get 20 swipes/day. This buys 5 more.
# DP-only path (no direct coin purchase outside packs) gives DP
# a meaningful use that doesn't compete with the pack economy.

# --- Profile Accent (temporary, 24h) ---
# Coins: 15    |    DP: 60
# A cosmetic border/frame on your profile card for 24 hours.
# Not a skin (those are coins-only) — this is a lighter cosmetic.
# DP version makes cosmetics feel accessible without devaluing skins.
# Schema: profiles.temp_accent_slug text, profiles.temp_accent_expires_at timestamptz


# ============================================================
# SECTION 3: NEW SCHEMA ADDITIONS REQUIRED
# ============================================================

# profile_resurrections table:
#   id uuid pk
#   profile_id uuid references profiles
#   activated_at timestamptz
#   expires_at timestamptz (activated_at + 14 days — the lookback window)
#   dp_spent integer
# Index: (profile_id, activated_at)
# Logic: get-discover-stack edge function checks this table.
#   If a resurrection is active for profile P, temporarily exclude
#   swipes where action='pass' AND swiped_at < resurrection.activated_at
#   for the reverse viewers.

# pet_name_history table:
#   id uuid pk
#   pet_id uuid references pets
#   name text
#   changed_at timestamptz
#   dp_spent integer (0 for first name, 50 for subsequent)
# Flavour: visible in pet settings as "names [pet] has gone by"

# New columns on profiles:
#   chaos_score_frozen_until  timestamptz  (null = not frozen)
#   chaos_score_frozen_value  integer      (null = not frozen)
#   temp_accent_slug          text         (null = none active)
#   temp_accent_expires_at    timestamptz  (null = none active)

# New column on matches:
#   expiry_extended_at  timestamptz  (null = not extended)
#   -- Also need a check: extension can only be used once per match.
#   -- Enforced by: NOT NULL on expiry_extended_at after first use.


# ============================================================
# SECTION 4: FULL SPEND RATE REFERENCE TABLE
# ============================================================
#
# Item                          DP Cost   Coins Cost   Notes
# ----------------------------  --------  -----------  -------------------------
# Vibe check skip               500       —            DP-only; timer must be active
# Profile resurrection          300       —            DP-only; 30d on app; 1x/30d
# Second Thoughts nudge         75        —            DP-only; anon; 1x/7d
# Chaos score freeze (48h)      150       —            DP-only; display only
# Pet name change               50        —            DP-only; per rename
# Extend expiring match         200       —            DP-only; 1x per match
# Bonus swipes (5)              100       pack only    No direct coin purchase
# Pet food                      80        20           4x ratio
# Pet treat (bribe line, 24h)   120       30           4x ratio
# Pet medicine                  300       80           ~3.75x ratio
# Pet comeback fee              800       200          ~4x ratio; ~3 weeks earning
# Profile accent (24h)          60        15           4x ratio
#
# Coins-only (no DP path):
#   Profile skin                —         varies       Permanent cosmetic
#   Super Ick                   —         50           With optional note
#   Message before matching     —         75           Single use
#   Auto-match token            —         100          Forces match
#   Pet outfit                  —         80           Permanent cosmetic
#   Pet mood booster            —         40           Single use
#   Pet therapy dialogue tree   —         120          Unlocks dialogue
#   Chaos Packs                 —         50/150/400   Loot boxes
#   Desperation Boost           —         150          Stack ranking uplift


# ============================================================
# SECTION 5: DESIGN NOTES
# ============================================================
#
# Why is Desperation Boost coins-only?
#   Because the boost affects how you appear to other users — it
#   has real social stakes. Earning it through activity would mean
#   the most active users always have a ranking advantage, which
#   breaks the equal-chaos philosophy. Keeping it coins-only means
#   it's a deliberate, paid choice. The 90-day eligibility gate
#   still protects it from being a day-one purchase.
#
# Why no DP path to Super Ick or message-before-matching?
#   These create direct asymmetric interactions — you're reaching
#   into someone else's experience. They should require a real
#   decision (paying coins), not just accumulated activity.
#   The DP economy is for self-directed stuff.
#
# Why is the vibe check skip 500 DP?
#   That's 12–50 days of earning depending on activity level.
#   The brief's knock mechanic already lets you skip by tapping 86,400
#   times — the DP option is the "I'm not doing that but I'm also not
#   paying" path. It should feel like a commitment.
#
# Will DP ever run out for active users?
#   A very active user earns ~40 pts/day. If they use pet food (80 DP
#   every few days) and the occasional bonus swipes (100 DP), they're
#   spending ~50–80 pts/day — roughly break-even. That's correct.
#   DP shouldn't be a currency you hoard indefinitely; it should feel
#   like a metabolic system that you're either feeding or draining.

# ============================================================
# END OF DESPERATION POINTS SPEND RATES
# ============================================================
