// Minimal hand-written types for tables used in auth.
// Replace with full generated types by running:
//   npx supabase gen types typescript --project-id uhqulmxdcjkpxbxsatug > lib/database.types.ts

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
          onboarding_step: 'not_started' | 'basics' | 'disaster_profile' | 'ex_reviews' | 'prompts' | 'complete';
          vibe_check_passed: boolean;
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
          onboarding_step?: 'not_started' | 'basics' | 'disaster_profile' | 'ex_reviews' | 'prompts' | 'complete';
          vibe_check_passed?: boolean;
        };
        Update: {
          display_name?: string;
          onboarding_step?: 'not_started' | 'basics' | 'disaster_profile' | 'ex_reviews' | 'prompts' | 'complete';
          vibe_check_passed?: boolean;
          is_visible?: boolean;
          is_paused?: boolean;
        };
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
