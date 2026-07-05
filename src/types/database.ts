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
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          channel: string
          closed_at: string | null
          created_at: string
          gym_id: string
          id: string
          lead_id: string | null
          member_id: string | null
          sms_followup_sent: boolean
          status: string
          visitor_email: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          channel?: string
          closed_at?: string | null
          created_at?: string
          gym_id: string
          id?: string
          lead_id?: string | null
          member_id?: string | null
          sms_followup_sent?: boolean
          status?: string
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          channel?: string
          closed_at?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          lead_id?: string | null
          member_id?: string | null
          sms_followup_sent?: boolean
          status?: string
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          class_id: string | null
          gym_id: string
          id: string
          import_job_id: string | null
          location_id: string | null
          member_id: string
          notes: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          class_id?: string | null
          gym_id: string
          id?: string
          import_job_id?: string | null
          location_id?: string | null
          member_id: string
          notes?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          class_id?: string | null
          gym_id?: string
          id?: string
          import_job_id?: string | null
          location_id?: string | null
          member_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gym_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          gym_id: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          gym_id: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          gym_id?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      belt_promotions: {
        Row: {
          ceremony_date: string | null
          created_by: string | null
          from_belt: string
          gym_id: string
          id: string
          import_job_id: string | null
          member_id: string
          notes: string | null
          promoted_at: string
          to_belt: string
        }
        Insert: {
          ceremony_date?: string | null
          created_by?: string | null
          from_belt: string
          gym_id: string
          id?: string
          import_job_id?: string | null
          member_id: string
          notes?: string | null
          promoted_at?: string
          to_belt: string
        }
        Update: {
          ceremony_date?: string | null
          created_by?: string | null
          from_belt?: string
          gym_id?: string
          id?: string
          import_job_id?: string | null
          member_id?: string
          notes?: string | null
          promoted_at?: string
          to_belt?: string
        }
        Relationships: [
          {
            foreignKeyName: "belt_promotions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belt_promotions_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belt_promotions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      belt_promotion_requests: {
        Row: {
          ceremony_date: string | null
          created_at: string
          from_belt: string
          gym_id: string
          id: string
          member_id: string
          notes: string | null
          proposed_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_belt: string
        }
        Insert: {
          ceremony_date?: string | null
          created_at?: string
          from_belt: string
          gym_id: string
          id?: string
          member_id: string
          notes?: string | null
          proposed_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_belt: string
        }
        Update: {
          ceremony_date?: string | null
          created_at?: string
          from_belt?: string
          gym_id?: string
          id?: string
          member_id?: string
          notes?: string | null
          proposed_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_belt?: string
        }
        Relationships: [
          {
            foreignKeyName: "belt_promotion_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belt_promotion_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      belt_requirements: {
        Row: {
          belt: string
          created_at: string
          gym_id: string
          id: string
          min_attendance: number
          min_days_at_rank: number
          techniques_checklist: string | null
        }
        Insert: {
          belt: string
          created_at?: string
          gym_id: string
          id?: string
          min_attendance?: number
          min_days_at_rank?: number
          techniques_checklist?: string | null
        }
        Update: {
          belt?: string
          created_at?: string
          gym_id?: string
          id?: string
          min_attendance?: number
          min_days_at_rank?: number
          techniques_checklist?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "belt_requirements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      belt_stripe_events: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          member_id: string
          notes: string | null
          stripe_count: number
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          notes?: string | null
          stripe_count: number
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          notes?: string | null
          stripe_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "belt_stripe_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belt_stripe_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          body_html: string
          created_at: string
          excerpt: string | null
          gym_id: string
          id: string
          published_at: string | null
          seo_score: number | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          excerpt?: string | null
          gym_id: string
          id?: string
          published_at?: string | null
          seo_score?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          excerpt?: string | null
          gym_id?: string
          id?: string
          published_at?: string | null
          seo_score?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      business_snapshots: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          metrics: Json
          recommendations: Json
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          metrics?: Json
          recommendations?: Json
          snapshot_date: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          metrics?: Json
          recommendations?: Json
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_snapshots_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          cancelled_at: string | null
          class_id: string
          enrolled_at: string
          gym_id: string
          id: string
          member_id: string
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          class_id: string
          enrolled_at?: string
          gym_id: string
          id?: string
          member_id: string
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          class_id?: string
          enrolled_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      class_session_attendance: {
        Row: {
          checked_in_at: string
          gym_id: string
          id: string
          member_id: string
          session_id: string
        }
        Insert: {
          checked_in_at?: string
          gym_id: string
          id?: string
          member_id: string
          session_id: string
        }
        Update: {
          checked_in_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_session_attendance_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_session_bookings: {
        Row: {
          cancelled_at: string | null
          created_at: string
          gym_id: string
          id: string
          member_id: string
          session_id: string
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          session_id: string
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_session_bookings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule_exceptions: {
        Row: {
          class_id: string
          created_at: string
          exception_date: string
          gym_id: string
          id: string
          reason: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          exception_date: string
          gym_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          exception_date?: string
          gym_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_exceptions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedule_exceptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule_template_items: {
        Row: {
          capacity: number
          category_tag: string | null
          color: string | null
          description: string | null
          day_of_week: string
          end_time: string
          id: string
          instructor: string
          name: string
          overbook_allowance: number
          sort_order: number
          start_time: string
          template_id: string
        }
        Insert: {
          capacity?: number
          category_tag?: string | null
          color?: string | null
          description?: string | null
          day_of_week: string
          end_time: string
          id?: string
          instructor: string
          name: string
          overbook_allowance?: number
          sort_order?: number
          start_time: string
          template_id: string
        }
        Update: {
          capacity?: number
          category_tag?: string | null
          color?: string | null
          description?: string | null
          day_of_week?: string
          end_time?: string
          id?: string
          instructor?: string
          name?: string
          overbook_allowance?: number
          sort_order?: number
          start_time?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule_templates: {
        Row: {
          created_at: string
          effective_from: string | null
          effective_to: string | null
          gym_id: string
          id: string
          name: string
          season_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          gym_id: string
          id?: string
          name: string
          season_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          gym_id?: string
          id?: string
          name?: string
          season_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_templates_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_staff_permissions: {
        Row: {
          class_id: string
          created_at: string
          gym_id: string
          id: string
          staff_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          gym_id: string
          id?: string
          staff_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_staff_permissions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_staff_permissions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          gym_id: string
          id: string
          instructor: string | null
          session_date: string
          substitute_instructor: string | null
          substitute_staff_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          gym_id: string
          id?: string
          instructor?: string | null
          session_date: string
          substitute_instructor?: string | null
          substitute_staff_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          instructor?: string | null
          session_date?: string
          substitute_instructor?: string | null
          substitute_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_waitlist: {
        Row: {
          class_id: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
          notified_at: string | null
          position: number
          promoted_at: string | null
          status: string
        }
        Insert: {
          class_id: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          notified_at?: string | null
          position?: number
          promoted_at?: string | null
          status?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          notified_at?: string | null
          position?: number
          promoted_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_waitlist_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_waitlist_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_waitlist_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          category_tag: string | null
          color: string | null
          created_at: string
          day_of_week: string | null
          description: string | null
          end_time: string | null
          gym_id: string
          id: string
          import_job_id: string | null
          instructor: string | null
          instructor_staff_id: string | null
          is_active: boolean
          location_id: string | null
          name: string
          overbook_allowance: number
          recurrence_rule: string | null
          series_id: string | null
          start_time: string | null
        }
        Insert: {
          capacity?: number | null
          category_tag?: string | null
          color?: string | null
          created_at?: string
          day_of_week?: string | null
          description?: string | null
          end_time?: string | null
          gym_id: string
          id?: string
          import_job_id?: string | null
          instructor?: string | null
          instructor_staff_id?: string | null
          is_active?: boolean
          location_id?: string | null
          name: string
          overbook_allowance?: number
          recurrence_rule?: string | null
          series_id?: string | null
          start_time?: string | null
        }
        Update: {
          capacity?: number | null
          category_tag?: string | null
          color?: string | null
          created_at?: string
          day_of_week?: string | null
          description?: string | null
          end_time?: string | null
          gym_id?: string
          id?: string
          import_job_id?: string | null
          instructor?: string | null
          instructor_staff_id?: string | null
          is_active?: boolean
          location_id?: string | null
          name?: string
          overbook_allowance?: number
          recurrence_rule?: string | null
          series_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_instructor_staff_id_fkey"
            columns: ["instructor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gym_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          division: string | null
          event_date: string | null
          gym_id: string
          id: string
          member_id: string | null
          name: string
          notes: string | null
          result: string | null
        }
        Insert: {
          created_at?: string
          division?: string | null
          event_date?: string | null
          gym_id: string
          id?: string
          member_id?: string | null
          name: string
          notes?: string | null
          result?: string | null
        }
        Update: {
          created_at?: string
          division?: string | null
          event_date?: string | null
          gym_id?: string
          id?: string
          member_id?: string | null
          name?: string
          notes?: string | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          gym_id: string
          id: string
          is_pinned: boolean
          lead_id: string | null
          member_id: string | null
          note_type: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          gym_id: string
          id?: string
          is_pinned?: boolean
          lead_id?: string | null
          member_id?: string | null
          note_type?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          gym_id?: string
          id?: string
          is_pinned?: boolean
          lead_id?: string | null
          member_id?: string | null
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_reminders: {
        Row: {
          channel: string
          gym_id: string
          id: string
          member_id: string
          reminder_number: number
          sent_at: string
          subscription_id: string | null
        }
        Insert: {
          channel?: string
          gym_id: string
          id?: string
          member_id: string
          reminder_number: number
          sent_at?: string
          subscription_id?: string | null
        }
        Update: {
          channel?: string
          gym_id?: string
          id?: string
          member_id?: string
          reminder_number?: number
          sent_at?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dunning_reminders_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_reminders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience: string
          body_html: string
          click_count: number
          created_at: string
          gym_id: string
          id: string
          name: string
          open_count: number
          ad_spend_cents: number
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
        }
        Insert: {
          audience?: string
          body_html: string
          click_count?: number
          created_at?: string
          gym_id: string
          id?: string
          name: string
          open_count?: number
          ad_spend_cents?: number
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
        }
        Update: {
          audience?: string
          body_html?: string
          click_count?: number
          created_at?: string
          gym_id?: string
          id?: string
          name?: string
          open_count?: number
          ad_spend_cents?: number
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          audience: string
          body: string
          created_at: string
          gym_id: string
          id: string
          name: string
          sent_at: string | null
          sent_count: number
          status: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          gym_id: string
          id?: string
          name: string
          sent_at?: string | null
          sent_count?: number
          status?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          gym_id?: string
          id?: string
          name?: string
          sent_at?: string | null
          sent_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          full_name: string
          gym_id: string
          id: string
          is_primary: boolean
          member_id: string
          phone: string
          relationship: string
        }
        Insert: {
          created_at?: string
          full_name: string
          gym_id: string
          id?: string
          is_primary?: boolean
          member_id: string
          phone: string
          relationship: string
        }
        Update: {
          created_at?: string
          full_name?: string
          gym_id?: string
          id?: string
          is_primary?: boolean
          member_id?: string
          phone?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contacts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          billing_member_id: string | null
          created_at: string
          family_name: string
          gym_id: string
          id: string
          primary_email: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          billing_member_id?: string | null
          created_at?: string
          family_name: string
          gym_id: string
          id?: string
          primary_email?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          billing_member_id?: string | null
          created_at?: string
          family_name?: string
          gym_id?: string
          id?: string
          primary_email?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_billing_member_id_fkey"
            columns: ["billing_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gbp_connections: {
        Row: {
          access_token: string | null
          account_id: string | null
          connected_at: string
          gym_id: string
          id: string
          location_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          connected_at?: string
          gym_id: string
          id?: string
          location_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          connected_at?: string
          gym_id?: string
          id?: string
          location_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gbp_connections_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gbp_local_posts: {
        Row: {
          body: string | null
          created_at: string
          error_message: string | null
          external_id: string | null
          gym_id: string
          id: string
          posted_at: string | null
          status: string
          summary: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          gym_id: string
          id?: string
          posted_at?: string | null
          status?: string
          summary: string
        }
        Update: {
          body?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          gym_id?: string
          id?: string
          posted_at?: string | null
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "gbp_local_posts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gbp_reviews_cache: {
        Row: {
          author_name: string | null
          comment: string | null
          external_review_id: string
          gym_id: string
          id: string
          imported_at: string
          rating: number | null
          replied_at: string | null
          review_reply: string | null
        }
        Insert: {
          author_name?: string | null
          comment?: string | null
          external_review_id: string
          gym_id: string
          id?: string
          imported_at?: string
          rating?: number | null
          replied_at?: string | null
          review_reply?: string | null
        }
        Update: {
          author_name?: string | null
          comment?: string | null
          external_review_id?: string
          gym_id?: string
          id?: string
          imported_at?: string
          rating?: number | null
          replied_at?: string | null
          review_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gbp_reviews_cache_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_coaches: {
        Row: {
          belt_rank: string | null
          bio: string | null
          created_at: string
          gym_id: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          sort_order: number
          specialties: string | null
          staff_role_id: string | null
        }
        Insert: {
          belt_rank?: string | null
          bio?: string | null
          created_at?: string
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          sort_order?: number
          specialties?: string | null
          staff_role_id?: string | null
        }
        Update: {
          belt_rank?: string | null
          bio?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          sort_order?: number
          specialties?: string | null
          staff_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_coaches_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_coaches_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_events: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string
          gym_id: string
          id: string
          location: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          gym_id: string
          id?: string
          location?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          gym_id?: string
          id?: string
          location?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_gallery: {
        Row: {
          caption: string | null
          created_at: string
          gym_id: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          gym_id: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_gallery_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_knowledge: {
        Row: {
          content: string
          gym_id: string
          id: string
          topic: string
          updated_at: string
        }
        Insert: {
          content: string
          gym_id: string
          id?: string
          topic: string
          updated_at?: string
        }
        Update: {
          content?: string
          gym_id?: string
          id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_knowledge_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_locations: {
        Row: {
          address_city: string | null
          address_line1: string | null
          address_state: string | null
          address_zip: string | null
          created_at: string
          gym_id: string
          id: string
          is_primary: boolean
          name: string
        }
        Insert: {
          address_city?: string | null
          address_line1?: string | null
          address_state?: string | null
          address_zip?: string | null
          created_at?: string
          gym_id: string
          id?: string
          is_primary?: boolean
          name: string
        }
        Update: {
          address_city?: string | null
          address_line1?: string | null
          address_state?: string | null
          address_zip?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          is_primary?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_locations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_api_keys: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_api_keys_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_programs: {
        Row: {
          age_group: string | null
          created_at: string
          description: string | null
          gym_id: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          description?: string | null
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          age_group?: string | null
          created_at?: string
          description?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_programs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_reviews: {
        Row: {
          author_name: string
          body: string | null
          created_at: string
          gym_id: string
          id: string
          is_published: boolean
          rating: number
        }
        Insert: {
          author_name: string
          body?: string | null
          created_at?: string
          gym_id: string
          id?: string
          is_published?: boolean
          rating: number
        }
        Update: {
          author_name?: string
          body?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          is_published?: boolean
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_reviews_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          about_text: string | null
          address_city: string | null
          address_line1: string | null
          address_state: string | null
          address_zip: string | null
          ai_front_desk_enabled: boolean
          ai_persona_name: string | null
          belt_custom_order: Json | null
          belt_system: string
          booking_cancel_hours: number
          class_reminder_hours: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          custom_domain: string | null
          daily_digest_enabled: boolean
          ga4_measurement_id: string | null
          google_place_id: string | null
          google_ads_conversion_id: string | null
          id: string
          kiosk_enabled: boolean
          locale: string
          logo_url: string | null
          meta_pixel_id: string | null
          name: string
          owner_id: string
          primary_color: string | null
          require_waiver_for_checkin: boolean
          review_checkin_threshold: number
          signature_webhook_url: string | null
          slug: string
          store_enabled: boolean
          store_return_policy: string | null
          tagline: string | null
          timezone: string
          twilio_phone: string | null
          website_enabled: boolean
          white_label_enabled: boolean
          setup_completed_at: string | null
          favicon_url: string | null
          hero_ab_enabled: boolean
          hero_image_url: string | null
          hero_variant_b_headline: string | null
          hero_variant_b_subheadline: string | null
          marketing_enabled: boolean
          member_required_fields: Json
          public_translations: Json
          seo_keywords: string[] | null
          shop_flat_tax_cents: number
          shop_member_discount_percent: number
          coaches_stripes_only: boolean
          stripe_tax_enabled: boolean
          payment_provider: string
          stripe_only: boolean
          waiver_retention_days: number | null
        }
        Insert: {
          about_text?: string | null
          address_city?: string | null
          address_line1?: string | null
          address_state?: string | null
          address_zip?: string | null
          ai_front_desk_enabled?: boolean
          ai_persona_name?: string | null
          belt_custom_order?: Json | null
          belt_system?: string
          booking_cancel_hours?: number
          class_reminder_hours?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          daily_digest_enabled?: boolean
          ga4_measurement_id?: string | null
          google_place_id?: string | null
          id?: string
          kiosk_enabled?: boolean
          locale?: string
          logo_url?: string | null
          member_required_fields?: Json
          meta_pixel_id?: string | null
          name: string
          owner_id: string
          primary_color?: string | null
          require_waiver_for_checkin?: boolean
          review_checkin_threshold?: number
          signature_webhook_url?: string | null
          slug: string
          store_enabled?: boolean
          shop_flat_tax_cents?: number
          shop_member_discount_percent?: number
          coaches_stripes_only?: boolean
          stripe_tax_enabled?: boolean
          payment_provider?: string
          stripe_only?: boolean
          waiver_retention_days?: number | null
          store_return_policy?: string | null
          tagline?: string | null
          timezone?: string
          twilio_phone?: string | null
          website_enabled?: boolean
          white_label_enabled?: boolean
        }
        Update: {
          about_text?: string | null
          address_city?: string | null
          address_line1?: string | null
          address_state?: string | null
          address_zip?: string | null
          ai_front_desk_enabled?: boolean
          ai_persona_name?: string | null
          belt_custom_order?: Json | null
          belt_system?: string
          booking_cancel_hours?: number
          class_reminder_hours?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          daily_digest_enabled?: boolean
          ga4_measurement_id?: string | null
          google_place_id?: string | null
          id?: string
          kiosk_enabled?: boolean
          locale?: string
          logo_url?: string | null
          member_required_fields?: Json
          meta_pixel_id?: string | null
          name?: string
          owner_id?: string
          primary_color?: string | null
          require_waiver_for_checkin?: boolean
          review_checkin_threshold?: number
          signature_webhook_url?: string | null
          slug?: string
          store_enabled?: boolean
          shop_flat_tax_cents?: number
          shop_member_discount_percent?: number
          coaches_stripes_only?: boolean
          stripe_tax_enabled?: boolean
          payment_provider?: string
          stripe_only?: boolean
          waiver_retention_days?: number | null
          store_return_policy?: string | null
          tagline?: string | null
          timezone?: string
          twilio_phone?: string | null
          website_enabled?: boolean
          white_label_enabled?: boolean
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_rows: number
          file_name: string | null
          gym_id: string
          id: string
          import_type: string
          rolled_back_at: string | null
          status: string
          success_rows: number
          total_rows: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_rows?: number
          file_name?: string | null
          gym_id: string
          id?: string
          import_type: string
          rolled_back_at?: string | null
          status?: string
          success_rows?: number
          total_rows?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_rows?: number
          file_name?: string | null
          gym_id?: string
          id?: string
          import_type?: string
          rolled_back_at?: string | null
          status?: string
          success_rows?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      import_row_errors: {
        Row: {
          created_at: string
          error_message: string
          id: string
          job_id: string
          row_data: Json | null
          row_number: number
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          job_id: string
          row_data?: Json | null
          row_number: number
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          job_id?: string
          row_data?: Json | null
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_row_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_automation_logs: {
        Row: {
          channel: string
          created_at: string
          gym_id: string
          id: string
          lead_id: string
          status: string
          step: string
          workflow: string
        }
        Insert: {
          channel: string
          created_at?: string
          gym_id: string
          id?: string
          lead_id: string
          status?: string
          step: string
          workflow: string
        }
        Update: {
          channel?: string
          created_at?: string
          gym_id?: string
          id?: string
          lead_id?: string
          status?: string
          step?: string
          workflow?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_automation_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      member_automation_logs: {
        Row: {
          channel: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
          status: string
          step: string
          workflow: string
        }
        Insert: {
          channel: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          status?: string
          step: string
          workflow: string
        }
        Update: {
          channel?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          status?: string
          step?: string
          workflow?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_automation_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_automation_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_staff_id: string | null
          converted_member_id: string | null
          created_at: string
          email: string | null
          email_opt_out: boolean
          first_name: string
          gym_id: string
          id: string
          import_job_id: string | null
          interested_in: string | null
          last_name: string
          notes: string | null
          phone: string | null
          sms_consent: boolean
          source: string | null
          status: string
          trial_date: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          email_opt_out?: boolean
          first_name: string
          gym_id: string
          id?: string
          import_job_id?: string | null
          interested_in?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          sms_consent?: boolean
          source?: string | null
          status?: string
          trial_date?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          email_opt_out?: boolean
          first_name?: string
          gym_id?: string
          id?: string
          import_job_id?: string | null
          interested_in?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          sms_consent?: boolean
          source?: string | null
          status?: string
          trial_date?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_member_id_fkey"
            columns: ["converted_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          auth_user_id: string | null
          belt_rank: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          email_opt_out: boolean
          marketing_email_consent: boolean
          marketing_consent_at: string | null
          sms_marketing_consent: boolean
          external_id: string | null
          family_id: string | null
          first_name: string
          gender: string | null
          gym_id: string
          id: string
          import_job_id: string | null
          last_name: string
          phone: string | null
          portal_role: string
          postal_code: string | null
          profile_photo_url: string | null
          state: string | null
          status: string
          stripe_count: number
          tags: string[]
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          auth_user_id?: string | null
          belt_rank?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          email_opt_out?: boolean
          marketing_email_consent?: boolean
          marketing_consent_at?: string | null
          sms_marketing_consent?: boolean
          external_id?: string | null
          family_id?: string | null
          first_name: string
          gender?: string | null
          gym_id: string
          id?: string
          import_job_id?: string | null
          last_name: string
          phone?: string | null
          portal_role?: string
          postal_code?: string | null
          profile_photo_url?: string | null
          state?: string | null
          status?: string
          stripe_count?: number
          tags?: string[]
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          auth_user_id?: string | null
          belt_rank?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          email_opt_out?: boolean
          marketing_email_consent?: boolean
          marketing_consent_at?: string | null
          sms_marketing_consent?: boolean
          external_id?: string | null
          family_id?: string | null
          first_name?: string
          gender?: string | null
          gym_id?: string
          id?: string
          import_job_id?: string | null
          last_name?: string
          phone?: string | null
          portal_role?: string
          postal_code?: string | null
          profile_photo_url?: string | null
          state?: string | null
          status?: string
          stripe_count?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          gym_id: string
          id: string
          member_id: string | null
          sent_at: string | null
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          gym_id: string
          id?: string
          member_id?: string | null
          sent_at?: string | null
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          gym_id?: string
          id?: string
          member_id?: string | null
          sent_at?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          gym_id: string
          id: string
          member_id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          gym_id: string
          id?: string
          member_id: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          gym_id?: string
          id?: string
          member_id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          fulfilled_at: string | null
          fulfillment_type: string
          gym_id: string
          id: string
          member_id: string | null
          shipping_address: Json | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total_cents: number
          tracking_number: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          fulfilled_at?: string | null
          fulfillment_type?: string
          gym_id: string
          id?: string
          member_id?: string | null
          shipping_address?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_cents?: number
          tracking_number?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          fulfilled_at?: string | null
          fulfillment_type?: string
          gym_id?: string
          id?: string
          member_id?: string | null
          shipping_address?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_cents?: number
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          gym_id: string
          id: string
          interval: string
          is_active: boolean
          name: string
          price: number | null
          price_cents: number | null
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number
          setup_fee_cents: number
          stripe_setup_price_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gym_id: string
          id?: string
          interval: string
          is_active?: boolean
          name: string
          price?: number | null
          price_cents?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          setup_fee_cents?: number
          stripe_setup_price_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gym_id?: string
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          price?: number | null
          price_cents?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          setup_fee_cents?: number
          stripe_setup_price_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          inventory_count: number
          label: string
          price_cents: number | null
          product_id: string
          sku: string | null
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          inventory_count?: number
          label: string
          price_cents?: number | null
          product_id: string
          sku?: string | null
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          inventory_count?: number
          label?: string
          price_cents?: number | null
          product_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          gallery_urls: Json
          gym_id: string
          id: string
          image_url: string | null
          inventory_count: number
          is_active: boolean
          members_only: boolean
          name: string
          price_cents: number
          sku: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          gallery_urls?: Json
          gym_id: string
          id?: string
          image_url?: string | null
          inventory_count?: number
          is_active?: boolean
          members_only?: boolean
          name: string
          price_cents: number
          sku?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          gallery_urls?: Json
          gym_id?: string
          id?: string
          image_url?: string | null
          inventory_count?: number
          is_active?: boolean
          members_only?: boolean
          name?: string
          price_cents?: number
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number | null
          created_at: string
          gym_id: string
          id: string
          issued_by: string | null
          member_id: string | null
          reason: string | null
          stripe_refund_id: string | null
          subscription_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          gym_id: string
          id?: string
          issued_by?: string | null
          member_id?: string | null
          reason?: string | null
          stripe_refund_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          gym_id?: string
          id?: string
          issued_by?: string | null
          member_id?: string | null
          reason?: string | null
          stripe_refund_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          completed_at: string | null
          link_clicked_at: string | null
          gym_id: string
          id: string
          member_id: string
          sent_at: string
        }
        Insert: {
          completed_at?: string | null
          link_clicked_at?: string | null
          gym_id: string
          id?: string
          member_id: string
          sent_at?: string
        }
        Update: {
          completed_at?: string | null
          link_clicked_at?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_consent_log: {
        Row: {
          consented: boolean
          created_at: string
          gym_id: string
          id: string
          lead_id: string | null
          member_id: string | null
          phone: string
          source: string
        }
        Insert: {
          consented: boolean
          created_at?: string
          gym_id: string
          id?: string
          lead_id?: string | null
          member_id?: string | null
          phone: string
          source: string
        }
        Update: {
          consented?: boolean
          created_at?: string
          gym_id?: string
          id?: string
          lead_id?: string | null
          member_id?: string | null
          phone?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_consent_log_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_consent_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_consent_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          gym_id: string
          id: string
          product_id: string | null
          reason: string | null
          variant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          gym_id: string
          id?: string
          product_id?: string | null
          reason?: string | null
          variant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          gym_id?: string
          id?: string
          product_id?: string | null
          reason?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          full_name: string | null
          gym_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          gym_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          gym_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          gym_id: string
          id: string
          staff_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          gym_id: string
          id?: string
          staff_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          gym_id?: string
          id?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          gym_id: string
          id: string
          member_id: string
          pause_reason: string | null
          paused_at: string | null
          payment_method: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          family_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          gym_id: string
          id?: string
          member_id: string
          pause_reason?: string | null
          paused_at?: string | null
          payment_method?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          family_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          pause_reason?: string | null
          paused_at?: string | null
          payment_method?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          family_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_signatures: {
        Row: {
          expires_at: string | null
          guardian_name: string | null
          gym_id: string
          id: string
          ip_address: string | null
          lead_id: string | null
          legal_hold: boolean
          member_id: string | null
          pdf_storage_path: string | null
          signature_image_url: string | null
          signed_at: string
          signed_name: string
          user_agent: string | null
          waiver_id: string
          waiver_version: number
          witness_name: string | null
          witness_signature_url: string | null
        }
        Insert: {
          expires_at?: string | null
          guardian_name?: string | null
          gym_id: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          legal_hold?: boolean
          member_id?: string | null
          pdf_storage_path?: string | null
          signature_image_url?: string | null
          signed_at?: string
          signed_name: string
          user_agent?: string | null
          waiver_id: string
          waiver_version?: number
          witness_name?: string | null
          witness_signature_url?: string | null
        }
        Update: {
          expires_at?: string | null
          guardian_name?: string | null
          gym_id?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          legal_hold?: boolean
          member_id?: string | null
          pdf_storage_path?: string | null
          signature_image_url?: string | null
          signed_at?: string
          signed_name?: string
          user_agent?: string | null
          waiver_id?: string
          waiver_version?: number
          witness_name?: string | null
          witness_signature_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "waivers"
            referencedColumns: ["id"]
          },
        ]
      }
      waivers: {
        Row: {
          body: string
          created_at: string
          expires_after_days: number | null
          gym_id: string
          id: string
          is_active: boolean
          title: string
          updated_at: string | null
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          expires_after_days?: number | null
          gym_id: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          expires_after_days?: number | null
          gym_id?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "waivers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accessible_member_ids: { Args: never; Returns: string[] }
      can_access_member: {
        Args: { target_member_id: string }
        Returns: boolean
      }
      current_member_id: { Args: never; Returns: string }
      is_gym_admin: { Args: { gym_id: string }; Returns: boolean }
      is_gym_owner: { Args: { gym_id: string }; Returns: boolean }
      is_gym_staff: { Args: { gym_id: string }; Returns: boolean }
      is_gym_supervisor: { Args: { gym_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
