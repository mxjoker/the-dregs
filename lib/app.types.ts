// App-level type aliases — kept separate from the generated DB types.
// These were previously inlined in database.types.ts.

// ─── Profile enum types ───────────────────────────────────────────────────────

export type EmploymentStatus =
  | 'technically_consulting' | 'funemployed' | 'its_complicated'
  | 'between_callings' | 'employed_unfortunately' | 'self_employed_loosely'
  | 'working_on_something' | 'in_a_band' | 'full_time_creative'
  | 'student_professionally' | 'freelance_everything' | 'on_sabbatical_unplanned';

export type LookingForOption =
  | 'emotional_damage' | 'someone_to_blame' | 'situationship_with_potential'
  | 'chaos_but_make_it_romantic' | 'someone_who_texts_back'
  | 'a_reason_to_stay_in_this_city' | 'to_be_perceived'
  | 'mostly_this_app_to_work_out' | 'something_undefined'
  | 'a_person_not_a_project' | 'my_keys_and_also_love'
  | 'to_relocate_for_wrong_reasons';

export type RelationshipStructure =
  | 'monogamous' | 'ethically_non_monogamous' | 'polyamorous'
  | 'open_relationship' | 'relationship_anarchist' | 'solo_poly'
  | 'still_figuring_it_out' | 'its_complicated'
  | 'not_a_conversation_im_having_on_app';

export type GenderIdentityOption =
  | 'man' | 'woman' | 'non_binary' | 'genderfluid' | 'genderqueer'
  | 'agender' | 'transgender_man' | 'transgender_woman' | 'two_spirit'
  | 'intersex' | 'questioning' | 'self_describe' | 'prefer_not_to_say';

export type PronounsOption =
  | 'he_him' | 'she_her' | 'they_them' | 'he_they' | 'she_they'
  | 'any_pronouns' | 'ask_me' | 'self_describe';

export type ExReviewFraming = 'work_history' | 'verified_purchases';
export type ExVerifiedBadge = 'verified_situationship' | 'verified_chaos';
export type OnboardingStep =
  | 'not_started' | 'basics' | 'disaster_profile' | 'ex_reviews' | 'prompts' | 'complete';

// ─── Discover / swipe types ───────────────────────────────────────────────────

export type SwipeAction = 'pass' | 'like' | 'ick';

export type ProfilePhoto = {
  id: string;
  profile_id: string;
  storage_path: string;
  display_order: number;
  uploaded_at: string;
};

export type RedFlag = {
  id: string;
  slug: string;
  label: string;
  certified_chaotic: boolean;
  points: number;
  ick_count: number;
};

export type ProfileRedFlag = {
  id: string;
  profile_id: string;
  red_flag_id: string;
  red_flags: RedFlag;
};

export type SwipeRecord = {
  id: string;
  swiper_id: string;
  swiped_id: string;
  action: SwipeAction;
  swiped_at: string;
  targeted_flag_id: string | null;
  but_why_tag: string | null;
};

export type Match = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'active' | 'silent' | 'expired' | 'door_open' | 'unmatched';
  matched_at: string;
};

export type ButWhyAggregate = {
  profile_id: string;
  tag_slug: string;
  count: number;
};

// Shape returned by assemble_stack edge function
export type StackEntry = {
  profile_id: string;
  score: number;
};

// Filters stored in AsyncStorage + synced to profile row
export type DiscoverFilters = {
  maxDistanceKm: number;
  minAge: number;
  maxAge: number;
  relationshipStructure: string | null;
};

export const DEFAULT_FILTERS: DiscoverFilters = {
  maxDistanceKm: 50,
  minAge: 18,
  maxAge: 99,
  relationshipStructure: null,
};
