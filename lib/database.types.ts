export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      auto_match_tokens: {
        Row: {
          id: string
          match_id: string | null
          purchaser_id: string
          target_id: string
          used_at: string
        }
        Insert: {
          id?: string
          match_id?: string | null
          purchaser_id: string
          target_id: string
          used_at?: string
        }
        Update: {
          id?: string
          match_id?: string | null
          purchaser_id?: string
          target_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_match_tokens_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_match_tokens_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches_with_context"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_match_tokens_purchaser_id_fkey"
            columns: ["purchaser_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_match_tokens_purchaser_id_fkey"
            columns: ["purchaser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_match_tokens_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_match_tokens_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_at: string
          blocked_id: string
          blocker_id: string
          id: string
        }
        Insert: {
          blocked_at?: string
          blocked_id: string
          blocker_id: string
          id?: string
        }
        Update: {
          blocked_at?: string
          blocked_id?: string
          blocker_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      but_why_aggregates: {
        Row: {
          count: number
          profile_id: string
          tag_slug: string
        }
        Insert: {
          count?: number
          profile_id: string
          tag_slug: string
        }
        Update: {
          count?: number
          profile_id?: string
          tag_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "but_why_aggregates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "but_why_aggregates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chaos_coins_balance: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaos_coins_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chaos_coins_ledger: {
        Row: {
          created_at: string
          delta: number
          iap_transaction_id: string | null
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          iap_transaction_id?: string | null
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          iap_transaction_id?: string | null
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaos_coins_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chaos_pack_openings: {
        Row: {
          coins_spent: number
          id: string
          opened_at: string
          outcome: Json
          tier: Database["public"]["Enums"]["chaos_pack_tier"]
          user_id: string
        }
        Insert: {
          coins_spent: number
          id?: string
          opened_at?: string
          outcome: Json
          tier: Database["public"]["Enums"]["chaos_pack_tier"]
          user_id: string
        }
        Update: {
          coins_spent?: number
          id?: string
          opened_at?: string
          outcome?: Json
          tier?: Database["public"]["Enums"]["chaos_pack_tier"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaos_pack_openings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      desperation_points_balance: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desperation_points_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      desperation_points_daily_actions: {
        Row: {
          action_date: string
          daily_login_claimed: boolean
          hold_claimed: boolean
          knock_taps_today: number
          midnight_claimed: boolean
          shake_claimed: boolean
          user_id: string
        }
        Insert: {
          action_date: string
          daily_login_claimed?: boolean
          hold_claimed?: boolean
          knock_taps_today?: number
          midnight_claimed?: boolean
          shake_claimed?: boolean
          user_id: string
        }
        Update: {
          action_date?: string
          daily_login_claimed?: boolean
          hold_claimed?: boolean
          knock_taps_today?: number
          midnight_claimed?: boolean
          shake_claimed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desperation_points_daily_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      desperation_points_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desperation_points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ex_entries: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          id: string
          nickname: string
          profile_id: string
          vp_badge: Database["public"]["Enums"]["ex_verified_badge"] | null
          vp_review_body: string | null
          vp_review_title: string | null
          vp_star_rating: number | null
          wh_end_date: string | null
          wh_job_title: string | null
          wh_reason_for_leaving: string | null
          wh_role_description: string | null
          wh_start_date: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order: number
          id?: string
          nickname: string
          profile_id: string
          vp_badge?: Database["public"]["Enums"]["ex_verified_badge"] | null
          vp_review_body?: string | null
          vp_review_title?: string | null
          vp_star_rating?: number | null
          wh_end_date?: string | null
          wh_job_title?: string | null
          wh_reason_for_leaving?: string | null
          wh_role_description?: string | null
          wh_start_date?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          nickname?: string
          profile_id?: string
          vp_badge?: Database["public"]["Enums"]["ex_verified_badge"] | null
          vp_review_body?: string | null
          vp_review_title?: string | null
          vp_star_rating?: number | null
          wh_end_date?: string | null
          wh_job_title?: string | null
          wh_reason_for_leaving?: string | null
          wh_role_description?: string | null
          wh_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ex_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ex_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      iap_receipts: {
        Row: {
          amount_usd_cents: number | null
          apple_product_id: string
          apple_transaction_id: string
          created_at: string
          id: string
          product_type: Database["public"]["Enums"]["iap_product_type"]
          purchased_at: string
          user_id: string
        }
        Insert: {
          amount_usd_cents?: number | null
          apple_product_id: string
          apple_transaction_id: string
          created_at?: string
          id?: string
          product_type: Database["public"]["Enums"]["iap_product_type"]
          purchased_at: string
          user_id: string
        }
        Update: {
          amount_usd_cents?: number | null
          apple_product_id?: string
          apple_transaction_id?: string
          created_at?: string
          id?: string
          product_type?: Database["public"]["Enums"]["iap_product_type"]
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iap_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          door_early_answer_reason: string | null
          door_knock_count: number
          door_knock_target: number | null
          door_knocked_by: string | null
          door_opened_at: string | null
          door_status: string
          expired_at: string | null
          expires_at: string | null
          expiry_extended_at: string | null
          expiry_warning_sent_at: string | null
          id: string
          last_message_at: string | null
          last_read_at_a: string | null
          last_read_at_b: string | null
          matched_at: string
          silence_notified_at: string | null
          silent_since: string | null
          status: Database["public"]["Enums"]["match_status"]
          unmatched_at: string | null
          unmatched_by: string | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          door_early_answer_reason?: string | null
          door_knock_count?: number
          door_knock_target?: number | null
          door_knocked_by?: string | null
          door_opened_at?: string | null
          door_status?: string
          expired_at?: string | null
          expires_at?: string | null
          expiry_extended_at?: string | null
          expiry_warning_sent_at?: string | null
          id?: string
          last_message_at?: string | null
          last_read_at_a?: string | null
          last_read_at_b?: string | null
          matched_at?: string
          silence_notified_at?: string | null
          silent_since?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          unmatched_at?: string | null
          unmatched_by?: string | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          door_early_answer_reason?: string | null
          door_knock_count?: number
          door_knock_target?: number | null
          door_knocked_by?: string | null
          door_opened_at?: string | null
          door_status?: string
          expired_at?: string | null
          expires_at?: string | null
          expiry_extended_at?: string | null
          expiry_warning_sent_at?: string | null
          id?: string
          last_message_at?: string | null
          last_read_at_a?: string | null
          last_read_at_b?: string | null
          matched_at?: string
          silence_notified_at?: string | null
          silent_since?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          unmatched_at?: string | null
          unmatched_by?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_door_knocked_by_fkey"
            columns: ["door_knocked_by"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_door_knocked_by_fkey"
            columns: ["door_knocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_unmatched_by_fkey"
            columns: ["unmatched_by"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_unmatched_by_fkey"
            columns: ["unmatched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          deleted_at: string | null
          digital_gift_type:
            | Database["public"]["Enums"]["digital_gift_type"]
            | null
          id: string
          is_desperation_echo: boolean
          is_midnight_send: boolean
          match_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          read_at: string | null
          sender_id: string
          sent_at: string
          system_payload: Json | null
          voice_note_duration_ms: number | null
          voice_note_mode: Database["public"]["Enums"]["voice_note_mode"] | null
          voice_note_storage_path: string | null
        }
        Insert: {
          body?: string | null
          deleted_at?: string | null
          digital_gift_type?:
            | Database["public"]["Enums"]["digital_gift_type"]
            | null
          id?: string
          is_desperation_echo?: boolean
          is_midnight_send?: boolean
          match_id: string
          message_type?: Database["public"]["Enums"]["message_type"]
          read_at?: string | null
          sender_id: string
          sent_at?: string
          system_payload?: Json | null
          voice_note_duration_ms?: number | null
          voice_note_mode?:
            | Database["public"]["Enums"]["voice_note_mode"]
            | null
          voice_note_storage_path?: string | null
        }
        Update: {
          body?: string | null
          deleted_at?: string | null
          digital_gift_type?:
            | Database["public"]["Enums"]["digital_gift_type"]
            | null
          id?: string
          is_desperation_echo?: boolean
          is_midnight_send?: boolean
          match_id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          read_at?: string | null
          sender_id?: string
          sent_at?: string
          system_payload?: Json | null
          voice_note_duration_ms?: number | null
          voice_note_mode?:
            | Database["public"]["Enums"]["voice_note_mode"]
            | null
          voice_note_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches_with_context"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_cosmetics: {
        Row: {
          acquired_at: string
          id: string
          is_animated: boolean
          is_rare: boolean
          item_display_name: string
          item_slug: string
          profile_id: string
          source: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          is_animated?: boolean
          is_rare?: boolean
          item_display_name: string
          item_slug: string
          profile_id: string
          source: string
        }
        Update: {
          acquired_at?: string
          id?: string
          is_animated?: boolean
          is_rare?: boolean
          item_display_name?: string
          item_slug?: string
          profile_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_cosmetics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_cosmetics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_name_history: {
        Row: {
          changed_at: string
          dp_spent: number
          id: string
          name: string
          pet_id: string
        }
        Insert: {
          changed_at?: string
          dp_spent?: number
          id?: string
          name: string
          pet_id: string
        }
        Update: {
          changed_at?: string
          dp_spent?: number
          id?: string
          name?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_name_history_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          accent: Database["public"]["Enums"]["pet_accent"]
          active_outfit_id: string | null
          animal: Database["public"]["Enums"]["pet_animal"]
          bribed_line: string | null
          bribed_line_expires_at: string | null
          colour_hex: string
          comeback_fee_paid_at: string | null
          created_at: string
          gone_at: string | null
          happiness: number
          id: string
          last_fed_at: string | null
          last_interacted_at: string | null
          name: string
          personality: Database["public"]["Enums"]["pet_personality"]
          profile_id: string
          state: Database["public"]["Enums"]["pet_state"]
          updated_at: string
        }
        Insert: {
          accent: Database["public"]["Enums"]["pet_accent"]
          active_outfit_id?: string | null
          animal: Database["public"]["Enums"]["pet_animal"]
          bribed_line?: string | null
          bribed_line_expires_at?: string | null
          colour_hex?: string
          comeback_fee_paid_at?: string | null
          created_at?: string
          gone_at?: string | null
          happiness?: number
          id?: string
          last_fed_at?: string | null
          last_interacted_at?: string | null
          name: string
          personality: Database["public"]["Enums"]["pet_personality"]
          profile_id: string
          state?: Database["public"]["Enums"]["pet_state"]
          updated_at?: string
        }
        Update: {
          accent?: Database["public"]["Enums"]["pet_accent"]
          active_outfit_id?: string | null
          animal?: Database["public"]["Enums"]["pet_animal"]
          bribed_line?: string | null
          bribed_line_expires_at?: string | null
          colour_hex?: string
          comeback_fee_paid_at?: string | null
          created_at?: string
          gone_at?: string | null
          happiness?: number
          id?: string
          last_fed_at?: string | null
          last_interacted_at?: string | null
          name?: string
          personality?: Database["public"]["Enums"]["pet_personality"]
          profile_id?: string
          state?: Database["public"]["Enums"]["pet_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pet_active_outfit"
            columns: ["active_outfit_id"]
            isOneToOne: false
            referencedRelation: "pet_cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_match_messages: {
        Row: {
          body: string
          id: string
          recipient_id: string
          resolution: Database["public"]["Enums"]["swipe_action"] | null
          resolved_at: string | null
          seen_at: string | null
          sender_id: string
          sent_at: string
        }
        Insert: {
          body: string
          id?: string
          recipient_id: string
          resolution?: Database["public"]["Enums"]["swipe_action"] | null
          resolved_at?: string | null
          seen_at?: string | null
          sender_id: string
          sent_at?: string
        }
        Update: {
          body?: string
          id?: string
          recipient_id?: string
          resolution?: Database["public"]["Enums"]["swipe_action"] | null
          resolved_at?: string | null
          seen_at?: string | null
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_match_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_match_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_match_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_match_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          display_order: number
          id: string
          profile_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          display_order: number
          id?: string
          profile_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          display_order?: number
          id?: string
          profile_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_prompts: {
        Row: {
          answer: string
          answered_at: string
          display_order: number
          id: string
          profile_id: string
          prompt_id: string
        }
        Insert: {
          answer: string
          answered_at?: string
          display_order: number
          id?: string
          profile_id: string
          prompt_id: string
        }
        Update: {
          answer?: string
          answered_at?: string
          display_order?: number
          id?: string
          profile_id?: string
          prompt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_prompts_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_red_flags: {
        Row: {
          profile_id: string
          red_flag_id: string
          selected_at: string
        }
        Insert: {
          profile_id: string
          red_flag_id: string
          selected_at?: string
        }
        Update: {
          profile_id?: string
          red_flag_id?: string
          selected_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_red_flags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_red_flags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_red_flags_red_flag_id_fkey"
            columns: ["red_flag_id"]
            isOneToOne: false
            referencedRelation: "red_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_resurrections: {
        Row: {
          activated_at: string
          dp_spent: number
          expires_at: string
          id: string
          profile_id: string
        }
        Insert: {
          activated_at?: string
          dp_spent: number
          expires_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          activated_at?: string
          dp_spent?: number
          expires_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_resurrections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_resurrections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skins: {
        Row: {
          acquired_at: string
          id: string
          is_active: boolean
          profile_id: string
          skin_display_name: string
          skin_slug: string
          source: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          is_active?: boolean
          profile_id: string
          skin_display_name: string
          skin_slug: string
          source: string
        }
        Update: {
          acquired_at?: string
          id?: string
          is_active?: boolean
          profile_id?: string
          skin_display_name?: string
          skin_slug?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_tag: string | null
          biggest_failure: string | null
          bonus_swipes_balance: number
          chaos_score: number
          chaos_score_frozen_until: string | null
          chaos_score_frozen_value: number | null
          chaos_score_updated_at: string | null
          created_at: string
          desperation_boost_activated_at: string | null
          desperation_boost_eligible: boolean
          display_name: string
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          ex_review_framing: Database["public"]["Enums"]["ex_review_framing"]
          gender_identity: Database["public"]["Enums"]["gender_identity_option"]
          gender_identity_text: string | null
          has_chaos_crown: boolean
          id: string
          is_paused: boolean
          is_subscribed: boolean
          is_visible: boolean
          location_lat: number | null
          location_lng: number | null
          location_updated_at: string | null
          looking_for: Database["public"]["Enums"]["looking_for_option"] | null
          max_age_pref: number
          max_distance_km: number
          min_age_pref: number
          onboarding_completed_at: string | null
          onboarding_step: Database["public"]["Enums"]["onboarding_step"]
          pronouns: Database["public"]["Enums"]["pronouns_option"]
          pronouns_text: string | null
          relationship_structure:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          subscription_expires_at: string | null
          temp_accent_expires_at: string | null
          temp_accent_slug: string | null
          updated_at: string
          user_id: string
          vibe_check_passed: boolean
          vibe_check_passed_at: string | null
          vibe_check_timer_expiry: string | null
        }
        Insert: {
          auto_tag?: string | null
          biggest_failure?: string | null
          bonus_swipes_balance?: number
          chaos_score?: number
          chaos_score_frozen_until?: string | null
          chaos_score_frozen_value?: number | null
          chaos_score_updated_at?: string | null
          created_at?: string
          desperation_boost_activated_at?: string | null
          desperation_boost_eligible?: boolean
          display_name: string
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          ex_review_framing?: Database["public"]["Enums"]["ex_review_framing"]
          gender_identity?: Database["public"]["Enums"]["gender_identity_option"]
          gender_identity_text?: string | null
          has_chaos_crown?: boolean
          id?: string
          is_paused?: boolean
          is_subscribed?: boolean
          is_visible?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_updated_at?: string | null
          looking_for?: Database["public"]["Enums"]["looking_for_option"] | null
          max_age_pref?: number
          max_distance_km?: number
          min_age_pref?: number
          onboarding_completed_at?: string | null
          onboarding_step?: Database["public"]["Enums"]["onboarding_step"]
          pronouns?: Database["public"]["Enums"]["pronouns_option"]
          pronouns_text?: string | null
          relationship_structure?:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          subscription_expires_at?: string | null
          temp_accent_expires_at?: string | null
          temp_accent_slug?: string | null
          updated_at?: string
          user_id: string
          vibe_check_passed?: boolean
          vibe_check_passed_at?: string | null
          vibe_check_timer_expiry?: string | null
        }
        Update: {
          auto_tag?: string | null
          biggest_failure?: string | null
          bonus_swipes_balance?: number
          chaos_score?: number
          chaos_score_frozen_until?: string | null
          chaos_score_frozen_value?: number | null
          chaos_score_updated_at?: string | null
          created_at?: string
          desperation_boost_activated_at?: string | null
          desperation_boost_eligible?: boolean
          display_name?: string
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          ex_review_framing?: Database["public"]["Enums"]["ex_review_framing"]
          gender_identity?: Database["public"]["Enums"]["gender_identity_option"]
          gender_identity_text?: string | null
          has_chaos_crown?: boolean
          id?: string
          is_paused?: boolean
          is_subscribed?: boolean
          is_visible?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_updated_at?: string | null
          looking_for?: Database["public"]["Enums"]["looking_for_option"] | null
          max_age_pref?: number
          max_distance_km?: number
          min_age_pref?: number
          onboarding_completed_at?: string | null
          onboarding_step?: Database["public"]["Enums"]["onboarding_step"]
          pronouns?: Database["public"]["Enums"]["pronouns_option"]
          pronouns_text?: string | null
          relationship_structure?:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          subscription_expires_at?: string | null
          temp_accent_expires_at?: string | null
          temp_accent_slug?: string | null
          updated_at?: string
          user_id?: string
          vibe_check_passed?: boolean
          vibe_check_passed_at?: string | null
          vibe_check_timer_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          display_order: number | null
          id: string
          prompt_text: string
          slug: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          prompt_text: string
          slug: string
        }
        Update: {
          display_order?: number | null
          id?: string
          prompt_text?: string
          slug?: string
        }
        Relationships: []
      }
      push_notification_log: {
        Row: {
          delivery_status: string | null
          id: string
          payload: Json | null
          reference_id: string | null
          sent_at: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          delivery_status?: string | null
          id?: string
          payload?: Json | null
          reference_id?: string | null
          sent_at?: string
          trigger_type: string
          user_id: string
        }
        Update: {
          delivery_status?: string | null
          id?: string
          payload?: Json | null
          reference_id?: string | null
          sent_at?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flag_ick_counts: {
        Row: {
          ick_count: number
          profile_id: string
          red_flag_id: string
        }
        Insert: {
          ick_count?: number
          profile_id: string
          red_flag_id: string
        }
        Update: {
          ick_count?: number
          profile_id?: string
          red_flag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_flag_ick_counts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_ick_counts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_ick_counts_red_flag_id_fkey"
            columns: ["red_flag_id"]
            isOneToOne: false
            referencedRelation: "red_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flags: {
        Row: {
          chaos_points: number
          display_order: number | null
          id: string
          is_certified_chaotic: boolean
          label: string
          slug: string
        }
        Insert: {
          chaos_points: number
          display_order?: number | null
          id?: string
          is_certified_chaotic?: boolean
          label: string
          slug: string
        }
        Update: {
          chaos_points?: number
          display_order?: number | null
          id?: string
          is_certified_chaotic?: boolean
          label?: string
          slug?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_message_id: string | null
          reported_profile_id: string | null
          reporter_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_message_id?: string | null
          reported_profile_id?: string | null
          reporter_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_message_id?: string | null
          reported_profile_id?: string | null
          reporter_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_profiles: {
        Row: {
          id: string
          saved_at: string
          saved_profile_id: string
          saver_id: string
        }
        Insert: {
          id?: string
          saved_at?: string
          saved_profile_id: string
          saver_id: string
        }
        Update: {
          id?: string
          saved_at?: string
          saved_profile_id?: string
          saver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_profiles_saved_profile_id_fkey"
            columns: ["saved_profile_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_saved_profile_id_fkey"
            columns: ["saved_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_saver_id_fkey"
            columns: ["saver_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_saver_id_fkey"
            columns: ["saver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      see_who_liked_tokens: {
        Row: {
          awarded_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "see_who_liked_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          apple_original_transaction_id: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_original_transaction_id: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_original_transaction_id?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_ick_credits: {
        Row: {
          awarded_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_ick_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_icks: {
        Row: {
          id: string
          note: string | null
          recipient_id: string
          red_flag_id: string | null
          sender_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          note?: string | null
          recipient_id: string
          red_flag_id?: string | null
          sender_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          note?: string | null
          recipient_id?: string
          red_flag_id?: string | null
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_icks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_icks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_icks_red_flag_id_fkey"
            columns: ["red_flag_id"]
            isOneToOne: false
            referencedRelation: "red_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_icks_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_icks_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          action: Database["public"]["Enums"]["swipe_action"]
          but_why_tag: string | null
          id: string
          swiped_at: string
          swiped_id: string
          swiper_id: string
          targeted_flag_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["swipe_action"]
          but_why_tag?: string | null
          id?: string
          swiped_at?: string
          swiped_id: string
          swiper_id: string
          targeted_flag_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["swipe_action"]
          but_why_tag?: string | null
          id?: string
          swiped_at?: string
          swiped_id?: string
          swiper_id?: string
          targeted_flag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiped_id_fkey"
            columns: ["swiped_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_swiped_id_fkey"
            columns: ["swiped_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_targeted_flag_id_fkey"
            columns: ["targeted_flag_id"]
            isOneToOne: false
            referencedRelation: "red_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_history: {
        Row: {
          account_count: number
          email_hash: string
          id: string
          last_deleted_at: string
        }
        Insert: {
          account_count?: number
          email_hash: string
          id?: string
          last_deleted_at?: string
        }
        Update: {
          account_count?: number
          email_hash?: string
          id?: string
          last_deleted_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_number: number
          auth_id: string
          ban_reason: string | null
          created_at: string
          date_of_birth: string
          deleted_at: string | null
          email: string
          id: string
          is_banned: boolean
        }
        Insert: {
          account_number?: number
          auth_id: string
          ban_reason?: string | null
          created_at?: string
          date_of_birth: string
          deleted_at?: string | null
          email: string
          id?: string
          is_banned?: boolean
        }
        Update: {
          account_number?: number
          auth_id?: string
          ban_reason?: string | null
          created_at?: string
          date_of_birth?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_banned?: boolean
        }
        Relationships: []
      }
      vibe_check_knocks: {
        Row: {
          id: string
          tapped_at: string
          user_id: string
        }
        Insert: {
          id?: string
          tapped_at?: string
          user_id: string
        }
        Update: {
          id?: string
          tapped_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_check_knocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_profiles: {
        Row: {
          account_number: number | null
          auto_tag: string | null
          biggest_failure: string | null
          chaos_coins: number | null
          chaos_score: number | null
          chaos_score_updated_at: string | null
          created_at: string | null
          date_of_birth: string | null
          desperation_boost_activated_at: string | null
          desperation_boost_eligible: boolean | null
          desperation_points: number | null
          display_name: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          ex_entry_count: number | null
          ex_review_framing:
            | Database["public"]["Enums"]["ex_review_framing"]
            | null
          gender_identity:
            | Database["public"]["Enums"]["gender_identity_option"]
            | null
          gender_identity_text: string | null
          id: string | null
          is_paused: boolean | null
          is_subscribed: boolean | null
          is_visible: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_updated_at: string | null
          looking_for: Database["public"]["Enums"]["looking_for_option"] | null
          max_age_pref: number | null
          max_distance_km: number | null
          min_age_pref: number | null
          onboarding_completed_at: string | null
          onboarding_step: Database["public"]["Enums"]["onboarding_step"] | null
          photo_count: number | null
          prompt_count: number | null
          pronouns: Database["public"]["Enums"]["pronouns_option"] | null
          pronouns_text: string | null
          relationship_structure:
            | Database["public"]["Enums"]["relationship_structure"]
            | null
          subscription_expires_at: string | null
          updated_at: string | null
          user_id: string | null
          vibe_check_passed: boolean | null
          vibe_check_passed_at: string | null
          vibe_check_timer_expiry: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches_with_context: {
        Row: {
          days_since_last_message: number | null
          door_early_answer_reason: string | null
          door_knock_count: number | null
          door_knock_target: number | null
          door_knocked_by: string | null
          door_opened_at: string | null
          door_status: string | null
          expired_at: string | null
          expires_at: string | null
          expiry_warning_sent_at: string | null
          id: string | null
          last_message_at: string | null
          matched_at: string | null
          silence_notified_at: string | null
          silent_since: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          unmatched_at: string | null
          unmatched_by: string | null
          user_a_chaos_score: number | null
          user_a_id: string | null
          user_a_name: string | null
          user_b_chaos_score: number | null
          user_b_id: string | null
          user_b_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_door_knocked_by_fkey"
            columns: ["door_knocked_by"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_door_knocked_by_fkey"
            columns: ["door_knocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_unmatched_by_fkey"
            columns: ["unmatched_by"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_unmatched_by_fkey"
            columns: ["unmatched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_profile_id: { Args: never; Returns: string }
      complete_vibe_check: { Args: { p_user_id: string }; Returns: undefined }
      compute_chaos_score: { Args: { p_profile_id: string }; Returns: number }
      decrement_vibe_check_timer: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_discover_candidates: {
        Args: {
          p_already_served_ids?: string[]
          p_max_dist_m: number
          p_max_dob: string
          p_min_dob: string
          p_page_size?: number
          p_rel_filter?: string
          p_viewer_id: string
        }
        Returns: {
          chaos_score: number
          days_since_update: number
          desperation_boost_activated_at: string
          desperation_boost_eligible: boolean
          profile_id: string
          shared_flag_count: number
        }[]
      }
      get_match: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: {
          door_early_answer_reason: string | null
          door_knock_count: number
          door_knock_target: number | null
          door_knocked_by: string | null
          door_opened_at: string | null
          door_status: string
          expired_at: string | null
          expires_at: string | null
          expiry_extended_at: string | null
          expiry_warning_sent_at: string | null
          id: string
          last_message_at: string | null
          last_read_at_a: string | null
          last_read_at_b: string | null
          matched_at: string
          silence_notified_at: string | null
          silent_since: string | null
          status: Database["public"]["Enums"]["match_status"]
          unmatched_at: string | null
          unmatched_by: string | null
          user_a_id: string
          user_b_id: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_unread_count: { Args: { viewer_profile_id: string }; Returns: number }
      increment_but_why: {
        Args: { p_profile_id: string; p_tag_slug: string }
        Returns: undefined
      }
      increment_ick_count: {
        Args: { p_flag_id: string; p_profile_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      chaos_pack_tier: "bad_decision" | "the_spiral" | "full_collapse"
      digital_gift_type:
        | "wilted_flower"
        | "voice_note_sigh"
        | "unanswered_text_screenshot"
        | "red_flag_on_stick"
        | "thinking_of_you_unfortunately"
        | "participation_trophy"
      employment_status:
        | "technically_consulting"
        | "funemployed"
        | "its_complicated"
        | "between_callings"
        | "employed_unfortunately"
        | "self_employed_loosely"
        | "working_on_something"
        | "in_a_band"
        | "full_time_creative"
        | "student_professionally"
        | "freelance_everything"
        | "on_sabbatical_unplanned"
      ex_review_framing: "work_history" | "verified_purchases"
      ex_verified_badge: "verified_situationship" | "verified_chaos"
      gender_identity_option:
        | "man"
        | "woman"
        | "non_binary"
        | "genderfluid"
        | "genderqueer"
        | "agender"
        | "transgender_man"
        | "transgender_woman"
        | "two_spirit"
        | "intersex"
        | "questioning"
        | "self_describe"
        | "prefer_not_to_say"
      iap_product_type: "subscription" | "chaos_coins" | "chaos_pack"
      looking_for_option:
        | "emotional_damage"
        | "someone_to_blame"
        | "situationship_with_potential"
        | "chaos_but_make_it_romantic"
        | "someone_who_texts_back"
        | "a_reason_to_stay_in_this_city"
        | "to_be_perceived"
        | "mostly_this_app_to_work_out"
        | "something_undefined"
        | "a_person_not_a_project"
        | "my_keys_and_also_love"
        | "to_relocate_for_wrong_reasons"
      match_status: "active" | "silent" | "expired" | "door_open" | "unmatched"
      message_type: "text" | "voice_note" | "digital_gift" | "system"
      onboarding_step:
        | "not_started"
        | "basics"
        | "disaster_profile"
        | "ex_reviews"
        | "prompts"
        | "complete"
      pet_accent:
        | "bored_london"
        | "generic_american"
        | "australian"
        | "french"
        | "posh_british"
        | "southern_us"
        | "nyc"
        | "estuary_chav"
        | "irish"
        | "scottish"
        | "surfer"
        | "corporate_drone"
      pet_animal: "cat" | "dog" | "frog" | "rat" | "duck"
      pet_personality:
        | "sarcastic"
        | "enthusiastic"
        | "unbothered"
        | "therapy_speak"
        | "chronically_online"
        | "conspiracy_theorist"
        | "shakespearean"
        | "life_coach"
        | "doomsday_prepper"
      pet_state: "happy" | "neutral" | "sad" | "sick" | "very_sick" | "gone"
      pronouns_option:
        | "he_him"
        | "she_her"
        | "they_them"
        | "he_they"
        | "she_they"
        | "any_pronouns"
        | "ask_me"
        | "self_describe"
      relationship_structure:
        | "monogamous"
        | "ethically_non_monogamous"
        | "polyamorous"
        | "open_relationship"
        | "relationship_anarchist"
        | "solo_poly"
        | "still_figuring_it_out"
        | "its_complicated"
        | "not_a_conversation_im_having_on_app"
      report_reason:
        | "harassment"
        | "spam"
        | "fake_profile"
        | "underage"
        | "hate_speech"
        | "explicit_content"
        | "real_name_in_ex_review"
        | "other"
      report_status: "pending" | "reviewed" | "actioned" | "dismissed"
      swipe_action: "pass" | "like" | "ick"
      voice_note_mode:
        | "drunk_dial"
        | "three_am_mode"
        | "therapy_voice"
        | "villain_arc"
        | "pocket_dial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chaos_pack_tier: ["bad_decision", "the_spiral", "full_collapse"],
      digital_gift_type: [
        "wilted_flower",
        "voice_note_sigh",
        "unanswered_text_screenshot",
        "red_flag_on_stick",
        "thinking_of_you_unfortunately",
        "participation_trophy",
      ],
      employment_status: [
        "technically_consulting",
        "funemployed",
        "its_complicated",
        "between_callings",
        "employed_unfortunately",
        "self_employed_loosely",
        "working_on_something",
        "in_a_band",
        "full_time_creative",
        "student_professionally",
        "freelance_everything",
        "on_sabbatical_unplanned",
      ],
      ex_review_framing: ["work_history", "verified_purchases"],
      ex_verified_badge: ["verified_situationship", "verified_chaos"],
      gender_identity_option: [
        "man",
        "woman",
        "non_binary",
        "genderfluid",
        "genderqueer",
        "agender",
        "transgender_man",
        "transgender_woman",
        "two_spirit",
        "intersex",
        "questioning",
        "self_describe",
        "prefer_not_to_say",
      ],
      iap_product_type: ["subscription", "chaos_coins", "chaos_pack"],
      looking_for_option: [
        "emotional_damage",
        "someone_to_blame",
        "situationship_with_potential",
        "chaos_but_make_it_romantic",
        "someone_who_texts_back",
        "a_reason_to_stay_in_this_city",
        "to_be_perceived",
        "mostly_this_app_to_work_out",
        "something_undefined",
        "a_person_not_a_project",
        "my_keys_and_also_love",
        "to_relocate_for_wrong_reasons",
      ],
      match_status: ["active", "silent", "expired", "door_open", "unmatched"],
      message_type: ["text", "voice_note", "digital_gift", "system"],
      onboarding_step: [
        "not_started",
        "basics",
        "disaster_profile",
        "ex_reviews",
        "prompts",
        "complete",
      ],
      pet_accent: [
        "bored_london",
        "generic_american",
        "australian",
        "french",
        "posh_british",
        "southern_us",
        "nyc",
        "estuary_chav",
        "irish",
        "scottish",
        "surfer",
        "corporate_drone",
      ],
      pet_animal: ["cat", "dog", "frog", "rat", "duck"],
      pet_personality: [
        "sarcastic",
        "enthusiastic",
        "unbothered",
        "therapy_speak",
        "chronically_online",
        "conspiracy_theorist",
        "shakespearean",
        "life_coach",
        "doomsday_prepper",
      ],
      pet_state: ["happy", "neutral", "sad", "sick", "very_sick", "gone"],
      pronouns_option: [
        "he_him",
        "she_her",
        "they_them",
        "he_they",
        "she_they",
        "any_pronouns",
        "ask_me",
        "self_describe",
      ],
      relationship_structure: [
        "monogamous",
        "ethically_non_monogamous",
        "polyamorous",
        "open_relationship",
        "relationship_anarchist",
        "solo_poly",
        "still_figuring_it_out",
        "its_complicated",
        "not_a_conversation_im_having_on_app",
      ],
      report_reason: [
        "harassment",
        "spam",
        "fake_profile",
        "underage",
        "hate_speech",
        "explicit_content",
        "real_name_in_ex_review",
        "other",
      ],
      report_status: ["pending", "reviewed", "actioned", "dismissed"],
      swipe_action: ["pass", "like", "ick"],
      voice_note_mode: [
        "drunk_dial",
        "three_am_mode",
        "therapy_voice",
        "villain_arc",
        "pocket_dial",
      ],
    },
  },
} as const
