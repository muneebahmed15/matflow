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
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          kiosk_enabled?: boolean;
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
          status: string;
          family_id: string | null;
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
          status?: string;
          family_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['members']['Insert']>;
      };
      staff_roles: {
        Row: {
          id: string;
          user_id: string;
          gym_id: string;
          role: 'admin' | 'coach';
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gym_id: string;
          role: 'admin' | 'coach';
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
