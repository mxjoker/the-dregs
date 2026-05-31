-- get_discover_candidates
-- Called by the assemble_stack edge function (service role).
-- Returns scored candidate rows for the discover stack.
-- Eligibility rules mirror The_Dregs_Algorithm_2026-05-28.md Section 2.

CREATE OR REPLACE FUNCTION get_discover_candidates(
  p_viewer_id            uuid,
  p_max_dist_m           float,
  p_min_dob              date,
  p_max_dob              date,
  p_rel_filter           text        DEFAULT NULL,
  p_already_served_ids   uuid[]      DEFAULT '{}',
  p_page_size            int         DEFAULT 200
)
RETURNS TABLE (
  profile_id                      uuid,
  chaos_score                     int,
  shared_flag_count               bigint,
  days_since_update               float,
  desperation_boost_eligible      boolean,
  desperation_boost_activated_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER  -- runs as owner (service role), bypasses RLS for perf
AS $$
  SELECT
    p.id                              AS profile_id,
    p.chaos_score,

    -- Shared red flag count (scoring Component B)
    (
      SELECT COUNT(*)
      FROM profile_red_flags prf_them
      JOIN profile_red_flags prf_me
        ON prf_them.red_flag_id = prf_me.red_flag_id
      WHERE prf_them.profile_id = p.id
        AND prf_me.profile_id   = p_viewer_id
    )::bigint                         AS shared_flag_count,

    -- Days since profile updated (scoring Component C)
    EXTRACT(EPOCH FROM (now() - p.updated_at)) / 86400.0
                                      AS days_since_update,

    p.desperation_boost_eligible,
    p.desperation_boost_activated_at

  FROM profiles p
  JOIN users u ON u.id = p.user_id

  WHERE
    -- Hard eligibility (E1–E5)
    p.vibe_check_passed   = true
    AND p.onboarding_step = 'complete'
    AND p.is_visible      = true
    AND p.is_paused       = false
    AND u.deleted_at      IS NULL
    AND u.is_banned       = false

    -- Not self (E6)
    AND p.id != p_viewer_id

    -- Not already swiped (E7) — second thoughts handled separately
    AND NOT EXISTS (
      SELECT 1 FROM swipes s
      WHERE s.swiper_id = p_viewer_id
        AND s.swiped_id = p.id
    )

    -- No block in either direction (E8)
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id        AND b.blocked_id = p_viewer_id)
    )

    -- Distance filter (E9) — skipped until PostGIS is enabled
    -- AND ST_Distance(p.location, viewer.location) <= p_max_dist_m

    -- Age filter (E10)
    AND u.date_of_birth BETWEEN p_min_dob AND p_max_dob

    -- Relationship structure filter (E11, optional)
    AND (p_rel_filter IS NULL OR p.relationship_structure = p_rel_filter)

    -- Exclude profiles already served this session
    AND (
      array_length(p_already_served_ids, 1) IS NULL
      OR p.id != ALL(p_already_served_ids)
    )

  ORDER BY p.id  -- stable sort; actual ranking done in function layer
  LIMIT p_page_size;
$$;
