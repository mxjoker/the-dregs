-- ============================================================
-- THE DREGS — Full Postgres Schema
-- Supabase / Postgres
-- Generated: 2026-05-28
-- ============================================================
-- Convention notes:
--   • All timestamps are timestamptz (UTC stored, display in local TZ)
--   • Soft deletes: deleted_at timestamptz (null = active)
--   • UUIDs everywhere for user-facing IDs
--   • Enums for all locked option sets — adding values is a migration,
--     which is intentional friction against scope creep
--   • RLS enabled on every table — policies at bottom of each section
--   • "Age" stored as date_of_birth, never as a displayed integer
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- fuzzy search on nicknames
-- postgis disabled for initial setup; re-enable when PostGIS is confirmed active
-- create extension if not exists "postgis";

-- ============================================================
-- ENUMS
-- All locked option sets from the brief live here.
-- ============================================================

create type employment_status as enum (
  'technically_consulting',
  'funemployed',
  'its_complicated',
  'between_callings',
  'employed_unfortunately',
  'self_employed_loosely',
  'working_on_something',
  'in_a_band',
  'full_time_creative',
  'student_professionally',
  'freelance_everything',
  'on_sabbatical_unplanned'
);

create type looking_for_option as enum (
  'emotional_damage',
  'someone_to_blame',
  'situationship_with_potential',
  'chaos_but_make_it_romantic',
  'someone_who_texts_back',
  'a_reason_to_stay_in_this_city',
  'to_be_perceived',
  'mostly_this_app_to_work_out',
  'something_undefined',
  'a_person_not_a_project',
  'my_keys_and_also_love',
  'to_relocate_for_wrong_reasons'
);

create type relationship_structure as enum (
  'monogamous',
  'ethically_non_monogamous',
  'polyamorous',
  'open_relationship',
  'relationship_anarchist',
  'solo_poly',
  'still_figuring_it_out',
  'its_complicated',
  'not_a_conversation_im_having_on_app'
);

create type gender_identity_option as enum (
  'man', 'woman', 'non_binary', 'genderfluid', 'genderqueer',
  'agender', 'transgender_man', 'transgender_woman', 'two_spirit',
  'intersex', 'questioning', 'self_describe', 'prefer_not_to_say'
);

create type pronouns_option as enum (
  'he_him', 'she_her', 'they_them', 'he_they', 'she_they',
  'any_pronouns', 'ask_me', 'self_describe'
);

create type ex_review_framing as enum ('work_history', 'verified_purchases');
create type ex_verified_badge as enum ('verified_situationship', 'verified_chaos');

create type pet_animal as enum ('cat', 'dog', 'frog', 'rat', 'duck');

create type pet_personality as enum (
  'sarcastic', 'enthusiastic', 'unbothered',
  'therapy_speak', 'chronically_online', 'conspiracy_theorist',
  'shakespearean', 'life_coach', 'doomsday_prepper'
);

create type pet_accent as enum (
  'bored_london', 'generic_american', 'australian',
  'french', 'posh_british', 'southern_us', 'nyc', 'estuary_chav',
  'irish', 'scottish', 'surfer', 'corporate_drone'
);

create type pet_state as enum ('happy', 'neutral', 'sad', 'sick', 'very_sick', 'gone');
create type swipe_action as enum ('pass', 'like', 'ick');

create type match_status as enum (
  'active', 'silent', 'expired', 'door_open', 'unmatched'
);

create type message_type as enum ('text', 'voice_note', 'digital_gift', 'system');

create type voice_note_mode as enum (
  'drunk_dial', 'three_am_mode', 'therapy_voice', 'villain_arc', 'pocket_dial'
);

create type digital_gift_type as enum (
  'wilted_flower', 'voice_note_sigh', 'unanswered_text_screenshot',
  'red_flag_on_stick', 'thinking_of_you_unfortunately', 'participation_trophy'
);

create type report_reason as enum (
  'harassment', 'spam', 'fake_profile', 'underage',
  'hate_speech', 'explicit_content', 'real_name_in_ex_review', 'other'
);

create type report_status as enum ('pending', 'reviewed', 'actioned', 'dismissed');
create type iap_product_type as enum ('subscription', 'chaos_coins', 'chaos_pack');
create type chaos_pack_tier as enum ('bad_decision', 'the_spiral', 'full_collapse');

create type onboarding_step as enum (
  'not_started', 'basics', 'disaster_profile', 'ex_reviews', 'prompts', 'complete'
);

-- ============================================================
-- SECTION 1: USERS & AUTH
-- ============================================================

-- users: thin auth-layer record, mirrors Supabase auth.users
create table users (
  id                uuid primary key default uuid_generate_v4(),
  auth_id           uuid unique not null,  -- references auth.users(id)
  email             text unique not null,
  date_of_birth     date not null,
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  is_banned         boolean not null default false,
  ban_reason        text,
  account_number    integer not null default 1,
  constraint age_gate check (date_of_birth <= current_date - interval '18 years')
);

-- Tracks deleted accounts by email hash so re-signup counter survives deletion.
-- email is hashed (SHA-256 of lowercase) — plaintext not stored after deletion.
create table user_account_history (
  id              uuid primary key default uuid_generate_v4(),
  email_hash      text not null,
  account_count   integer not null default 1,
  last_deleted_at timestamptz not null default now()
);
create index on user_account_history(email_hash);

-- Expo push tokens (one user, many devices)
create table push_tokens (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references users(id) on delete cascade,
  token        text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- ============================================================
-- SECTION 2: PROFILES
-- ============================================================

create table profiles (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid unique not null references users(id) on delete cascade,
  display_name                text not null check (char_length(display_name) <= 50),

  -- Identity (copy-free zones — no jokes, plain fields)
  gender_identity             gender_identity_option not null default 'prefer_not_to_say',
  gender_identity_text        text check (char_length(gender_identity_text) <= 140),
  pronouns                    pronouns_option not null default 'ask_me',
  pronouns_text               text check (char_length(pronouns_text) <= 140),

  -- Core fields
  employment_status           employment_status,
  looking_for                 looking_for_option,
  relationship_structure      relationship_structure,
  biggest_failure             text check (char_length(biggest_failure) <= 140),

  -- Location (stored as lat/lng text for now; migrate to PostGIS geography when extension confirmed)
  -- Format: 'lat,lng' e.g. '35.4676,-97.5164'
  location_lat                double precision,
  location_lng                double precision,
  location_updated_at         timestamptz,

  -- Discovery prefs
  max_distance_km             integer not null default 50,
  min_age_pref                integer not null default 18,
  max_age_pref                integer not null default 99,

  -- Ex review framing
  ex_review_framing           ex_review_framing not null default 'work_history',

  -- Chaos Score (computed by trigger/edge function on save)
  chaos_score                 integer not null default 0
                              check (chaos_score >= 0 and chaos_score <= 100),
  chaos_score_updated_at      timestamptz,

  -- Onboarding state
  onboarding_step             onboarding_step not null default 'not_started',
  onboarding_completed_at     timestamptz,
  vibe_check_passed           boolean not null default false,
  vibe_check_passed_at        timestamptz,
  -- Timer expiry = created_at + 24h, reduced 1s per knock tap. Managed server-side.
  vibe_check_timer_expiry     timestamptz,

  -- Auto-tag (assigned if vibe_check_passed, then profile later drops below 20)
  auto_tag                    text,

  -- Desperation Boost (eligible after 90 days no match)
  desperation_boost_eligible         boolean not null default false,
  desperation_boost_activated_at     timestamptz,

  -- Subscription mirror (source of truth: subscriptions table)
  is_subscribed               boolean not null default false,
  subscription_expires_at     timestamptz,

  -- Visibility
  is_visible                  boolean not null default true,
  is_paused                   boolean not null default false,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- spatial index: re-enable after PostGIS migration
-- create index on profiles using gist(location);
create index on profiles(location_lat, location_lng);
create index on profiles(chaos_score);
create index on profiles(is_visible, is_paused, vibe_check_passed);

-- ============================================================
-- SECTION 3: PHOTOS
-- ============================================================

create table profile_photos (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  storage_path   text not null,
  display_order  integer not null check (display_order between 1 and 6),
  uploaded_at    timestamptz not null default now(),
  unique(profile_id, display_order)
);
create index on profile_photos(profile_id);

-- ============================================================
-- SECTION 4: RED FLAGS
-- ============================================================

create table red_flags (
  id                   uuid primary key default uuid_generate_v4(),
  slug                 text unique not null,
  label                text not null,
  is_certified_chaotic boolean not null default false,
  chaos_points         integer not null,
  display_order        integer
);

create table profile_red_flags (
  profile_id   uuid not null references profiles(id) on delete cascade,
  red_flag_id  uuid not null references red_flags(id),
  selected_at  timestamptz not null default now(),
  primary key (profile_id, red_flag_id)
);

-- Community ick ranking: more Icks = flag floats higher on profile
create table red_flag_ick_counts (
  profile_id   uuid not null references profiles(id) on delete cascade,
  red_flag_id  uuid not null references red_flags(id),
  ick_count    integer not null default 0,
  primary key (profile_id, red_flag_id)
);

-- ============================================================
-- SECTION 5: PROMPTS
-- ============================================================

create table prompts (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  prompt_text   text not null,
  display_order integer
);

create table profile_prompts (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  prompt_id      uuid not null references prompts(id),
  answer         text not null check (char_length(answer) <= 140),
  display_order  integer not null check (display_order between 1 and 3),
  answered_at    timestamptz not null default now(),
  unique(profile_id, prompt_id),
  unique(profile_id, display_order)
);

-- ============================================================
-- SECTION 6: EX ENTRIES
-- ============================================================

create table ex_entries (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  display_order  integer not null,

  -- Nicknames only — enforced here and in UI
  nickname       text not null check (char_length(nickname) <= 50),

  -- Work History framing
  wh_job_title           text check (char_length(wh_job_title) <= 140),
  wh_start_date          date,
  wh_end_date            date,
  wh_role_description    text check (char_length(wh_role_description) <= 140),
  wh_reason_for_leaving  text check (char_length(wh_reason_for_leaving) <= 140),

  -- Verified Purchases framing
  vp_star_rating   integer check (vp_star_rating between 1 and 5),
  vp_review_title  text check (char_length(vp_review_title) <= 140),
  vp_review_body   text check (char_length(vp_review_body) <= 140),
  vp_badge         ex_verified_badge,

  created_at  timestamptz not null default now(),
  deleted_at  timestamptz  -- soft delete; user can remove at any time
);
create index on ex_entries(profile_id) where deleted_at is null;

-- ============================================================
-- SECTION 7: VIBE CHECK KNOCKS
-- Rejection screen: each tap reduces timer by 1s.
-- Timer expiry lives in profiles.vibe_check_timer_expiry.
-- Edge function decrements it on each tap.
-- ============================================================

create table vibe_check_knocks (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references users(id) on delete cascade,
  tapped_at timestamptz not null default now()
);
-- Index on user_id + date for daily count queries
-- Use: WHERE user_id = x AND tapped_at >= current_date AND tapped_at < current_date + 1
create index on vibe_check_knocks(user_id, tapped_at);

-- ============================================================
-- SECTION 8: SWIPES
-- ============================================================

create table swipes (
  id               uuid primary key default uuid_generate_v4(),
  swiper_id        uuid not null references profiles(id) on delete cascade,
  swiped_id        uuid not null references profiles(id) on delete cascade,
  action           swipe_action not null,
  swiped_at        timestamptz not null default now(),
  -- Targeted Ick: which flag was long-pressed before tapping Ick
  targeted_flag_id uuid references red_flags(id),
  -- "But why" tag (anonymous, right-swipes only; null if skipped)
  but_why_tag      text,
  unique(swiper_id, swiped_id)
);
create index on swipes(swiper_id);
create index on swipes(swiped_id);
create index on swipes(action);

-- ============================================================
-- SECTION 9: MATCHES
-- ============================================================

create table matches (
  id                       uuid primary key default uuid_generate_v4(),
  -- Always store lower UUID first for consistent lookups
  user_a_id                uuid not null references profiles(id) on delete cascade,
  user_b_id                uuid not null references profiles(id) on delete cascade,
  status                   match_status not null default 'active',
  matched_at               timestamptz not null default now(),
  last_message_at          timestamptz,

  -- Silence tracking
  silent_since             timestamptz,
  silence_notified_at      timestamptz,
  expiry_warning_sent_at   timestamptz,
  expires_at               timestamptz,
  expired_at               timestamptz,

  -- Door mechanic (locked: random 200–800 tap target, weighted 300–500)
  door_status              text not null default 'closed',
                           -- 'closed' | 'knocking' | 'open'
  door_knocked_by          uuid references profiles(id),
  door_knock_count         integer not null default 0,
  door_knock_target        integer,
  door_opened_at           timestamptz,
  door_early_answer_reason text,  -- one of the 10 locked away-reasons

  -- Unmatch
  unmatched_by  uuid references profiles(id),
  unmatched_at  timestamptz,

  unique(user_a_id, user_b_id),
  check (user_a_id < user_b_id)  -- enforces canonical ordering
);
create index on matches(user_a_id);
create index on matches(user_b_id);
create index on matches(status);
create index on matches(expires_at) where status = 'silent';

-- ============================================================
-- SECTION 10: MESSAGES
-- ============================================================

create table messages (
  id                      uuid primary key default uuid_generate_v4(),
  match_id                uuid not null references matches(id) on delete cascade,
  sender_id               uuid not null references profiles(id),
  message_type            message_type not null default 'text',

  body                    text,  -- no 140-char limit in chat

  -- Voice note
  voice_note_storage_path text,
  voice_note_duration_ms  integer,
  voice_note_mode         voice_note_mode,

  -- Digital gift
  digital_gift_type       digital_gift_type,

  -- System message (match moment, door opened, etc.)
  system_payload          jsonb,

  -- Reactive audio flags
  is_midnight_send        boolean not null default false,  -- 00:00–04:00
  is_desperation_echo     boolean not null default false,  -- 5th+ unanswered msg

  read_at    timestamptz,
  sent_at    timestamptz not null default now(),
  deleted_at timestamptz
);
create index on messages(match_id, sent_at);
create index on messages(sender_id);

-- ============================================================
-- SECTION 11: SAVED / BOOKMARKS
-- ============================================================

create table saved_profiles (
  id                uuid primary key default uuid_generate_v4(),
  saver_id          uuid not null references profiles(id) on delete cascade,
  saved_profile_id  uuid not null references profiles(id) on delete cascade,
  saved_at          timestamptz not null default now(),
  unique(saver_id, saved_profile_id)
);
create index on saved_profiles(saver_id);

-- ============================================================
-- SECTION 12: BLOCKS
-- ============================================================

create table blocks (
  id          uuid primary key default uuid_generate_v4(),
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  blocked_at  timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);
create index on blocks(blocker_id);
create index on blocks(blocked_id);

-- ============================================================
-- SECTION 13: REPORTS
-- ============================================================

create table reports (
  id                   uuid primary key default uuid_generate_v4(),
  reporter_id          uuid not null references profiles(id),
  reported_profile_id  uuid references profiles(id),
  reported_message_id  uuid references messages(id),
  reason               report_reason not null,
  detail               text,
  status               report_status not null default 'pending',
  reviewed_by          uuid references users(id),
  reviewed_at          timestamptz,
  review_notes         text,
  created_at           timestamptz not null default now()
);
create index on reports(status, created_at);

-- ============================================================
-- SECTION 14: PETS
-- ============================================================

create table pets (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            uuid unique not null references profiles(id) on delete cascade,
  name                  text not null check (char_length(name) <= 50),
  animal                pet_animal not null,
  personality           pet_personality not null,
  accent                pet_accent not null,
  colour_hex            text not null default '#808080',

  state                 pet_state not null default 'happy',
  happiness             integer not null default 100 check (happiness between 0 and 100),
  last_fed_at           timestamptz,
  last_interacted_at    timestamptz,

  -- Bribe mechanic: user pays treats for custom line, lasts 24h
  bribed_line           text check (char_length(bribed_line) <= 140),
  bribed_line_expires_at timestamptz,

  active_outfit_id      uuid,  -- FK to pet_cosmetics; set after table created below

  gone_at               timestamptz,
  comeback_fee_paid_at  timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table pet_cosmetics (
  id                uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  item_slug         text not null,
  item_display_name text not null,
  is_animated       boolean not null default false,
  is_rare           boolean not null default false,
  acquired_at       timestamptz not null default now(),
  source            text not null  -- 'coins' | 'chaos_pack' | 'seasonal'
);
create index on pet_cosmetics(profile_id);

alter table pets
  add constraint fk_pet_active_outfit
  foreign key (active_outfit_id)
  references pet_cosmetics(id)
  on delete set null;

-- ============================================================
-- SECTION 15: DESPERATION POINTS
-- ============================================================

create table desperation_points_ledger (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references users(id) on delete cascade,
  delta        integer not null,
  reason       text not null,  -- 'daily_login' | 'got_ickd' | 'match_expired' | etc.
  reference_id uuid,
  created_at   timestamptz not null default now()
);
create index on desperation_points_ledger(user_id, created_at);

create table desperation_points_balance (
  user_id    uuid primary key references users(id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Daily caps for earn-rate mechanics
create table desperation_points_daily_actions (
  user_id             uuid not null references users(id) on delete cascade,
  action_date         date not null,
  daily_login_claimed boolean not null default false,
  knock_taps_today    integer not null default 0,  -- cap at 20
  shake_claimed       boolean not null default false,
  hold_claimed        boolean not null default false,
  midnight_claimed    boolean not null default false,
  primary key (user_id, action_date)
);

-- ============================================================
-- SECTION 16: CHAOS COINS
-- ============================================================

create table chaos_coins_ledger (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references users(id) on delete cascade,
  delta                integer not null,
  reason               text not null,
  iap_transaction_id   text,  -- Apple transaction ID for purchases
  reference_id         uuid,
  created_at           timestamptz not null default now()
);
create index on chaos_coins_ledger(user_id, created_at);

create table chaos_coins_balance (
  user_id    uuid primary key references users(id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SECTION 17: IAP RECEIPTS & SUBSCRIPTIONS
-- ============================================================

create table iap_receipts (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references users(id) on delete cascade,
  product_type          iap_product_type not null,
  apple_transaction_id  text unique not null,
  apple_product_id      text not null,
  amount_usd_cents      integer,
  purchased_at          timestamptz not null,
  created_at            timestamptz not null default now()
);

create table subscriptions (
  id                                uuid primary key default uuid_generate_v4(),
  user_id                           uuid unique not null references users(id) on delete cascade,
  apple_original_transaction_id     text unique not null,
  status                            text not null,
  current_period_start              timestamptz not null,
  current_period_end                timestamptz not null,
  cancelled_at                      timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

-- ============================================================
-- SECTION 18: CHAOS PACKS (LOOT BOX OPENINGS)
-- ============================================================

create table chaos_pack_openings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  tier        chaos_pack_tier not null,
  coins_spent integer not null,
  outcome     jsonb not null,  -- array of reward objects {slug, type, rarity}
  opened_at   timestamptz not null default now()
);

-- ============================================================
-- SECTION 19: COIN-PURCHASED ACTIONS
-- ============================================================

-- Super Ick: targeted Ick + optional 140-char note (50 coins)
create table super_icks (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  red_flag_id  uuid references red_flags(id),
  note         text check (char_length(note) <= 140),
  sent_at      timestamptz not null default now()
);

-- Message before matching: single-use (75 coins)
create table pre_match_messages (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  body         text not null,
  sent_at      timestamptz not null default now(),
  seen_at      timestamptz,
  resolved_at  timestamptz,
  resolution   swipe_action
);

-- Auto-match token: forces a match (100 coins)
create table auto_match_tokens (
  id            uuid primary key default uuid_generate_v4(),
  purchaser_id  uuid not null references profiles(id),
  target_id     uuid not null references profiles(id),
  match_id      uuid references matches(id),
  used_at       timestamptz not null default now()
);

-- "But why" aggregate: visible to profile owner only
create table but_why_aggregates (
  profile_id uuid not null references profiles(id) on delete cascade,
  tag_slug   text not null,
  count      integer not null default 0,
  primary key (profile_id, tag_slug)
);

-- ============================================================
-- SECTION 20: PROFILE SKINS
-- ============================================================

create table profile_skins (
  id               uuid primary key default uuid_generate_v4(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  skin_slug        text not null,
  skin_display_name text not null,
  acquired_at      timestamptz not null default now(),
  source           text not null,
  is_active        boolean not null default false
);
create index on profile_skins(profile_id);
-- Only one skin active at a time
create unique index on profile_skins(profile_id) where is_active = true;

-- ============================================================
-- SECTION 21: PUSH NOTIFICATION LOG
-- ============================================================

create table push_notification_log (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references users(id) on delete cascade,
  trigger_type    text not null,
  reference_id    uuid,
  payload         jsonb,
  sent_at         timestamptz not null default now(),
  delivery_status text
);
create index on push_notification_log(user_id, sent_at);

-- ============================================================
-- SECTION 22: SEED DATA — RED FLAGS
-- ============================================================

insert into red_flags (id, slug, label, is_certified_chaotic, chaos_points, display_order) values
  (uuid_generate_v4(), 'ghosts_then_reappears',          'Ghosts then reappears',                         false, 3,  1),
  (uuid_generate_v4(), 'matches_and_never_messages',     'Matches and never messages',                    false, 3,  2),
  (uuid_generate_v4(), 'emotionally_unavailable',        'Emotionally unavailable',                       false, 3,  3),
  (uuid_generate_v4(), 'still_has_exs_hoodie',           'Still has ex''s hoodie',                        false, 3,  4),
  (uuid_generate_v4(), 'replies_in_3_days',              'Replies in 3 days',                             false, 3,  5),
  (uuid_generate_v4(), 'situationship_veteran',          'Situationship veteran',                         false, 3,  6),
  (uuid_generate_v4(), 'cannot_make_plans',              'Cannot make plans',                             false, 3,  7),
  (uuid_generate_v4(), 'in_therapy_not_applying_it',     'In therapy, not applying it',                   false, 3,  8),
  (uuid_generate_v4(), 'talks_about_their_ex_constantly','Talks about their ex constantly',               false, 3,  9),
  (uuid_generate_v4(), 'main_character_syndrome',        'Main character syndrome',                       false, 3, 10),
  (uuid_generate_v4(), 'rearranges_furniture',           'Rearranges furniture instead of processing',    false, 3, 11),
  (uuid_generate_v4(), 'cancels_last_minute',            'Cancels last minute, always has a reason',      false, 3, 12),
  (uuid_generate_v4(), 'love_bombed_by_someone',         'Love bombed by someone once',                   false, 3, 13),
  (uuid_generate_v4(), 'does_not_own_curtains',          'Does not own curtains',                         false, 3, 14),
  (uuid_generate_v4(), 'cries_at_adverts',               'Cries at adverts',                              false, 3, 15),
  (uuid_generate_v4(), 'knows_all_attachment_styles',    'Knows all their attachment styles',             false, 3, 16),
  (uuid_generate_v4(), 'read_receipts_on',               'Read receipts: on',                             false, 3, 17),
  (uuid_generate_v4(), 'started_a_business_once',        'Started a business once',                       false, 3, 18),
  (uuid_generate_v4(), 'dates_people_with_potential',    'Exclusively dates people with potential',       false, 3, 19),
  (uuid_generate_v4(), 'has_a_podcast',                  'Has a podcast',                                 true,  5, 20),
  (uuid_generate_v4(), 'love_bombed_someone',            'Love bombed someone once',                      true,  5, 21),
  (uuid_generate_v4(), 'romanticises_own_dysfunction',   'Romanticises their own dysfunction',            true,  5, 22),
  (uuid_generate_v4(), 'will_not_dtr',                   'Will not DTR',                                  true,  5, 23),
  (uuid_generate_v4(), 'sends_voice_notes_over_4_mins',  'Sends voice notes over 4 minutes',              true,  5, 24);

-- ============================================================
-- SECTION 23: SEED DATA — PROMPTS
-- ============================================================

insert into prompts (id, slug, prompt_text, display_order) values
  (uuid_generate_v4(), 'most_impressive_failure', 'My most impressive failure was…',          1),
  (uuid_generate_v4(), 'peaked_when',             'I peaked when…',                           2),
  (uuid_generate_v4(), 'swipe_right_if',          'You should swipe right if…',               3),
  (uuid_generate_v4(), 'love_language',           'My love language is…',                     4),
  (uuid_generate_v4(), 'a_lot_to_deal_with',      'I''m a lot to deal with because…',         5),
  (uuid_generate_v4(), 'therapist_would_say',     'My therapist would describe me as…',       6),
  (uuid_generate_v4(), 'learned_most_from',       'The situationship I learned the most from…', 7),
  (uuid_generate_v4(), 'know_its_going_well',     'I''ll know it''s going well when…',        8),
  (uuid_generate_v4(), 'red_flag_most_proud_of',  'My red flag I''m most proud of is…',       9),
  (uuid_generate_v4(), 'terrible_partner_if',     'I would be a terrible partner if…',       10),
  (uuid_generate_v4(), 'last_thing_i_quit',       'The last thing I quit was…',              11),
  (uuid_generate_v4(), 'two_truths_situationship','Two truths and a situationship…',          12);

-- ============================================================
-- SECTION 24: USEFUL VIEWS
-- ============================================================

-- Active profiles: joined view for discover stack and matching algorithm
create or replace view active_profiles as
  select
    p.*,
    u.date_of_birth,
    u.account_number,
    coalesce(dpb.balance, 0) as desperation_points,
    coalesce(ccb.balance, 0) as chaos_coins,
    (select count(*) from profile_photos pp where pp.profile_id = p.id)             as photo_count,
    (select count(*) from ex_entries ee where ee.profile_id = p.id
                                          and ee.deleted_at is null)                as ex_entry_count,
    (select count(*) from profile_prompts ppr where ppr.profile_id = p.id)         as prompt_count
  from profiles p
  join users u on u.id = p.user_id
  left join desperation_points_balance dpb on dpb.user_id = u.id
  left join chaos_coins_balance ccb        on ccb.user_id = u.id
  where u.deleted_at is null
    and u.is_banned = false
    and p.is_visible = true
    and p.is_paused = false
    and p.onboarding_step = 'complete'
    and p.vibe_check_passed = true;

-- Matches with context for matches list screen
create or replace view matches_with_context as
  select
    m.*,
    pa.display_name  as user_a_name,
    pa.chaos_score   as user_a_chaos_score,
    pb.display_name  as user_b_name,
    pb.chaos_score   as user_b_chaos_score,
    extract(days from now() - m.last_message_at) as days_since_last_message
  from matches m
  join profiles pa on pa.id = m.user_a_id
  join profiles pb on pb.id = m.user_b_id
  where m.status not in ('unmatched');

-- ============================================================
-- SECTION 25: FUNCTIONS & TRIGGERS
-- ============================================================

-- compute_chaos_score: called by trigger on profile save and flag change.
-- Returns 0–100, display-clamped to 12–97 (brief spec).
create or replace function compute_chaos_score(p_profile_id uuid)
returns integer language plpgsql as $$
declare
  v_score        integer := 0;
  v_photo_count  integer;
  v_ex_count     integer;
  v_prompt_count integer;
  v_employment   employment_status;
  v_looking_for  looking_for_option;
  v_biggest_fail text;
  v_flag_row     record;
begin
  select employment_status, looking_for, biggest_failure
  into v_employment, v_looking_for, v_biggest_fail
  from profiles where id = p_profile_id;

  for v_flag_row in
    select rf.chaos_points from profile_red_flags prf
    join red_flags rf on rf.id = prf.red_flag_id
    where prf.profile_id = p_profile_id
  loop
    v_score := v_score + v_flag_row.chaos_points;
  end loop;

  v_score := v_score + case v_employment
    when 'funemployed'              then 12
    when 'on_sabbatical_unplanned'  then 12
    when 'in_a_band'                then 12
    when 'technically_consulting'   then 8
    when 'freelance_everything'     then 8
    when 'full_time_creative'       then 8
    when 'its_complicated'          then 6
    when 'between_callings'         then 6
    when 'working_on_something'     then 6
    when 'student_professionally'   then 4
    when 'self_employed_loosely'    then 4
    when 'employed_unfortunately'   then 2
    else 0
  end;

  select count(*) into v_ex_count
  from ex_entries where profile_id = p_profile_id and deleted_at is null;
  v_score := v_score + case when v_ex_count >= 3 then 10
                            when v_ex_count = 2  then 7
                            when v_ex_count = 1  then 4 else 0 end;

  if v_biggest_fail is not null and length(trim(v_biggest_fail)) > 0 then
    v_score := v_score + 5;
  end if;

  select count(*) into v_prompt_count from profile_prompts where profile_id = p_profile_id;
  if v_prompt_count >= 3 then v_score := v_score + 3; end if;

  select count(*) into v_photo_count from profile_photos where profile_id = p_profile_id;
  if    v_photo_count = 1        then v_score := v_score + 3;
  elsif v_photo_count >= 5       then v_score := v_score - 2;
  end if;

  v_score := v_score + case v_looking_for
    when 'emotional_damage'               then 2
    when 'to_relocate_for_wrong_reasons'  then 2
    when 'someone_to_blame'               then 2
    when 'chaos_but_make_it_romantic'     then 2
    when 'a_person_not_a_project'         then -1
    else 0
  end;

  return greatest(12, least(97, greatest(0, least(100, v_score))));
end; $$;

-- Trigger: recompute on profile save
create or replace function trigger_update_chaos_score()
returns trigger language plpgsql as $$
begin
  new.chaos_score := compute_chaos_score(new.id);
  new.chaos_score_updated_at := now();
  return new;
end; $$;

create trigger profiles_chaos_score_update
  before insert or update on profiles
  for each row execute function trigger_update_chaos_score();

-- Trigger: recompute when red flags change
create or replace function trigger_profile_flags_changed()
returns trigger language plpgsql as $$
declare v_pid uuid;
begin
  v_pid := coalesce(new.profile_id, old.profile_id);
  update profiles set
    chaos_score = compute_chaos_score(v_pid),
    chaos_score_updated_at = now()
  where id = v_pid;
  return null;
end; $$;

create trigger profile_red_flags_chaos_update
  after insert or delete on profile_red_flags
  for each row execute function trigger_profile_flags_changed();

-- Trigger: DP balance from ledger
create or replace function trigger_update_dp_balance()
returns trigger language plpgsql as $$
begin
  insert into desperation_points_balance (user_id, balance, updated_at)
  values (new.user_id, greatest(0, new.delta), now())
  on conflict (user_id) do update
  set balance = greatest(0, desperation_points_balance.balance + new.delta),
      updated_at = now();
  return new;
end; $$;
create trigger dp_ledger_balance_update
  after insert on desperation_points_ledger
  for each row execute function trigger_update_dp_balance();

-- Trigger: Chaos Coins balance from ledger
create or replace function trigger_update_cc_balance()
returns trigger language plpgsql as $$
begin
  insert into chaos_coins_balance (user_id, balance, updated_at)
  values (new.user_id, greatest(0, new.delta), now())
  on conflict (user_id) do update
  set balance = greatest(0, chaos_coins_balance.balance + new.delta),
      updated_at = now();
  return new;
end; $$;
create trigger cc_ledger_balance_update
  after insert on chaos_coins_ledger
  for each row execute function trigger_update_cc_balance();

-- Helper: canonical match lookup (handles a_id/b_id ordering)
create or replace function get_match(p_user_a uuid, p_user_b uuid)
returns matches language sql stable as $$
  select * from matches
  where user_a_id = least(p_user_a, p_user_b)
    and user_b_id = greatest(p_user_a, p_user_b);
$$;

-- ============================================================
-- SECTION 26: ROW LEVEL SECURITY
-- ============================================================
-- Pattern: each user reads/writes only their own data.
-- Matches + messages: both participants can read.
-- Service role key (edge functions only) bypasses all RLS.
-- ============================================================

alter table users                              enable row level security;
alter table profiles                           enable row level security;
alter table profile_photos                     enable row level security;
alter table profile_red_flags                  enable row level security;
alter table red_flag_ick_counts                enable row level security;
alter table profile_prompts                    enable row level security;
alter table ex_entries                         enable row level security;
alter table vibe_check_knocks                  enable row level security;
alter table swipes                             enable row level security;
alter table matches                            enable row level security;
alter table messages                           enable row level security;
alter table saved_profiles                     enable row level security;
alter table blocks                             enable row level security;
alter table reports                            enable row level security;
alter table pets                               enable row level security;
alter table pet_cosmetics                      enable row level security;
alter table desperation_points_ledger          enable row level security;
alter table desperation_points_balance         enable row level security;
alter table desperation_points_daily_actions   enable row level security;
alter table chaos_coins_ledger                 enable row level security;
alter table chaos_coins_balance                enable row level security;
alter table push_tokens                        enable row level security;
alter table profile_skins                      enable row level security;
alter table but_why_aggregates                 enable row level security;

-- Convenience: current user's profile_id (used repeatedly in policies)
create or replace function auth_profile_id()
returns uuid language sql stable security definer as $$
  select id from profiles
  where user_id = (select id from users where auth_id = auth.uid())
  limit 1;
$$;

-- users: own row only
create policy users_own on users
  for all using (auth.uid() = auth_id);

-- profiles: own row for all operations
create policy profiles_own on profiles
  for all using (
    user_id = (select id from users where auth_id = auth.uid())
  );

-- profiles: others are readable if visible, not blocked
create policy profiles_others_read on profiles
  for select using (
    is_visible = true and is_paused = false and vibe_check_passed = true
    and not exists (
      select 1 from blocks
      where (blocker_id = profiles.id and blocked_id = auth_profile_id())
         or (blocked_id = profiles.id and blocker_id = auth_profile_id())
    )
  );

-- matches: both participants can read/update
create policy matches_participants on matches
  for all using (
    user_a_id = auth_profile_id() or user_b_id = auth_profile_id()
  );

-- messages: both match participants can read
create policy messages_read on messages
  for select using (
    exists (
      select 1 from matches m where m.id = messages.match_id
        and (m.user_a_id = auth_profile_id() or m.user_b_id = auth_profile_id())
    )
  );

-- messages: only sender can insert
create policy messages_sender_insert on messages
  for insert with check (sender_id = auth_profile_id());

-- red_flags, prompts: read-only for all authenticated users
create policy red_flags_read on red_flags
  for select using (auth.role() = 'authenticated');
create policy prompts_read on prompts
  for select using (auth.role() = 'authenticated');

-- All remaining own-data tables: same auth_profile_id() pattern
-- (abbreviated — each follows profiles_own above)
create policy profile_photos_own on profile_photos
  for all using (profile_id = auth_profile_id());
create policy profile_red_flags_own on profile_red_flags
  for all using (profile_id = auth_profile_id());
create policy profile_prompts_own on profile_prompts
  for all using (profile_id = auth_profile_id());
create policy ex_entries_own on ex_entries
  for all using (profile_id = auth_profile_id());
create policy pets_own on pets
  for all using (profile_id = auth_profile_id());
create policy pets_read on pets
  for select using (true);  -- pets visible on profiles; edit-own only above
create policy saved_profiles_own on saved_profiles
  for all using (saver_id = auth_profile_id());
create policy blocks_own on blocks
  for all using (blocker_id = auth_profile_id());
create policy reports_own_insert on reports
  for insert with check (reporter_id = auth_profile_id());
create policy but_why_own on but_why_aggregates
  for select using (profile_id = auth_profile_id());  -- owner only
create policy dp_balance_own on desperation_points_balance
  for select using (user_id = (select id from users where auth_id = auth.uid()));
create policy cc_balance_own on chaos_coins_balance
  for select using (user_id = (select id from users where auth_id = auth.uid()));

-- Red flag ick counts are publicly readable (community ranking)
create policy ick_counts_read on red_flag_ick_counts
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- END OF SCHEMA
-- ============================================================

-- ============================================================
-- SCHEMA ADDITIONS FROM ALGORITHM DOCUMENT
-- Appended: 2026-05-28
-- ============================================================

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

-- Trigger: match creation resets desperation boost eligibility
CREATE OR REPLACE FUNCTION trigger_match_resets_boost()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET desperation_boost_eligible     = false,
      desperation_boost_activated_at = NULL
  WHERE id IN (NEW.user_a_id, NEW.user_b_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER match_created_reset_boost
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION trigger_match_resets_boost();

-- Trigger: chaos score recompute when ex_entries added or soft-deleted
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

-- Trigger: chaos score recompute when photos added or removed
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

-- Trigger: chaos score recompute when prompts added or removed
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

-- ============================================================
-- END OF ALGORITHM ADDITIONS
-- ============================================================

-- ============================================================
-- SCHEMA ADDITIONS FROM EDGE FUNCTIONS DOCUMENT
-- Appended: 2026-05-28
-- ============================================================

-- bonus_swipes_balance: awarded via Chaos Packs, consumed before
-- the daily free swipe allowance. Does not count against the 20/day cap.
ALTER TABLE profiles
  ADD COLUMN bonus_swipes_balance integer not null default 0
  CHECK (bonus_swipes_balance >= 0);

-- complete_vibe_check: SQL function called by edge function when
-- the 24-hour rejection timer expires (either via knock or cron).
-- Sets vibe_check_passed and clears the timer fields.
CREATE OR REPLACE FUNCTION complete_vibe_check(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET vibe_check_passed      = true,
      vibe_check_passed_at   = now(),
      vibe_check_timer_expiry = NULL
  WHERE user_id = p_user_id
    AND vibe_check_passed = false;
  -- No-op if already passed (idempotent — safe to call multiple times)
END; $$;

-- see_who_liked_tokens: awarded via Chaos Packs / The Spiral.
-- Each token gives one non-subscriber "see who liked you" use (24h window).
CREATE TABLE see_who_liked_tokens (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  awarded_at  timestamptz not null default now(),
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '24 hours')
);
CREATE INDEX ON see_who_liked_tokens(user_id) WHERE used_at IS NULL;

-- super_ick_credits: awarded via Chaos Packs.
-- Each credit = one Super Ick use without spending 50 coins.
CREATE TABLE super_ick_credits (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references users(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  used_at    timestamptz
);
CREATE INDEX ON super_ick_credits(user_id) WHERE used_at IS NULL;

-- chaos_crown: awarded via Full Collapse pack (5% chance).
-- Badge that reads "survivor" with no other function.
-- Stored as a boolean on profiles — only one exists, can't stack.
ALTER TABLE profiles
  ADD COLUMN has_chaos_crown boolean not null default false;

-- RLS for new tables
ALTER TABLE see_who_liked_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_ick_credits     ENABLE ROW LEVEL SECURITY;

CREATE POLICY see_who_liked_own ON see_who_liked_tokens
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY super_ick_credits_own ON super_ick_credits
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- ============================================================
-- END OF EDGE FUNCTIONS ADDITIONS
-- ============================================================

-- ============================================================
-- SCHEMA ADDITIONS FROM DP SPEND RATES DOCUMENT
-- Appended: 2026-05-28
-- ============================================================

-- New columns on profiles
ALTER TABLE profiles
  ADD COLUMN chaos_score_frozen_until  timestamptz,
  ADD COLUMN chaos_score_frozen_value  integer,
  ADD COLUMN temp_accent_slug          text,
  ADD COLUMN temp_accent_expires_at    timestamptz;

-- New column on matches (expiry extension — once per match)
ALTER TABLE matches
  ADD COLUMN expiry_extended_at timestamptz;

-- profile_resurrections: DP-spend that re-exposes profile to
-- users who passed in the last 14 days
CREATE TABLE profile_resurrections (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  activated_at   timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '14 days'),
  dp_spent       integer not null
);
CREATE INDEX ON profile_resurrections(profile_id, activated_at);
ALTER TABLE profile_resurrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY resurrections_own ON profile_resurrections
  FOR ALL USING (profile_id = auth_profile_id());

-- pet_name_history: tracks every name a pet has had
-- Flavour feature — visible in pet settings
CREATE TABLE pet_name_history (
  id          uuid primary key default uuid_generate_v4(),
  pet_id      uuid not null references pets(id) on delete cascade,
  name        text not null,
  changed_at  timestamptz not null default now(),
  dp_spent    integer not null default 0  -- 0 for first name
);
CREATE INDEX ON pet_name_history(pet_id, changed_at);
ALTER TABLE pet_name_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_name_history_own ON pet_name_history
  FOR SELECT USING (
    pet_id IN (SELECT id FROM pets WHERE profile_id = auth_profile_id())
  );

-- Trigger: on pet insert, record the initial name in history
CREATE OR REPLACE FUNCTION trigger_pet_initial_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pet_name_history (pet_id, name, dp_spent)
  VALUES (NEW.id, NEW.name, 0);
  RETURN NEW;
END; $$;

CREATE TRIGGER pet_name_on_create
  AFTER INSERT ON pets
  FOR EACH ROW EXECUTE FUNCTION trigger_pet_initial_name();

-- ============================================================
-- END OF DP SPEND RATES ADDITIONS
-- ============================================================
