export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          kiosk_enabled: boolean;
          require_waiver_for_checkin: boolean;
          website_enabled: boolean;
          store_enabled: boolean;
          ai_front_desk_enabled: boolean;
          daily_digest_enabled: boolean;
          logo_url: string | null;
          primary_color: string | null;
          tagline: string | null;
          about_text: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address_line1: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          custom_domain: string | null;
          white_label_enabled: boolean;
          store_return_policy: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          kiosk_enabled?: boolean;
          website_enabled?: boolean;
          store_enabled?: boolean;
          ai_front_desk_enabled?: boolean;
          daily_digest_enabled?: boolean;
          logo_url?: string | null;
          primary_color?: string | null;
          tagline?: string | null;
          about_text?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address_line1?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          custom_domain?: string | null;
          white_label_enabled?: boolean;
          store_return_policy?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gyms']['Insert']>;
      };
      members: {
        Row: {
          id: string;
          gym_id: string;
          auth_user_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          belt_rank: string | null;
          stripe_count: number;
          external_id: string | null;
          status: string;
          family_id: string | null;
          portal_role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          auth_user_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          belt_rank?: string | null;
          stripe_count?: number;
          external_id?: string | null;
          status?: string;
          family_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['members']['Insert']>;
      };
      families: {
        Row: {
          id: string;
          gym_id: string;
          family_name: string;
          primary_email: string | null;
          stripe_customer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          family_name: string;
          primary_email?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['families']['Insert']>;
      };
      staff_roles: {
        Row: {
          id: string;
          user_id: string;
          gym_id: string;
          role: 'admin' | 'supervisor' | 'coach';
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gym_id: string;
          role: 'admin' | 'supervisor' | 'coach';
          full_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_roles']['Insert']>;
      };
      plans: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          description: string | null;
          price: number | null;
          price_cents: number | null;
          interval: 'month' | 'year';
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          description?: string | null;
          price?: number | null;
          price_cents?: number | null;
          interval: 'month' | 'year';
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          plan_id: string | null;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: string;
          current_period_end: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          paused_at: string | null;
          pause_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          plan_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          paused_at?: string | null;
          pause_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
      attendance: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          checked_in_at: string;
          checked_in_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          checked_in_at?: string;
          checked_in_by?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>;
      };
      waivers: {
        Row: {
          id: string;
          gym_id: string;
          title: string;
          body: string;
          is_active: boolean;
          expires_after_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          title: string;
          body: string;
          is_active?: boolean;
          expires_after_days?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['waivers']['Insert']>;
      };
      waiver_signatures: {
        Row: {
          id: string;
          waiver_id: string;
          member_id: string;
          gym_id: string;
          signed_name: string;
          signed_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          waiver_id: string;
          member_id: string;
          gym_id: string;
          signed_name: string;
          signed_at?: string;
          expires_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['waiver_signatures']['Insert']>;
      };
      classes: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          instructor: string | null;
          instructor_staff_id: string | null;
          day_of_week: string | null;
          start_time: string | null;
          end_time: string | null;
          capacity: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          instructor?: string | null;
          day_of_week?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          capacity?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['classes']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          gym_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          source: string | null;
          status: string;
          notes: string | null;
          interested_in: string | null;
          converted_member_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          source?: string | null;
          status?: string;
          notes?: string | null;
          interested_in?: string | null;
          converted_member_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      belt_promotions: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          from_belt: string;
          to_belt: string;
          notes: string | null;
          promoted_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          from_belt: string;
          to_belt: string;
          notes?: string | null;
          promoted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['belt_promotions']['Insert']>;
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          event_type: string;
          status: 'processing' | 'processed' | 'failed';
          error_message: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id: string;
          event_type: string;
          status?: 'processing' | 'processed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['stripe_webhook_events']['Insert']>;
      };
      refunds: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string | null;
          subscription_id: string | null;
          stripe_refund_id: string | null;
          amount_cents: number | null;
          reason: string | null;
          issued_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id?: string | null;
          subscription_id?: string | null;
          stripe_refund_id?: string | null;
          amount_cents?: number | null;
          reason?: string | null;
          issued_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['refunds']['Insert']>;
      };
      crm_notes: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string | null;
          lead_id: string | null;
          author_id: string | null;
          note_type: string;
          body: string;
          is_pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id?: string | null;
          lead_id?: string | null;
          author_id?: string | null;
          note_type?: string;
          body: string;
          is_pinned?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_notes']['Insert']>;
      };
      emergency_contacts: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          full_name: string;
          phone: string;
          relationship: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          full_name: string;
          phone: string;
          relationship: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['emergency_contacts']['Insert']>;
      };
      class_waitlist: {
        Row: {
          id: string;
          gym_id: string;
          class_id: string;
          member_id: string;
          position: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          class_id: string;
          member_id: string;
          position?: number;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['class_waitlist']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_gym_staff: { Args: { gym_id: string }; Returns: boolean };
      is_gym_admin: { Args: { gym_id: string }; Returns: boolean };
      current_member_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
  };
};

/** Regenerate from Supabase CLI when linked: supabase gen types typescript --local > src/types/database.ts */
