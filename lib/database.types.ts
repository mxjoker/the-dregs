// Minimal hand-written types for tables used so far.
// Replace with full generated types by running:
//   npx supabase gen types typescript --project-id uhqulmxdcjkpxbxsatug > lib/database.types.ts

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

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          date_of_birth: string;
          created_at: string;
          deleted_at: string | null;
          is_banned: boolean;
          ban_reason: string | null;
          account_number: number;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          date_of_birth: string;
          created_at?: string;
          deleted_at?: string | null;
          is_banned?: boolean;
          ban_reason?: string | null;
          account_number?: number;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          date_of_birth?: string;
          created_at?: string;
          deleted_at?: string | null;
          is_banned?: boolean;
          ban_reason?: string | null;
          account_number?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          pronouns: PronounsOption;
          pronouns_text: string | null;
          gender_identity: GenderIdentityOption;
          gender_identity_text: string | null;
          employment_status: EmploymentStatus | null;
          looking_for: LookingForOption | null;
          relationship_structure: RelationshipStructure | null;
          biggest_failure: string | null;
          ex_review_framing: ExReviewFraming;
          onboarding_step: OnboardingStep;
          vibe_check_passed: boolean;
          vibe_check_passed_at: string | null;
          vibe_check_timer_expiry: string | null;
          chaos_score: number;
          is_visible: boolean;
          is_paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          pronouns?: PronounsOption;
          pronouns_text?: string | null;
          gender_identity?: GenderIdentityOption;
          gender_identity_text?: string | null;
          onboarding_step?: OnboardingStep;
          vibe_check_passed?: boolean;
        };
        Update: {
          display_name?: string;
          pronouns?: PronounsOption;
          pronouns_text?: string | null;
          gender_identity?: GenderIdentityOption;
          gender_identity_text?: string | null;
          employment_status?: EmploymentStatus | null;
          looking_for?: LookingForOption | null;
          relationship_structure?: RelationshipStructure | null;
          biggest_failure?: string | null;
          ex_review_framing?: ExReviewFraming;
          onboarding_step?: OnboardingStep;
          vibe_check_passed?: boolean;
          vibe_check_timer_expiry?: string | null;
          is_visible?: boolean;
          is_paused?: boolean;
        };
        Relationships: [];
      };
      prompts: {
        Row: {
          id: string;
          slug: string;
          prompt_text: string;
          display_order: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profile_prompts: {
        Row: {
          id: string;
          profile_id: string;
          prompt_id: string;
          answer: string;
          display_order: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          prompt_id: string;
          answer: string;
          display_order: number;
          answered_at?: string;
        };
        Update: {
          answer?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      profile_photos: {
        Row: {
          id: string;
          profile_id: string;
          storage_path: string;
          display_order: number;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          storage_path: string;
          display_order: number;
          uploaded_at?: string;
        };
        Update: {
          storage_path?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      ex_entries: {
        Row: {
          id: string;
          profile_id: string;
          display_order: number;
          nickname: string;
          wh_job_title: string | null;
          wh_start_date: string | null;
          wh_end_date: string | null;
          wh_role_description: string | null;
          wh_reason_for_leaving: string | null;
          vp_star_rating: number | null;
          vp_review_title: string | null;
          vp_review_body: string | null;
          vp_badge: ExVerifiedBadge | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          display_order: number;
          nickname: string;
          wh_job_title?: string | null;
          wh_start_date?: string | null;
          wh_end_date?: string | null;
          wh_role_description?: string | null;
          wh_reason_for_leaving?: string | null;
          vp_star_rating?: number | null;
          vp_review_title?: string | null;
          vp_review_body?: string | null;
          vp_badge?: ExVerifiedBadge | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      vibe_check_knocks: {
        Row: { id: string; user_id: string; tapped_at: string };
        Insert: { id?: string; user_id: string; tapped_at?: string };
        Update: never;
        Relationships: [];
      };
      desperation_points_balance: {
        Row: { user_id: string; balance: number; updated_at: string };
        Insert: { user_id: string; balance?: number; updated_at?: string };
        Update: { balance?: number; updated_at?: string };
        Relationships: [];
      };
      chaos_coins_balance: {
        Row: { user_id: string; balance: number; updated_at: string };
        Insert: { user_id: string; balance?: number; updated_at?: string };
        Update: { balance?: number; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      decrement_vibe_check_timer: {
        Args: { p_user_id: string };
        Returns: void;
      };
      complete_vibe_check: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
};

// ─── Additional types for Discover / Swipe ────────────────────────────────

export type SwipeAction = 'pass' | 'like' | 'ick';

export type ProfilePhoto = {
  id: string;
  profile_id: string;
  storage_path: string;
  display_order: number; // 1–6
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
  red_flags: RedFlag; // joined
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
  relationshipStructure: string | null; // null = off
};

export const DEFAULT_FILTERS: DiscoverFilters = {
  maxDistanceKm: 50,
  minAge: 18,
  maxAge: 99,
  relationshipStructure: null,
};
