-- =============================================================
-- The Dregs — test profile seed data
-- Run in Supabase SQL editor.
-- Creates 9 additional test profiles (no photos — by design).
-- All profiles: onboarding_step='complete', vibe_check_passed=true,
--               is_visible=true — ready to appear in discover stack.
-- chaos_score auto-computed by trigger on profile INSERT + flag INSERT.
-- =============================================================

DO $$
DECLARE
  -- user IDs
  u_margot uuid;
  u_theo   uuid;
  u_ravi   uuid;
  u_jules  uuid;
  u_sasha  uuid;
  u_finn   uuid;
  u_priya  uuid;
  u_clem   uuid;
  u_dex    uuid;

  -- profile IDs
  p_margot uuid;
  p_theo   uuid;
  p_ravi   uuid;
  p_jules  uuid;
  p_sasha  uuid;
  p_finn   uuid;
  p_priya  uuid;
  p_clem   uuid;
  p_dex    uuid;

BEGIN

  -- ────────────────────────────────────────────────────────
  -- USERS
  -- ────────────────────────────────────────────────────────

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'margot@dregs.test', '1993-03-15')
    RETURNING id INTO u_margot;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'theo@dregs.test', '1996-07-22')
    RETURNING id INTO u_theo;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'ravi@dregs.test', '1998-11-04')
    RETURNING id INTO u_ravi;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'jules@dregs.test', '2000-02-28')
    RETURNING id INTO u_jules;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'sasha@dregs.test', '1994-09-10')
    RETURNING id INTO u_sasha;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'finn@dregs.test', '1991-05-30')
    RETURNING id INTO u_finn;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'priya@dregs.test', '1997-12-19')
    RETURNING id INTO u_priya;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'clem@dregs.test', '1999-08-07')
    RETURNING id INTO u_clem;

  INSERT INTO users (auth_id, email, date_of_birth)
    VALUES (gen_random_uuid(), 'dex@dregs.test', '1995-04-23')
    RETURNING id INTO u_dex;


  -- ────────────────────────────────────────────────────────
  -- PROFILES
  -- ────────────────────────────────────────────────────────

  -- Margot — she/her, woman, funemployed, emotional_damage
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_margot, 'Margot',
    'woman', 'she_her',
    'funemployed', 'emotional_damage', 'still_figuring_it_out',
    'Quit a stable job to sell handmade candles. Burned down a shelf. Pivoted to nothing.',
    'work_history',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_margot;

  -- Theo — they/them, non_binary, technically_consulting, situationship_with_potential
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_theo, 'Theo',
    'non_binary', 'they_them',
    'technically_consulting', 'situationship_with_potential', 'ethically_non_monogamous',
    'Consulted on a rebrand. They went with a different font. I still think about it.',
    'verified_purchases',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_theo;

  -- Ravi — he/him, man, in_a_band, chaos_but_make_it_romantic
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_ravi, 'Ravi',
    'man', 'he_him',
    'in_a_band', 'chaos_but_make_it_romantic', 'its_complicated',
    'The band was good. The merch store had a typo. We sold 40 shirts that said ''Ravi & The Vibs''.',
    'work_history',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_ravi;

  -- Jules — she/they, genderfluid, student_professionally, someone_who_texts_back
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_jules, 'Jules',
    'genderfluid', 'she_they',
    'student_professionally', 'someone_who_texts_back', 'monogamous',
    'Professionally a student for six years. Different degrees. Same existential uncertainty.',
    'verified_purchases',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_jules;

  -- Sasha — any_pronouns, agender, freelance_everything, something_undefined
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_sasha, 'Sasha',
    'agender', 'any_pronouns',
    'freelance_everything', 'something_undefined', 'relationship_anarchist',
    'Freelanced everything at once. Invoiced three clients in the wrong currency. Still figuring it out.',
    'work_history',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_sasha;

  -- Finn — he/him, man, between_callings, a_reason_to_stay_in_this_city
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_finn, 'Finn',
    'man', 'he_him',
    'between_callings', 'a_reason_to_stay_in_this_city', 'open_relationship',
    'Left a stable career to find my calling. Calling hasn''t called. It''s been two years.',
    'work_history',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_finn;

  -- Priya — she/her, woman, employed_unfortunately, to_be_perceived
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_priya, 'Priya',
    'woman', 'she_her',
    'employed_unfortunately', 'to_be_perceived', 'solo_poly',
    'Got a promotion I didn''t want. Accepted it anyway. Have been declining internally ever since.',
    'verified_purchases',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_priya;

  -- Clem — they/them, non_binary, working_on_something, my_keys_and_also_love
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_clem, 'Clem',
    'non_binary', 'they_them',
    'working_on_something', 'my_keys_and_also_love', 'not_a_conversation_im_having_on_app',
    'The thing I''m working on. It''s been two years. It''ll be done soon. I''ve said that before.',
    'work_history',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_clem;

  -- Dex — he/him, man, on_sabbatical_unplanned, someone_to_blame
  INSERT INTO profiles (
    user_id, display_name,
    gender_identity, pronouns,
    employment_status, looking_for, relationship_structure,
    biggest_failure, ex_review_framing,
    onboarding_step, vibe_check_passed, vibe_check_passed_at, onboarding_completed_at,
    is_visible
  ) VALUES (
    u_dex, 'Dex',
    'man', 'he_him',
    'on_sabbatical_unplanned', 'someone_to_blame', 'polyamorous',
    'Quit my job ''to travel.'' Moved to a city 20 minutes away. Still technically on sabbatical.',
    'verified_purchases',
    'complete', true, now(), now(),
    true
  ) RETURNING id INTO p_dex;


  -- ────────────────────────────────────────────────────────
  -- RED FLAGS
  -- (trigger on profile_red_flags re-computes chaos_score after each insert)
  -- ────────────────────────────────────────────────────────

  INSERT INTO profile_red_flags (profile_id, red_flag_id) VALUES
    -- Margot
    (p_margot, (SELECT id FROM red_flags WHERE slug = 'ghosts_then_reappears')),
    (p_margot, (SELECT id FROM red_flags WHERE slug = 'does_not_own_curtains')),
    (p_margot, (SELECT id FROM red_flags WHERE slug = 'in_therapy_not_applying_it')),
    -- Theo
    (p_theo, (SELECT id FROM red_flags WHERE slug = 'matches_and_never_messages')),
    (p_theo, (SELECT id FROM red_flags WHERE slug = 'main_character_syndrome')),
    (p_theo, (SELECT id FROM red_flags WHERE slug = 'will_not_dtr')),
    -- Ravi
    (p_ravi, (SELECT id FROM red_flags WHERE slug = 'love_bombed_someone')),
    (p_ravi, (SELECT id FROM red_flags WHERE slug = 'sends_voice_notes_over_4_mins')),
    (p_ravi, (SELECT id FROM red_flags WHERE slug = 'romanticises_own_dysfunction')),
    -- Jules
    (p_jules, (SELECT id FROM red_flags WHERE slug = 'emotionally_unavailable')),
    (p_jules, (SELECT id FROM red_flags WHERE slug = 'cancels_last_minute')),
    (p_jules, (SELECT id FROM red_flags WHERE slug = 'cries_at_adverts')),
    -- Sasha
    (p_sasha, (SELECT id FROM red_flags WHERE slug = 'situationship_veteran')),
    (p_sasha, (SELECT id FROM red_flags WHERE slug = 'knows_all_attachment_styles')),
    (p_sasha, (SELECT id FROM red_flags WHERE slug = 'has_a_podcast')),
    -- Finn
    (p_finn, (SELECT id FROM red_flags WHERE slug = 'replies_in_3_days')),
    (p_finn, (SELECT id FROM red_flags WHERE slug = 'rearranges_furniture')),
    (p_finn, (SELECT id FROM red_flags WHERE slug = 'started_a_business_once')),
    -- Priya
    (p_priya, (SELECT id FROM red_flags WHERE slug = 'still_has_exs_hoodie')),
    (p_priya, (SELECT id FROM red_flags WHERE slug = 'read_receipts_on')),
    (p_priya, (SELECT id FROM red_flags WHERE slug = 'dates_people_with_potential')),
    -- Clem
    (p_clem, (SELECT id FROM red_flags WHERE slug = 'talks_about_their_ex_constantly')),
    (p_clem, (SELECT id FROM red_flags WHERE slug = 'love_bombed_by_someone')),
    (p_clem, (SELECT id FROM red_flags WHERE slug = 'cannot_make_plans')),
    -- Dex
    (p_dex, (SELECT id FROM red_flags WHERE slug = 'ghosts_then_reappears')),
    (p_dex, (SELECT id FROM red_flags WHERE slug = 'will_not_dtr')),
    (p_dex, (SELECT id FROM red_flags WHERE slug = 'main_character_syndrome'));


  -- ────────────────────────────────────────────────────────
  -- PROMPT ANSWERS
  -- ────────────────────────────────────────────────────────

  INSERT INTO profile_prompts (profile_id, prompt_id, answer, display_order) VALUES
    -- Margot
    (p_margot, (SELECT id FROM prompts WHERE slug = 'most_impressive_failure'),
     'Started a podcast. Three episodes. One was just ambient noise. The outro was me crying softly.',
     1),
    (p_margot, (SELECT id FROM prompts WHERE slug = 'terrible_partner_if'),
     'You need someone who answers texts the same day. I''m more of a same-week person, optimistically.',
     2),

    -- Theo
    (p_theo, (SELECT id FROM prompts WHERE slug = 'swipe_right_if'),
     'You enjoy being perceived but not known. I''m the same. We''ll get along fine.',
     1),
    (p_theo, (SELECT id FROM prompts WHERE slug = 'peaked_when'),
     'Peaked at 24 when I had strong opinions about cold brew and a personality to match.',
     2),
    (p_theo, (SELECT id FROM prompts WHERE slug = 'love_language'),
     'Unsolicited playlists and a 3-day texting delay that means nothing, I promise.',
     3),

    -- Ravi
    (p_ravi, (SELECT id FROM prompts WHERE slug = 'a_lot_to_deal_with'),
     'I send voice notes when I should send texts. Long ones. I know. I''m working on it.',
     1),
    (p_ravi, (SELECT id FROM prompts WHERE slug = 'red_flag_most_proud_of'),
     'Voice notes over 4 minutes. I have things to say and I need you to hear my tone.',
     2),

    -- Jules
    (p_jules, (SELECT id FROM prompts WHERE slug = 'therapist_would_say'),
     'Avoidant, but charming about it. Her words. I''m choosing to take it as a compliment.',
     1),
    (p_jules, (SELECT id FROM prompts WHERE slug = 'know_its_going_well'),
     'You send me a meme at 11pm and I respond before midnight. That''s how I say I like you.',
     2),

    -- Sasha
    (p_sasha, (SELECT id FROM prompts WHERE slug = 'learned_most_from'),
     'The situationship where neither of us used the word situationship but we both knew.',
     1),
    (p_sasha, (SELECT id FROM prompts WHERE slug = 'two_truths_situationship'),
     'I have a podcast. It''s actually good. I have unresolved feelings about my last cohost.',
     2),

    -- Finn
    (p_finn, (SELECT id FROM prompts WHERE slug = 'last_thing_i_quit'),
     'The city I was supposed to stay in. Then the relationship. Then the idea of stability.',
     1),
    (p_finn, (SELECT id FROM prompts WHERE slug = 'swipe_right_if'),
     'You''re okay with slow replies. Not ghosting — I''ll always come back. Just need three days.',
     2),

    -- Priya
    (p_priya, (SELECT id FROM prompts WHERE slug = 'most_impressive_failure'),
     'Stayed in a job I hated for three years because the office had good snacks. Not joking.',
     1),
    (p_priya, (SELECT id FROM prompts WHERE slug = 'peaked_when'),
     '2021. I had nowhere to be, unlimited snacks, and a very clear sense of my own limitations.',
     2),

    -- Clem
    (p_clem, (SELECT id FROM prompts WHERE slug = 'a_lot_to_deal_with'),
     'I''ll mention my ex exactly once. Maybe twice. Definitely not a third time. We''ll see.',
     1),
    (p_clem, (SELECT id FROM prompts WHERE slug = 'terrible_partner_if'),
     'You like concrete plans. I like plans in principle and see what manifests. Different things.',
     2),

    -- Dex
    (p_dex, (SELECT id FROM prompts WHERE slug = 'peaked_when'),
     'When I was briefly the most interesting person in a room. I''ve been chasing that room since.',
     1),
    (p_dex, (SELECT id FROM prompts WHERE slug = 'know_its_going_well'),
     'You stop narrating your day in real-time and start sending me just the parts that matter.',
     2);

END $$;
