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
      account_deletion_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          condition_type: string
          condition_value: number
          created_at: string
          description: string
          icon_url: string
          id: string
          name: string
          xp_reward: number
        }
        Insert: {
          condition_type: string
          condition_value?: number
          created_at?: string
          description: string
          icon_url?: string
          id?: string
          name: string
          xp_reward?: number
        }
        Update: {
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string
          icon_url?: string
          id?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      ad_banners: {
        Row: {
          categories: string[]
          category: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          placement: string
          starts_at: string | null
          target_audience: string | null
          target_url: string
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          categories?: string[]
          category?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          placement: string
          starts_at?: string | null
          target_audience?: string | null
          target_url: string
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          categories?: string[]
          category?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          placement?: string
          starts_at?: string | null
          target_audience?: string | null
          target_url?: string
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      ad_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ad_clicks: {
        Row: {
          banner_id: string
          click_id: string
          clicked_at: string
          converted: boolean
          converted_at: string | null
          id: string
          order_id: string | null
          order_value: number | null
          user_id: string | null
        }
        Insert: {
          banner_id: string
          click_id: string
          clicked_at?: string
          converted?: boolean
          converted_at?: string | null
          id?: string
          order_id?: string | null
          order_value?: number | null
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          click_id?: string
          clicked_at?: string
          converted?: boolean
          converted_at?: string | null
          id?: string
          order_id?: string | null
          order_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "ad_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions_daily: {
        Row: {
          banner_id: string
          date: string
          impression_count: number
        }
        Insert: {
          banner_id: string
          date?: string
          impression_count?: number
        }
        Update: {
          banner_id?: string
          date?: string
          impression_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_daily_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "ad_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placement_settings: {
        Row: {
          is_enabled: boolean
          placement: string
          updated_at: string
        }
        Insert: {
          is_enabled?: boolean
          placement: string
          updated_at?: string
        }
        Update: {
          is_enabled?: boolean
          placement?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_seller_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      ai_answer_feedback: {
        Row: {
          created_at: string
          id: string
          is_helpful: boolean
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          is_helpful: boolean
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_helpful?: boolean
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_answer_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insight_cache: {
        Row: {
          content: Json
          generated_at: string
          id: string
          insight_type: string
          student_id: string
          valid_until: string
        }
        Insert: {
          content: Json
          generated_at?: string
          id?: string
          insight_type: string
          student_id: string
          valid_until: string
        }
        Update: {
          content?: Json
          generated_at?: string
          id?: string
          insight_type?: string
          student_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insight_cache_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_projects: {
        Row: {
          created_at: string
          generated_content: Json
          id: string
          one_liner: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_content: Json
          id?: string
          one_liner: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_content?: Json
          id?: string
          one_liner?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          ai_feedback: string | null
          assignment_id: string
          feedback: string | null
          graded_at: string | null
          id: string
          marks_awarded: number | null
          student_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string
        }
        Insert: {
          ai_feedback?: string | null
          assignment_id: string
          feedback?: string | null
          graded_at?: string | null
          id?: string
          marks_awarded?: number | null
          student_id: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
        }
        Update: {
          ai_feedback?: string | null
          assignment_id?: string
          feedback?: string | null
          graded_at?: string | null
          id?: string
          marks_awarded?: number | null
          student_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_items: {
        Row: {
          coin_price: number
          id: string
          is_default: boolean
          name: string
          slot: string
          svg_asset_url: string
        }
        Insert: {
          coin_price?: number
          id?: string
          is_default?: boolean
          name: string
          slot: string
          svg_asset_url: string
        }
        Update: {
          coin_price?: number
          id?: string
          is_default?: boolean
          name?: string
          slot?: string
          svg_asset_url?: string
        }
        Relationships: []
      }
      boss_quiz_attempts: {
        Row: {
          boss_quiz_id: string
          completed_at: string | null
          id: string
          quiz_session_id: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          boss_quiz_id: string
          completed_at?: string | null
          id?: string
          quiz_session_id?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          boss_quiz_id?: string
          completed_at?: string | null
          id?: string
          quiz_session_id?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_quiz_attempts_boss_quiz_id_fkey"
            columns: ["boss_quiz_id"]
            isOneToOne: false
            referencedRelation: "boss_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_quiz_attempts_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_quizzes: {
        Row: {
          coin_reward: number
          created_at: string
          id: string
          quiz_session_template: Json
          subject_id: string | null
          week_start_date: string
          xp_reward: number
        }
        Insert: {
          coin_reward?: number
          created_at?: string
          id?: string
          quiz_session_template: Json
          subject_id?: string | null
          week_start_date: string
          xp_reward?: number
        }
        Update: {
          coin_reward?: number
          created_at?: string
          id?: string
          quiz_session_template?: Json
          subject_id?: string | null
          week_start_date?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "boss_quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_links: {
        Row: {
          buddy_id: string | null
          created_at: string
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          linked_at: string | null
          requester_id: string
          status: string
        }
        Insert: {
          buddy_id?: string | null
          created_at?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          linked_at?: string | null
          requester_id: string
          status?: string
        }
        Update: {
          buddy_id?: string | null
          created_at?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          linked_at?: string | null
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_links_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buddy_links_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_profile_inputs: {
        Row: {
          budget_range: string | null
          id: string
          interests: string[]
          learning_style_override: string | null
          long_term_goal: string | null
          personality_traits: Json
          preferred_city: string | null
          preferred_university: string | null
          student_id: string
          study_abroad_interest: boolean
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          id?: string
          interests?: string[]
          learning_style_override?: string | null
          long_term_goal?: string | null
          personality_traits?: Json
          preferred_city?: string | null
          preferred_university?: string | null
          student_id: string
          study_abroad_interest?: boolean
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          id?: string
          interests?: string[]
          learning_style_override?: string | null
          long_term_goal?: string | null
          personality_traits?: Json
          preferred_city?: string | null
          preferred_university?: string | null
          student_id?: string
          study_abroad_interest?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_profile_inputs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_recommendations: {
        Row: {
          generated_at: string
          id: string
          merit_estimation: Json | null
          recommended_careers: Json
          recommended_degrees: Json
          recommended_universities: Json
          roadmap: Json
          scholarships: Json | null
          student_id: string
          valid_until: string
        }
        Insert: {
          generated_at?: string
          id?: string
          merit_estimation?: Json | null
          recommended_careers: Json
          recommended_degrees: Json
          recommended_universities: Json
          roadmap: Json
          scholarships?: Json | null
          student_id: string
          valid_until: string
        }
        Update: {
          generated_at?: string
          id?: string
          merit_estimation?: Json | null
          recommended_careers?: Json
          recommended_degrees?: Json
          recommended_universities?: Json
          roadmap?: Json
          scholarships?: Json | null
          student_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_mastery: {
        Row: {
          attempts: number
          chapter_id: string
          correct_count: number
          id: string
          incorrect_count: number
          last_attempt_at: string
          mastery: number
          source_signals: Json
          status: string
          student_id: string
        }
        Insert: {
          attempts?: number
          chapter_id: string
          correct_count?: number
          id?: string
          incorrect_count?: number
          last_attempt_at?: string
          mastery?: number
          source_signals?: Json
          status?: string
          student_id: string
        }
        Update: {
          attempts?: number
          chapter_id?: string
          correct_count?: number
          id?: string
          incorrect_count?: number
          last_attempt_at?: string
          mastery?: number
          source_signals?: Json
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_mastery_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_mastery_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          boards: Database["public"]["Enums"]["board_type"][]
          created_at: string
          description: string | null
          grade_levels: Database["public"]["Enums"]["grade_level"][]
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          subject_id: string
          total_questions: number
          total_topics: number
        }
        Insert: {
          boards?: Database["public"]["Enums"]["board_type"][]
          created_at?: string
          description?: string | null
          grade_levels?: Database["public"]["Enums"]["grade_level"][]
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          subject_id: string
          total_questions?: number
          total_topics?: number
        }
        Update: {
          boards?: Database["public"]["Enums"]["board_type"][]
          created_at?: string
          description?: string | null
          grade_levels?: Database["public"]["Enums"]["grade_level"][]
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          subject_id?: string
          total_questions?: number
          total_topics?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_archives: {
        Row: {
          archive_type: string
          compressed_size_bytes: number
          conversation_id: string
          created_at: string
          first_message_at: string
          id: string
          last_message_at: string
          message_count: number
          object_key: string
        }
        Insert: {
          archive_type: string
          compressed_size_bytes?: number
          conversation_id: string
          created_at?: string
          first_message_at: string
          id?: string
          last_message_at: string
          message_count: number
          object_key: string
        }
        Update: {
          archive_type?: string
          compressed_size_bytes?: number
          conversation_id?: string
          created_at?: string
          first_message_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          object_key?: string
        }
        Relationships: []
      }
      class_assignments: {
        Row: {
          attachment_url: string | null
          class_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_marks: number | null
          title: string
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_marks?: number | null
          title: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_marks?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          class_id: string
          id: string
          marked_by: string | null
          session_date: string
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          marked_by?: string | null
          session_date: string
          status: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          marked_by?: string | null
          session_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_lectures: {
        Row: {
          chapter_id: string | null
          class_id: string
          created_at: string
          id: string
          resource_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          chapter_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          resource_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          resource_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_lectures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_lectures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_library_classes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_library_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_library_questions: {
        Row: {
          correct_answer: Json
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          is_verified: boolean
          marks: number
          options: Json
          subject_id: string
          text: string
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_verified?: boolean
          marks?: number
          options?: Json
          subject_id: string
          text: string
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_verified?: boolean
          marks?: number
          options?: Json
          subject_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_library_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_library_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "class_library_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_library_subject_resources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          resource_type: string
          sort_order: number
          subject_id: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          resource_type: string
          sort_order?: number
          subject_id: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          resource_type?: string
          sort_order?: number
          subject_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_library_subject_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_library_subject_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "class_library_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_library_subjects: {
        Row: {
          class_id: string
          created_at: string
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_library_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_library_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_live_attendance: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          session_id: string
          student_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          session_id: string
          student_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_live_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_live_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_live_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_role: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_role: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_live_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_live_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_live_hand_raises: {
        Row: {
          created_at: string
          id: string
          session_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_live_hand_raises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_live_hand_raises_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_live_sessions: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          livekit_room_name: string
          started_at: string
          status: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          livekit_room_name: string
          started_at?: string
          status?: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          livekit_room_name?: string
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_live_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_live_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_academic_departments: {
        Row: {
          campus_id: string | null
          code: string
          created_at: string
          head_of_department_id: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          campus_id?: string | null
          code: string
          created_at?: string
          head_of_department_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          campus_id?: string | null
          code?: string
          created_at?: string
          head_of_department_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_academic_departments_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_academic_departments_head_of_department_id_fkey"
            columns: ["head_of_department_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_academic_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_departments_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_academic_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_current: boolean
          name: string
          organization_id: string
          starts_on: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_current?: boolean
          name: string
          organization_id: string
          starts_on: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_current?: boolean
          name?: string
          organization_id?: string
          starts_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_academic_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_admins: {
        Row: {
          assigned_by: string | null
          college_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          assigned_by?: string | null
          college_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          assigned_by?: string | null
          college_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_admins_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admins_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_admission_documents: {
        Row: {
          admission_id: string
          document_type: string
          file_name: string
          id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          verification_status: string
        }
        Insert: {
          admission_id: string
          document_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          verification_status?: string
        }
        Update: {
          admission_id?: string
          document_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_admission_documents_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "college_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admission_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_documents_admission_tenant_fk"
            columns: ["admission_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_admissions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_admissions: {
        Row: {
          academic_year_id: string | null
          applicant_email: string | null
          applicant_name: string
          applicant_profile_id: string | null
          application_number: string
          applying_for_program: string
          campus_id: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          guardian_email: string | null
          guardian_name: string
          guardian_phone: string
          id: string
          notes: string | null
          organization_id: string
          previous_institution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          applicant_email?: string | null
          applicant_name: string
          applicant_profile_id?: string | null
          application_number: string
          applying_for_program: string
          campus_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          guardian_email?: string | null
          guardian_name: string
          guardian_phone: string
          id?: string
          notes?: string | null
          organization_id: string
          previous_institution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          applicant_email?: string | null
          applicant_name?: string
          applicant_profile_id?: string | null
          application_number?: string
          applying_for_program?: string
          campus_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string
          guardian_phone?: string
          id?: string
          notes?: string | null
          organization_id?: string
          previous_institution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_admissions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admissions_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admissions_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admissions_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_admissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_admissions_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_announcements: {
        Row: {
          audience_roles: string[]
          body: string
          campus_id: string | null
          created_at: string
          created_by: string
          delivery_channels: string[]
          expires_at: string | null
          id: string
          organization_id: string
          priority: string
          published_at: string | null
          title: string
        }
        Insert: {
          audience_roles?: string[]
          body: string
          campus_id?: string | null
          created_at?: string
          created_by: string
          delivery_channels?: string[]
          expires_at?: string | null
          id?: string
          organization_id: string
          priority?: string
          published_at?: string | null
          title: string
        }
        Update: {
          audience_roles?: string[]
          body?: string
          campus_id?: string | null
          created_at?: string
          created_by?: string
          delivery_channels?: string[]
          expires_at?: string | null
          id?: string
          organization_id?: string
          priority?: string
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_announcements_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_announcements_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_assignments: {
        Row: {
          assigned_on: string
          attachment_url: string | null
          course_offering_id: string | null
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          max_marks: number | null
          organization_id: string
          section_id: string
          title: string
        }
        Insert: {
          assigned_on?: string
          attachment_url?: string | null
          course_offering_id?: string | null
          created_at?: string
          created_by: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number | null
          organization_id: string
          section_id: string
          title: string
        }
        Update: {
          assigned_on?: string
          attachment_url?: string | null
          course_offering_id?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number | null
          organization_id?: string
          section_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_assignments_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_assignments_offering_tenant_fk"
            columns: ["course_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_assignments_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_attendance_records: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          id: string
          marked_at: string
          marked_by: string
          organization_id: string
          remarks: string | null
          section_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          check_in_time?: string | null
          id?: string
          marked_at?: string
          marked_by: string
          organization_id: string
          remarks?: string | null
          section_id: string
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          id?: string
          marked_at?: string
          marked_by?: string
          organization_id?: string
          remarks?: string | null
          section_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_attendance_records_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_attendance_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_hash: string | null
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_calendar_events: {
        Row: {
          audience_roles: string[]
          campus_id: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          organization_id: string
          starts_at: string
          title: string
        }
        Insert: {
          audience_roles?: string[]
          campus_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          organization_id: string
          starts_at: string
          title: string
        }
        Update: {
          audience_roles?: string[]
          campus_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_calendar_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_calendar_events_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_campuses: {
        Row: {
          address: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_main: boolean
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_campuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_contact_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          organization_id: string
          recipient_role: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          sender_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          organization_id: string
          recipient_role: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          sender_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          recipient_role?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          sender_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_contact_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_contact_messages_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_contact_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_course_offerings: {
        Row: {
          course_code: string | null
          course_id: string | null
          course_name: string
          created_at: string
          credit_hours: number
          id: string
          organization_id: string
          section_id: string
          teacher_id: string | null
        }
        Insert: {
          course_code?: string | null
          course_id?: string | null
          course_name: string
          created_at?: string
          credit_hours?: number
          id?: string
          organization_id: string
          section_id: string
          teacher_id?: string | null
        }
        Update: {
          course_code?: string | null
          course_id?: string | null
          course_name?: string
          created_at?: string
          credit_hours?: number
          id?: string
          organization_id?: string
          section_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_course_offerings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_course_offerings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_course_offerings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_offerings_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_enrollments: {
        Row: {
          academic_year_id: string
          created_at: string
          enrolled_on: string
          id: string
          organization_id: string
          registration_number: string
          roll_number: string | null
          section_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          enrolled_on?: string
          id?: string
          organization_id: string
          registration_number: string
          roll_number?: string | null
          section_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          enrolled_on?: string
          id?: string
          organization_id?: string
          registration_number?: string
          roll_number?: string | null
          section_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_enrollments_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_enrollments_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_exam_marks: {
        Row: {
          entered_at: string
          entered_by: string
          id: string
          is_absent: boolean
          marks_obtained: number | null
          organization_id: string
          remarks: string | null
          schedule_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          entered_at?: string
          entered_by: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          organization_id: string
          remarks?: string | null
          schedule_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          entered_at?: string
          entered_by?: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          organization_id?: string
          remarks?: string | null
          schedule_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_exam_marks_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exam_marks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exam_marks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "college_exam_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exam_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_marks_schedule_tenant_fk"
            columns: ["schedule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_exam_schedules"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_exam_schedules: {
        Row: {
          course_name: string
          course_offering_id: string | null
          created_at: string
          ends_at: string | null
          exam_date: string
          exam_id: string
          id: string
          max_marks: number
          organization_id: string
          passing_marks: number
          room: string | null
          section_id: string
          starts_at: string | null
        }
        Insert: {
          course_name: string
          course_offering_id?: string | null
          created_at?: string
          ends_at?: string | null
          exam_date: string
          exam_id: string
          id?: string
          max_marks?: number
          organization_id: string
          passing_marks?: number
          room?: string | null
          section_id: string
          starts_at?: string | null
        }
        Update: {
          course_name?: string
          course_offering_id?: string | null
          created_at?: string
          ends_at?: string | null
          exam_date?: string
          exam_id?: string
          id?: string
          max_marks?: number
          organization_id?: string
          passing_marks?: number
          room?: string | null
          section_id?: string
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_exam_schedules_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exam_schedules_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "college_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exam_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exam_schedules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_schedules_exam_tenant_fk"
            columns: ["exam_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_exams"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_schedules_offering_tenant_fk"
            columns: ["course_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_schedules_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_exams: {
        Row: {
          academic_year_id: string
          created_at: string
          created_by: string
          ends_on: string
          grading_scheme: Json
          id: string
          name: string
          organization_id: string
          published_at: string | null
          starts_on: string
          status: string
          term: string | null
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          created_by: string
          ends_on: string
          grading_scheme?: Json
          id?: string
          name: string
          organization_id: string
          published_at?: string | null
          starts_on: string
          status?: string
          term?: string | null
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          created_by?: string
          ends_on?: string
          grading_scheme?: Json
          id?: string
          name?: string
          organization_id?: string
          published_at?: string | null
          starts_on?: string
          status?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_exams_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          organization_id: string
          paid_via: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_via?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_fee_invoices: {
        Row: {
          academic_year_id: string
          billing_period: string | null
          created_at: string
          created_by: string
          discount_amount: number
          due_date: string
          fee_structure_id: string | null
          fine_amount: number
          id: string
          issue_date: string
          notes: string | null
          organization_id: string
          paid_amount: number
          scholarship_amount: number
          status: string
          student_id: string
          subtotal: number
          total_amount: number | null
          updated_at: string
          voucher_number: string
        }
        Insert: {
          academic_year_id: string
          billing_period?: string | null
          created_at?: string
          created_by: string
          discount_amount?: number
          due_date: string
          fee_structure_id?: string | null
          fine_amount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id: string
          paid_amount?: number
          scholarship_amount?: number
          status?: string
          student_id: string
          subtotal: number
          total_amount?: number | null
          updated_at?: string
          voucher_number: string
        }
        Update: {
          academic_year_id?: string
          billing_period?: string | null
          created_at?: string
          created_by?: string
          discount_amount?: number
          due_date?: string
          fee_structure_id?: string | null
          fine_amount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          scholarship_amount?: number
          status?: string
          student_id?: string
          subtotal?: number
          total_amount?: number | null
          updated_at?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_fee_invoices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "college_fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_invoices_structure_tenant_fk"
            columns: ["fee_structure_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_fee_structures"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_invoices_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          paid_at: string
          payment_group_id: string | null
          payment_method: string
          provider: string | null
          provider_reference: string | null
          receipt_number: string
          received_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          paid_at?: string
          payment_group_id?: string | null
          payment_method: string
          provider?: string | null
          provider_reference?: string | null
          receipt_number: string
          received_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string
          payment_group_id?: string | null
          payment_method?: string
          provider?: string | null
          provider_reference?: string | null
          receipt_number?: string
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_fee_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "college_fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_payments_invoice_tenant_fk"
            columns: ["invoice_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_fee_invoices"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_fee_structures: {
        Row: {
          academic_year_id: string
          amount: number
          created_at: string
          due_day: number | null
          fee_type: string
          frequency: string
          id: string
          is_active: boolean
          late_fee_amount: number
          late_fee_type: string
          name: string
          organization_id: string
          semester_id: string | null
        }
        Insert: {
          academic_year_id: string
          amount: number
          created_at?: string
          due_day?: number | null
          fee_type: string
          frequency?: string
          id?: string
          is_active?: boolean
          late_fee_amount?: number
          late_fee_type?: string
          name: string
          organization_id: string
          semester_id?: string | null
        }
        Update: {
          academic_year_id?: string
          amount?: number
          created_at?: string
          due_day?: number | null
          fee_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          late_fee_amount?: number
          late_fee_type?: string
          name?: string
          organization_id?: string
          semester_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_structures_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "college_semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_fee_structures_semester_tenant_fk"
            columns: ["semester_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_semesters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_fee_structures_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_guardians: {
        Row: {
          can_pick_up: boolean
          created_at: string
          guardian_id: string
          id: string
          is_primary: boolean
          organization_id: string
          receives_alerts: boolean
          relationship: string
          student_id: string
        }
        Insert: {
          can_pick_up?: boolean
          created_at?: string
          guardian_id: string
          id?: string
          is_primary?: boolean
          organization_id: string
          receives_alerts?: boolean
          relationship?: string
          student_id: string
        }
        Update: {
          can_pick_up?: boolean
          created_at?: string
          guardian_id?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          receives_alerts?: boolean
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_join_requests: {
        Row: {
          college_id: string
          id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          college_id: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          college_id?: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_join_requests_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_join_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_leave_requests: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          notified_at: string | null
          organization_id: string
          reason: string
          requester_id: string
          requester_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          starts_on: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          notified_at?: string | null
          organization_id: string
          reason: string
          requester_id: string
          requester_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_on: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          notified_at?: string | null
          organization_id?: string
          reason?: string
          requester_id?: string
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_lectures: {
        Row: {
          chapter_title: string | null
          college_id: string
          course_name: string | null
          created_at: string
          degree_name: string | null
          description: string | null
          id: string
          semester: string | null
          stream: string | null
          title: string
          uploaded_by: string
          video_url: string
        }
        Insert: {
          chapter_title?: string | null
          college_id: string
          course_name?: string | null
          created_at?: string
          degree_name?: string | null
          description?: string | null
          id?: string
          semester?: string | null
          stream?: string | null
          title: string
          uploaded_by: string
          video_url: string
        }
        Update: {
          chapter_title?: string | null
          college_id?: string
          course_name?: string | null
          created_at?: string
          degree_name?: string | null
          description?: string | null
          id?: string
          semester?: string | null
          stream?: string | null
          title?: string
          uploaded_by?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_lectures_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_lectures_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_lesson_plans: {
        Row: {
          content: string | null
          course_offering_id: string
          created_at: string
          created_by: string
          id: string
          lesson_date: string
          objectives: string | null
          organization_id: string
          resources: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_offering_id: string
          created_at?: string
          created_by: string
          id?: string
          lesson_date: string
          objectives?: string | null
          organization_id: string
          resources?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_offering_id?: string
          created_at?: string
          created_by?: string
          id?: string
          lesson_date?: string
          objectives?: string | null
          organization_id?: string
          resources?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_lesson_plans_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_lesson_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_lesson_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_lessons_offering_tenant_fk"
            columns: ["course_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_memberships: {
        Row: {
          campus_id: string | null
          designation: string | null
          employee_code: string | null
          id: string
          joined_at: string
          member_role: string
          organization_id: string
          permissions: string[]
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          designation?: string | null
          employee_code?: string | null
          id?: string
          joined_at?: string
          member_role: string
          organization_id: string
          permissions?: string[]
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          designation?: string | null
          employee_code?: string | null
          id?: string
          joined_at?: string
          member_role?: string
          organization_id?: string
          permissions?: string[]
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_memberships_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_memberships_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_notification_deliveries: {
        Row: {
          announcement_id: string | null
          attempts: number
          body: string | null
          category: string
          channel: string
          created_at: string
          dedupe_key: string | null
          id: string
          last_error: string | null
          organization_id: string
          provider_reference: string | null
          recipient_address: string | null
          recipient_id: string | null
          reference_id: string | null
          reference_type: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          title: string | null
        }
        Insert: {
          announcement_id?: string | null
          attempts?: number
          body?: string | null
          category?: string
          channel: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          organization_id: string
          provider_reference?: string | null
          recipient_address?: string | null
          recipient_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          announcement_id?: string | null
          attempts?: number
          body?: string | null
          category?: string
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          organization_id?: string
          provider_reference?: string | null
          recipient_address?: string | null
          recipient_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_deliveries_announcement_tenant_fk"
            columns: ["announcement_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_announcements"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_notification_deliveries_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "college_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_notification_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_notification_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_organization_plan_settings: {
        Row: {
          billing_status: string
          created_at: string
          enabled_modules: string[]
          grant_tier: string
          max_storage_gb: number
          max_students: number
          max_teachers: number
          monthly_price_pkr: number
          monthly_price_usd: number
          notes: string | null
          organization_id: string
          plan_tier_id: string | null
          renews_on: string | null
          starts_on: string | null
          trial_days: number | null
          trial_ends_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_status?: string
          created_at?: string
          enabled_modules?: string[]
          grant_tier?: string
          max_storage_gb?: number
          max_students?: number
          max_teachers?: number
          monthly_price_pkr?: number
          monthly_price_usd?: number
          notes?: string | null
          organization_id: string
          plan_tier_id?: string | null
          renews_on?: string | null
          starts_on?: string | null
          trial_days?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_status?: string
          created_at?: string
          enabled_modules?: string[]
          grant_tier?: string
          max_storage_gb?: number
          max_students?: number
          max_teachers?: number
          monthly_price_pkr?: number
          monthly_price_usd?: number
          notes?: string | null
          organization_id?: string
          plan_tier_id?: string | null
          renews_on?: string | null
          starts_on?: string | null
          trial_days?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_organization_plan_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_organization_plan_settings_plan_tier_id_fkey"
            columns: ["plan_tier_id"]
            isOneToOne: false
            referencedRelation: "institution_plan_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_organization_plan_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_type?: string
          phone?: string | null
          principal_name?: string | null
          principal_signature_url?: string | null
          settings?: Json
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_type?: string
          phone?: string | null
          principal_name?: string | null
          principal_signature_url?: string | null
          settings?: Json
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_pending_student_additions: {
        Row: {
          created_at: string
          detected_by: string
          extracted_name: string
          extracted_roll_number: string | null
          id: string
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          section_id: string
          status: string
        }
        Insert: {
          created_at?: string
          detected_by: string
          extracted_name: string
          extracted_roll_number?: string | null
          id?: string
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id: string
          status?: string
        }
        Update: {
          created_at?: string
          detected_by?: string
          extracted_name?: string
          extracted_roll_number?: string | null
          id?: string
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_pending_additions_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_pending_student_additions_detected_by_fkey"
            columns: ["detected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_pending_student_additions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_pending_student_additions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_pending_student_additions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      college_report_cards: {
        Row: {
          class_position: number | null
          exam_id: string
          generated_at: string
          gpa: number | null
          grade: string | null
          id: string
          obtained_marks: number
          organization_id: string
          percentage: number
          published_at: string | null
          student_id: string
          summary: Json
          teacher_comment: string | null
          total_marks: number
        }
        Insert: {
          class_position?: number | null
          exam_id: string
          generated_at?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          obtained_marks?: number
          organization_id: string
          percentage?: number
          published_at?: string | null
          student_id: string
          summary?: Json
          teacher_comment?: string | null
          total_marks?: number
        }
        Update: {
          class_position?: number | null
          exam_id?: string
          generated_at?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          obtained_marks?: number
          organization_id?: string
          percentage?: number
          published_at?: string | null
          student_id?: string
          summary?: Json
          teacher_comment?: string | null
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "college_report_cards_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "college_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_report_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_reports_exam_tenant_fk"
            columns: ["exam_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_exams"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_resources: {
        Row: {
          chapter_title: string | null
          college_id: string
          context_text_url: string | null
          course_name: string | null
          created_at: string
          dark_file_url: string | null
          degree_name: string | null
          file_url: string
          id: string
          light_file_url: string | null
          resource_type: string
          semester: string | null
          stream: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          chapter_title?: string | null
          college_id: string
          context_text_url?: string | null
          course_name?: string | null
          created_at?: string
          dark_file_url?: string | null
          degree_name?: string | null
          file_url: string
          id?: string
          light_file_url?: string | null
          resource_type: string
          semester?: string | null
          stream?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          chapter_title?: string | null
          college_id?: string
          context_text_url?: string | null
          course_name?: string | null
          created_at?: string
          dark_file_url?: string | null
          degree_name?: string | null
          file_url?: string
          id?: string
          light_file_url?: string | null
          resource_type?: string
          semester?: string | null
          stream?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_resources_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_sections: {
        Row: {
          advisor_id: string | null
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          room: string | null
          semester_id: string
        }
        Insert: {
          advisor_id?: string | null
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          room?: string | null
          semester_id: string
        }
        Update: {
          advisor_id?: string | null
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          room?: string | null
          semester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_sections_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_sections_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "college_semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_sections_semester_tenant_fk"
            columns: ["semester_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_semesters"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_semesters: {
        Row: {
          academic_year_id: string
          campus_id: string
          created_at: string
          department_id: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          semester_number: number | null
        }
        Insert: {
          academic_year_id: string
          campus_id: string
          created_at?: string
          department_id: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          semester_number?: number | null
        }
        Update: {
          academic_year_id?: string
          campus_id?: string
          created_at?: string
          department_id?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          semester_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "college_semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_semesters_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_semesters_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_semesters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "college_academic_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_semesters_department_tenant_fk"
            columns: ["department_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_departments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_semesters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_semesters_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      college_staff_attendance: {
        Row: {
          attendance_date: string
          check_in_at: string | null
          check_out_at: string | null
          id: string
          marked_by: string | null
          membership_id: string
          organization_id: string
          remarks: string | null
          status: string
        }
        Insert: {
          attendance_date: string
          check_in_at?: string | null
          check_out_at?: string | null
          id?: string
          marked_by?: string | null
          membership_id: string
          organization_id: string
          remarks?: string | null
          status: string
        }
        Update: {
          attendance_date?: string
          check_in_at?: string | null
          check_out_at?: string | null
          id?: string
          marked_by?: string | null
          membership_id?: string
          organization_id?: string
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_staff_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_staff_attendance_member_tenant_fk"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_staff_attendance_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "college_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_staff_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_teacher_biometric_devices: {
        Row: {
          campus_id: string | null
          comm_key: number
          created_at: string
          created_by: string | null
          device_ip: string
          id: string
          last_sync_error: string | null
          last_sync_status: string
          last_synced_at: string | null
          name: string
          organization_id: string
          port: number
        }
        Insert: {
          campus_id?: string | null
          comm_key?: number
          created_at?: string
          created_by?: string | null
          device_ip: string
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string
          last_synced_at?: string | null
          name: string
          organization_id: string
          port?: number
        }
        Update: {
          campus_id?: string | null
          comm_key?: number
          created_at?: string
          created_by?: string | null
          device_ip?: string
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          port?: number
        }
        Relationships: [
          {
            foreignKeyName: "college_teacher_biometric_devices_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_teacher_biometric_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_teacher_biometric_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_teacher_biometric_mappings: {
        Row: {
          created_at: string
          device_id: string
          device_user_id: string
          id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_user_id: string
          id?: string
          membership_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_user_id?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_teacher_biometric_mappings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "college_teacher_biometric_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_teacher_biometric_mappings_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "college_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      college_timetable_slots: {
        Row: {
          course_name: string
          course_offering_id: string | null
          created_at: string
          day_of_week: number
          ends_at: string
          id: string
          organization_id: string
          room: string | null
          section_id: string
          starts_at: string
          teacher_id: string | null
        }
        Insert: {
          course_name: string
          course_offering_id?: string | null
          created_at?: string
          day_of_week: number
          ends_at: string
          id?: string
          organization_id: string
          room?: string | null
          section_id: string
          starts_at: string
          teacher_id?: string | null
        }
        Update: {
          course_name?: string
          course_offering_id?: string | null
          created_at?: string
          day_of_week?: number
          ends_at?: string
          id?: string
          organization_id?: string
          room?: string | null
          section_id?: string
          starts_at?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "college_timetable_offering_tenant_fk"
            columns: ["course_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_timetable_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "college_timetable_slots_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "college_course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_timetable_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "college_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_timetable_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "colleges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_certificates: {
        Row: {
          competition_id: string
          id: string
          issued_at: string
          percentile: number | null
          rank: number
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          issued_at?: string
          percentile?: number | null
          rank: number
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          issued_at?: string
          percentile?: number | null
          rank?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_certificates_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_entries: {
        Row: {
          competition_id: string
          completed_at: string | null
          correct_count: number | null
          id: string
          percentile: number | null
          quiz_session_id: string | null
          rank: number | null
          score: number | null
          started_at: string
          time_spent: number | null
          user_id: string
        }
        Insert: {
          competition_id: string
          completed_at?: string | null
          correct_count?: number | null
          id?: string
          percentile?: number | null
          quiz_session_id?: string | null
          rank?: number | null
          score?: number | null
          started_at?: string
          time_spent?: number | null
          user_id: string
        }
        Update: {
          competition_id?: string
          completed_at?: string | null
          correct_count?: number | null
          id?: string
          percentile?: number | null
          quiz_session_id?: string | null
          rank?: number | null
          score?: number | null
          started_at?: string
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          chapter_id: string | null
          coin_reward: number
          competition_type: Database["public"]["Enums"]["competition_type"]
          created_at: string
          created_by: string | null
          description: string
          ends_at: string
          id: string
          organization_id: string | null
          question_count: number
          quiz_session_template: Json
          scope: Database["public"]["Enums"]["competition_scope"]
          section_a_id: string | null
          section_b_id: string | null
          starts_at: string
          subject_id: string | null
          time_limit_seconds: number
          title: string
          xp_reward: number
        }
        Insert: {
          chapter_id?: string | null
          coin_reward?: number
          competition_type: Database["public"]["Enums"]["competition_type"]
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at: string
          id?: string
          organization_id?: string | null
          question_count?: number
          quiz_session_template: Json
          scope?: Database["public"]["Enums"]["competition_scope"]
          section_a_id?: string | null
          section_b_id?: string | null
          starts_at: string
          subject_id?: string | null
          time_limit_seconds?: number
          title: string
          xp_reward?: number
        }
        Update: {
          chapter_id?: string | null
          coin_reward?: number
          competition_type?: Database["public"]["Enums"]["competition_type"]
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string
          id?: string
          organization_id?: string | null
          question_count?: number
          quiz_session_template?: Json
          scope?: Database["public"]["Enums"]["competition_scope"]
          section_a_id?: string | null
          section_b_id?: string | null
          starts_at?: string
          subject_id?: string | null
          time_limit_seconds?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "competitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          provider: string
          subject_id: string | null
          title: string
          total_messages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          provider?: string
          subject_id?: string | null
          title?: string
          total_messages?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          provider?: string
          subject_id?: string | null
          title?: string
          total_messages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_concepts: {
        Row: {
          board: string | null
          chapter_id: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          grade_level: string | null
          id: string
          order_index: number
          slo_code: string | null
          subject_id: string | null
          title: string
        }
        Insert: {
          board?: string | null
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          id?: string
          order_index?: number
          slo_code?: string | null
          subject_id?: string | null
          title: string
        }
        Update: {
          board?: string | null
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          id?: string
          order_index?: number
          slo_code?: string | null
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_concepts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_concepts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_prerequisites: {
        Row: {
          concept_id: string
          created_at: string
          prerequisite_concept_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          prerequisite_concept_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          prerequisite_concept_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_prerequisites_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_prerequisites_prerequisite_concept_id_fkey"
            columns: ["prerequisite_concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          converted_to_user_id: string | null
          correct_count: number | null
          id: string
          ip_hash: string | null
          question_ids: string[]
          score: number | null
          session_token: string
          started_at: string
          subject_id: string | null
          total_count: number | null
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          converted_to_user_id?: string | null
          correct_count?: number | null
          id?: string
          ip_hash?: string | null
          question_ids: string[]
          score?: number | null
          session_token: string
          started_at?: string
          subject_id?: string | null
          total_count?: number | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          converted_to_user_id?: string | null
          correct_count?: number | null
          id?: string
          ip_hash?: string | null
          question_ids?: string[]
          score?: number | null
          session_token?: string
          started_at?: string
          subject_id?: string | null
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_attempts_converted_to_user_id_fkey"
            columns: ["converted_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          question_ids: string[]
          score: number
          student_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          question_ids?: string[]
          score?: number
          student_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          question_ids?: string[]
          score?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_conversations: {
        Row: {
          context_type: string
          created_at: string
          id: string
          last_message_at: string | null
          organization_id: string | null
          participant_one_id: string
          participant_two_id: string
          relationship_type: string
        }
        Insert: {
          context_type: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          organization_id?: string | null
          participant_one_id: string
          participant_two_id: string
          relationship_type: string
        }
        Update: {
          context_type?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          organization_id?: string | null
          participant_one_id?: string
          participant_two_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_conversations_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversations_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doubt_replies: {
        Row: {
          body: string
          created_at: string
          doubt_id: string
          flagged: boolean
          flagged_reason: string | null
          id: string
          is_accepted: boolean
          is_peer_reply: boolean
          teacher_id: string
          xp_awarded: boolean
        }
        Insert: {
          body: string
          created_at?: string
          doubt_id: string
          flagged?: boolean
          flagged_reason?: string | null
          id?: string
          is_accepted?: boolean
          is_peer_reply?: boolean
          teacher_id: string
          xp_awarded?: boolean
        }
        Update: {
          body?: string
          created_at?: string
          doubt_id?: string
          flagged?: boolean
          flagged_reason?: string | null
          id?: string
          is_accepted?: boolean
          is_peer_reply?: boolean
          teacher_id?: string
          xp_awarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "doubt_replies_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doubt_replies_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_resolved: boolean
          moderation_blocked_until: string | null
          moderation_last_checked_count: number
          moderation_warning_count: number
          peer_reply_count: number
          student_id: string
          subject_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_resolved?: boolean
          moderation_blocked_until?: string | null
          moderation_last_checked_count?: number
          moderation_warning_count?: number
          peer_reply_count?: number
          student_id: string
          subject_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_resolved?: boolean
          moderation_blocked_until?: string | null
          moderation_last_checked_count?: number
          moderation_warning_count?: number
          peer_reply_count?: number
          student_id?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doubts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          chapter_id: string | null
          cover_color: string
          cover_icon: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          subject_id: string | null
          total_cards: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          cover_color?: string
          cover_icon?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          subject_id?: string | null
          total_cards?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          cover_color?: string
          cover_icon?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          subject_id?: string | null
          total_cards?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          ease_factor: number
          front: string
          hint: string | null
          id: string
          interval: number
          is_starred: boolean
          last_rating: string | null
          next_review_at: string
          repetitions: number
          tags: string[] | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          ease_factor?: number
          front: string
          hint?: string | null
          id?: string
          interval?: number
          is_starred?: boolean
          last_rating?: string | null
          next_review_at?: string
          repetitions?: number
          tags?: string[] | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          ease_factor?: number
          front?: string
          hint?: string | null
          id?: string
          interval?: number
          is_starred?: boolean
          last_rating?: string | null
          next_review_at?: string
          repetitions?: number
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_room_events: {
        Row: {
          created_at: string
          event_type: string
          game_id: string | null
          id: string
          payload: Json
          room_code: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          game_id?: string | null
          id?: string
          payload?: Json
          room_code: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          game_id?: string | null
          id?: string
          payload?: Json
          room_code?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_room_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_room_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string | null
          game_id: string | null
          id: string
          last_heartbeat_at: string
          room_code: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          game_id?: string | null
          id?: string
          last_heartbeat_at?: string
          room_code?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          game_id?: string | null
          id?: string
          last_heartbeat_at?: string
          room_code?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string | null
          featured: boolean
          game_type: string
          id: string
          is_active: boolean
          is_embedded: boolean
          min_tier: string
          play_url: string | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string | null
          featured?: boolean
          game_type?: string
          id?: string
          is_active?: boolean
          is_embedded?: boolean
          min_tier?: string
          play_url?: string | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string | null
          featured?: boolean
          game_type?: string
          id?: string
          is_active?: boolean
          is_embedded?: boolean
          min_tier?: string
          play_url?: string | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_payload_staging: {
        Row: {
          batch_id: string
          chunk: string
          seq: number
          total: number
        }
        Insert: {
          batch_id: string
          chunk: string
          seq: number
          total: number
        }
        Update: {
          batch_id?: string
          chunk?: string
          seq?: number
          total?: number
        }
        Relationships: []
      }
      institution_directory_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          read_by: string | null
          recipient_campus_id: string | null
          recipient_institution_type: string
          recipient_organization_id: string
          sender_institution_type: string
          sender_organization_id: string
          sender_profile_id: string
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          read_by?: string | null
          recipient_campus_id?: string | null
          recipient_institution_type: string
          recipient_organization_id: string
          sender_institution_type: string
          sender_organization_id: string
          sender_profile_id: string
          status?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          read_by?: string | null
          recipient_campus_id?: string | null
          recipient_institution_type?: string
          recipient_organization_id?: string
          sender_institution_type?: string
          sender_organization_id?: string
          sender_profile_id?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_directory_messages_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_directory_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_fee_payment_claims: {
        Row: {
          amount: number
          contact_email: string
          created_at: string
          id: string
          institution_type: string
          invoice_id: string
          method: string
          notes: string | null
          organization_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submitted_by: string | null
        }
        Insert: {
          amount: number
          contact_email: string
          created_at?: string
          id?: string
          institution_type: string
          invoice_id: string
          method: string
          notes?: string | null
          organization_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          submitted_by?: string | null
        }
        Update: {
          amount?: number
          contact_email?: string
          created_at?: string
          id?: string
          institution_type?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          organization_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_fee_payment_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_fee_payment_claims_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_fee_payment_claims_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_payment_verifications: {
        Row: {
          amount_pkr: number
          amount_usd: number
          billing_cycle: string
          contact_email: string
          created_at: string
          id: string
          institution_type: string
          method: string
          notes: string | null
          organization_id: string
          plan_tier_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
        }
        Insert: {
          amount_pkr?: number
          amount_usd?: number
          billing_cycle?: string
          contact_email: string
          created_at?: string
          id?: string
          institution_type: string
          method: string
          notes?: string | null
          organization_id: string
          plan_tier_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
        }
        Update: {
          amount_pkr?: number
          amount_usd?: number
          billing_cycle?: string
          contact_email?: string
          created_at?: string
          id?: string
          institution_type?: string
          method?: string
          notes?: string | null
          organization_id?: string
          plan_tier_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_payment_verifications_plan_tier_id_fkey"
            columns: ["plan_tier_id"]
            isOneToOne: false
            referencedRelation: "institution_plan_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_payment_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_payment_verifications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_plan_inquiries: {
        Row: {
          billing_cycle: string
          contact_email: string | null
          contact_name: string | null
          contact_user_id: string | null
          created_at: string
          discounted_price: number
          discounted_price_pkr: number | null
          id: string
          institution_name: string
          institution_type: string
          message: string | null
          plan_tier: string
          quote_currency: string
          status: string
          student_count: number
        }
        Insert: {
          billing_cycle?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_user_id?: string | null
          created_at?: string
          discounted_price: number
          discounted_price_pkr?: number | null
          id?: string
          institution_name: string
          institution_type: string
          message?: string | null
          plan_tier?: string
          quote_currency?: string
          status?: string
          student_count: number
        }
        Update: {
          billing_cycle?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_user_id?: string | null
          created_at?: string
          discounted_price?: number
          discounted_price_pkr?: number | null
          id?: string
          institution_name?: string
          institution_type?: string
          message?: string | null
          plan_tier?: string
          quote_currency?: string
          status?: string
          student_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_plan_inquiries_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_plan_tiers: {
        Row: {
          code: string
          created_at: string
          enabled_modules: string[]
          id: string
          institution_type: string
          is_active: boolean
          max_storage_gb: number
          max_students: number
          max_teachers: number
          min_students: number
          monthly_price_pkr: number
          monthly_price_usd: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled_modules?: string[]
          id?: string
          institution_type?: string
          is_active?: boolean
          max_storage_gb?: number
          max_students?: number
          max_teachers?: number
          min_students?: number
          monthly_price_pkr?: number
          monthly_price_usd?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled_modules?: string[]
          id?: string
          institution_type?: string
          is_active?: boolean
          max_storage_gb?: number
          max_students?: number
          max_teachers?: number
          min_students?: number
          monthly_price_pkr?: number
          monthly_price_usd?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kids_activity_log: {
        Row: {
          activity_key: string
          category: string
          created_at: string
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          activity_key: string
          category: string
          created_at?: string
          id?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          activity_key?: string
          category?: string
          created_at?: string
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "kids_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_gk_facts: {
        Row: {
          correct_index: number
          created_at: string
          emoji: string
          fun_fact: string | null
          id: string
          options: Json
          question: string
          xp_reward: number
        }
        Insert: {
          correct_index?: number
          created_at?: string
          emoji?: string
          fun_fact?: string | null
          id?: string
          options?: Json
          question: string
          xp_reward?: number
        }
        Update: {
          correct_index?: number
          created_at?: string
          emoji?: string
          fun_fact?: string | null
          id?: string
          options?: Json
          question?: string
          xp_reward?: number
        }
        Relationships: []
      }
      kids_islamic_lessons: {
        Row: {
          category: string
          content: string
          created_at: string
          emoji: string
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          emoji?: string
          id?: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          emoji?: string
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      kids_quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          emoji: string
          id: string
          options: Json
          question: string
          subject: string
          xp_reward: number
        }
        Insert: {
          correct_index?: number
          created_at?: string
          emoji?: string
          id?: string
          options?: Json
          question: string
          subject?: string
          xp_reward?: number
        }
        Update: {
          correct_index?: number
          created_at?: string
          emoji?: string
          id?: string
          options?: Json
          question?: string
          subject?: string
          xp_reward?: number
        }
        Relationships: []
      }
      kids_stories: {
        Row: {
          cover_emoji: string
          created_at: string
          id: string
          pages: Json
          title: string
          xp_reward: number
        }
        Insert: {
          cover_emoji?: string
          created_at?: string
          id?: string
          pages?: Json
          title: string
          xp_reward?: number
        }
        Update: {
          cover_emoji?: string
          created_at?: string
          id?: string
          pages?: Json
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      league_memberships: {
        Row: {
          created_at: string
          id: string
          tier: Database["public"]["Enums"]["league_tier"]
          user_id: string
          week_start_date: string
          weekly_xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          tier?: Database["public"]["Enums"]["league_tier"]
          user_id: string
          week_start_date: string
          weekly_xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          tier?: Database["public"]["Enums"]["league_tier"]
          user_id?: string
          week_start_date?: string
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          chapter_id: string
          concept_id: string | null
          created_at: string
          duration_seconds: number | null
          exercise_number: string | null
          id: string
          kind: string
          order_index: number
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          youtube_url: string
        }
        Insert: {
          chapter_id: string
          concept_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_number?: string | null
          id?: string
          kind?: string
          order_index?: number
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          youtube_url: string
        }
        Update: {
          chapter_id?: string
          concept_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_number?: string | null
          id?: string
          kind?: string
          order_index?: number
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resources: {
        Row: {
          added_by: string | null
          board: Database["public"]["Enums"]["board_type"] | null
          book_title: string | null
          category: string
          chapter_id: string | null
          content_section: string
          context_text_url: string | null
          created_at: string
          dark_file_url: string | null
          description: string | null
          drive_file_id: string | null
          drive_url: string
          extracted_chunk_count: number
          file_type: string | null
          grade_level: Database["public"]["Enums"]["grade_level"] | null
          has_context_text: boolean | null
          id: string
          importer_notes: string | null
          importer_status: string
          light_file_url: string | null
          resource_type: string
          subject_id: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          added_by?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          book_title?: string | null
          category?: string
          chapter_id?: string | null
          content_section?: string
          context_text_url?: string | null
          created_at?: string
          dark_file_url?: string | null
          description?: string | null
          drive_file_id?: string | null
          drive_url: string
          extracted_chunk_count?: number
          file_type?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          has_context_text?: boolean | null
          id?: string
          importer_notes?: string | null
          importer_status?: string
          light_file_url?: string | null
          resource_type?: string
          subject_id?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          added_by?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          book_title?: string | null
          category?: string
          chapter_id?: string | null
          content_section?: string
          context_text_url?: string | null
          created_at?: string
          dark_file_url?: string | null
          description?: string | null
          drive_file_id?: string | null
          drive_url?: string
          extracted_chunk_count?: number
          file_type?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          has_context_text?: boolean | null
          id?: string
          importer_notes?: string | null
          importer_status?: string
          light_file_url?: string | null
          resource_type?: string
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_resources_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      linked_accounts: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          last_switched_at: string | null
          linked_full_name: string | null
          linked_masked_email: string
          linked_profile_id: string
          linked_role: Database["public"]["Enums"]["user_role"]
          locked_until: string | null
          owner_full_name: string | null
          owner_masked_email: string
          owner_profile_id: string
          owner_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          last_switched_at?: string | null
          linked_full_name?: string | null
          linked_masked_email: string
          linked_profile_id: string
          linked_role: Database["public"]["Enums"]["user_role"]
          locked_until?: string | null
          owner_full_name?: string | null
          owner_masked_email: string
          owner_profile_id: string
          owner_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          last_switched_at?: string | null
          linked_full_name?: string | null
          linked_masked_email?: string
          linked_profile_id?: string
          linked_role?: Database["public"]["Enums"]["user_role"]
          locked_until?: string | null
          owner_full_name?: string | null
          owner_masked_email?: string
          owner_profile_id?: string
          owner_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "linked_accounts_linked_profile_id_fkey"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linked_accounts_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_pro: boolean
          name: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_pro?: boolean
          name: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_pro?: boolean
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string
          folder: string | null
          id: string
          is_public: boolean
          is_starred: boolean
          subject_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          is_public?: boolean
          is_starred?: boolean
          subject_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          is_public?: boolean
          is_starred?: boolean
          subject_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_download_log: {
        Row: {
          device_hint: string | null
          downloaded_at: string
          id: string
          resource_id: string
          resource_type: string
          student_id: string
        }
        Insert: {
          device_hint?: string | null
          downloaded_at?: string
          id?: string
          resource_id: string
          resource_type: string
          student_id: string
        }
        Update: {
          device_hint?: string | null
          downloaded_at?: string
          id?: string
          resource_id?: string
          resource_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_download_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_sync_conflicts: {
        Row: {
          actor_id: string | null
          client_payload: Json
          created_at: string
          entity_ref: Json
          entity_type: string
          id: string
          organization_id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          server_payload: Json
        }
        Insert: {
          actor_id?: string | null
          client_payload: Json
          created_at?: string
          entity_ref: Json
          entity_type: string
          id?: string
          organization_id: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          server_payload: Json
        }
        Update: {
          actor_id?: string | null
          client_payload?: Json
          created_at?: string
          entity_ref?: Json
          entity_type?: string
          id?: string
          organization_id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          server_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "offline_sync_conflicts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          eligibility: string | null
          external_url: string | null
          id: string
          is_verified: boolean
          organization: string | null
          source: string
          target_boards: string[] | null
          target_grade_levels:
            | Database["public"]["Enums"]["grade_level"][]
            | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          external_url?: string | null
          id?: string
          is_verified?: boolean
          organization?: string | null
          source?: string
          target_boards?: string[] | null
          target_grade_levels?:
            | Database["public"]["Enums"]["grade_level"][]
            | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          external_url?: string | null
          id?: string
          is_verified?: boolean
          organization?: string | null
          source?: string
          target_boards?: string[] | null
          target_grade_levels?:
            | Database["public"]["Enums"]["grade_level"][]
            | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      opportunity_bookmarks: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          reminder_date: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          reminder_date?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          reminder_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_bookmarks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_bookmarks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_checks: {
        Row: {
          answer_text: string | null
          created_at: string
          feedback: string
          id: string
          image_url: string | null
          input_type: string
          marks_obtained: number
          marks_total: number
          missing_elements: Json
          provider: string
          question_text: string | null
          student_id: string
          subject_id: string | null
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          feedback: string
          id?: string
          image_url?: string | null
          input_type?: string
          marks_obtained: number
          marks_total: number
          missing_elements?: Json
          provider?: string
          question_text?: string | null
          student_id: string
          subject_id?: string | null
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          feedback?: string
          id?: string
          image_url?: string | null
          input_type?: string
          marks_obtained?: number
          marks_total?: number
          missing_elements?: Json
          provider?: string
          question_text?: string | null
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_checks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_attachments: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_size_kb: number
          file_type: string
          file_url: string
          id: string
          link_id: string
          sender_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name: string
          file_size_kb: number
          file_type: string
          file_url: string
          id?: string
          link_id: string
          sender_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_size_kb?: number
          file_type?: string
          file_url?: string
          id?: string
          link_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_attachments_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "parent_student_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_attachments_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_family_goals: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          parent_id: string
          progress_value: number
          status: string
          student_id: string
          target_value: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          parent_id: string
          progress_value?: number
          status?: string
          student_id: string
          target_value?: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          parent_id?: string
          progress_value?: number
          status?: string
          student_id?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_family_goals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_family_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          link_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          link_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          link_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "parent_student_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          linked_at: string | null
          parent_id: string
          status: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          linked_at?: string | null
          parent_id: string
          status?: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          linked_at?: string | null
          parent_id?: string
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_weekly_reports: {
        Row: {
          ai_narrative: string | null
          created_at: string
          id: string
          parent_id: string
          student_id: string
          suggested_actions: Json | null
          summary: Json
          week_start_date: string
        }
        Insert: {
          ai_narrative?: string | null
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
          suggested_actions?: Json | null
          summary: Json
          week_start_date: string
        }
        Update: {
          ai_narrative?: string | null
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
          suggested_actions?: Json | null
          summary?: Json
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_weekly_reports_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_weekly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      past_paper_questions: {
        Row: {
          board: string | null
          chapter_id: string | null
          concept_id: string | null
          correct_answer: string | null
          created_at: string
          difficulty: string | null
          id: string
          is_verified: boolean
          marks: number | null
          options: Json | null
          page_number: number | null
          past_paper_id: string
          question_type: string
          source_excerpt: string | null
          subject_id: string | null
          text: string
          year: number | null
        }
        Insert: {
          board?: string | null
          chapter_id?: string | null
          concept_id?: string | null
          correct_answer?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          is_verified?: boolean
          marks?: number | null
          options?: Json | null
          page_number?: number | null
          past_paper_id: string
          question_type: string
          source_excerpt?: string | null
          subject_id?: string | null
          text: string
          year?: number | null
        }
        Update: {
          board?: string | null
          chapter_id?: string | null
          concept_id?: string | null
          correct_answer?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          is_verified?: boolean
          marks?: number | null
          options?: Json | null
          page_number?: number | null
          past_paper_id?: string
          question_type?: string
          source_excerpt?: string | null
          subject_id?: string | null
          text?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "past_paper_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_paper_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_paper_questions_past_paper_id_fkey"
            columns: ["past_paper_id"]
            isOneToOne: false
            referencedRelation: "past_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_paper_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      past_papers: {
        Row: {
          board: Database["public"]["Enums"]["board_type"]
          chapter_id: string | null
          context_text_url: string | null
          created_at: string
          download_count: number
          duration: number
          extracted_question_count: number
          extraction_status: string
          file_url: string
          grade_level: Database["public"]["Enums"]["grade_level"] | null
          id: string
          is_verified: boolean
          paper_type: Database["public"]["Enums"]["paper_type"]
          source_kind: string
          subject_id: string
          thumbnail_url: string | null
          total_questions: number
          year: number
        }
        Insert: {
          board: Database["public"]["Enums"]["board_type"]
          chapter_id?: string | null
          context_text_url?: string | null
          created_at?: string
          download_count?: number
          duration?: number
          extracted_question_count?: number
          extraction_status?: string
          file_url: string
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          is_verified?: boolean
          paper_type?: Database["public"]["Enums"]["paper_type"]
          source_kind?: string
          subject_id: string
          thumbnail_url?: string | null
          total_questions?: number
          year: number
        }
        Update: {
          board?: Database["public"]["Enums"]["board_type"]
          chapter_id?: string | null
          context_text_url?: string | null
          created_at?: string
          download_count?: number
          duration?: number
          extracted_question_count?: number
          extraction_status?: string
          file_url?: string
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          is_verified?: boolean
          paper_type?: Database["public"]["Enums"]["paper_type"]
          source_kind?: string
          subject_id?: string
          thumbnail_url?: string | null
          total_questions?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "past_papers_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          artist: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          is_active: boolean
          mime_type: string | null
          order_index: number
          playlist_id: string
          source_type: string
          storage_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          order_index?: number
          playlist_id: string
          source_type?: string
          storage_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          order_index?: number
          playlist_id?: string
          source_type?: string
          storage_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_settings: {
        Row: {
          bio: string | null
          headline: string | null
          id: string
          is_public: boolean
          public_slug: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          public_slug?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          public_slug?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_settings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_backgrounds: {
        Row: {
          category: string
          created_at: string
          id: string
          is_global: boolean
          keywords: string[]
          mode: string
          size_bytes: number
          storage_path: string
          subject: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_global?: boolean
          keywords?: string[]
          mode?: string
          size_bytes?: number
          storage_path: string
          subject?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_global?: boolean
          keywords?: string[]
          mode?: string
          size_bytes?: number
          storage_path?: string
          subject?: string
        }
        Relationships: []
      }
      presentations: {
        Row: {
          created_at: string
          deck_json: Json
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_json: Json
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_json?: Json
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      previous_marks: {
        Row: {
          created_at: string
          id: string
          marks_obtained: number
          marks_total: number
          student_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks_obtained: number
          marks_total?: number
          student_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marks_obtained?: number
          marks_total?: number
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "previous_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previous_marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_institution_name: string | null
          academic_institution_type: string | null
          ai_onboarding_complete: boolean
          ai_persona_provider: string | null
          ai_persona_tier: string | null
          avatar_url: string | null
          baseline_completed_at: string | null
          bio: string | null
          board: Database["public"]["Enums"]["board_type"] | null
          class: string | null
          coins: number
          college_id: string | null
          created_at: string
          date_of_birth: string | null
          education_level: string
          email: string
          full_name: string
          gender: string | null
          gender_changed_at: string | null
          grade_level: Database["public"]["Enums"]["grade_level"] | null
          id: string
          is_ai_operated: boolean
          is_email_verified: boolean
          is_profile_complete: boolean
          last_active_date: string | null
          level: number
          location: string | null
          notification_preferences: Json
          onboarding_completed: boolean
          onboarding_step: number
          optional_subject_ids: string[]
          parent_link_code: string | null
          phone: string | null
          preferred_language: string
          preferred_output_style: string
          previous_roll_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          science_group: string | null
          sponsored_institution_name: string | null
          sponsored_institution_type: string | null
          streak: number
          study_email_consent: boolean
          study_email_last_sent_at: string | null
          study_email_unsubscribed_at: string | null
          subject_condition_baseline: Json
          subjects: string[] | null
          subscription_expires_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          target_marks_percentage: number | null
          total_marks_percentage: number | null
          total_study_time: number
          university_courses: string[]
          university_degree: string | null
          university_exam_target_date: string | null
          university_program: string | null
          university_semester: string | null
          university_stream: string | null
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          academic_institution_name?: string | null
          academic_institution_type?: string | null
          ai_onboarding_complete?: boolean
          ai_persona_provider?: string | null
          ai_persona_tier?: string | null
          avatar_url?: string | null
          baseline_completed_at?: string | null
          bio?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          class?: string | null
          coins?: number
          college_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          education_level?: string
          email: string
          full_name: string
          gender?: string | null
          gender_changed_at?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id: string
          is_ai_operated?: boolean
          is_email_verified?: boolean
          is_profile_complete?: boolean
          last_active_date?: string | null
          level?: number
          location?: string | null
          notification_preferences?: Json
          onboarding_completed?: boolean
          onboarding_step?: number
          optional_subject_ids?: string[]
          parent_link_code?: string | null
          phone?: string | null
          preferred_language?: string
          preferred_output_style?: string
          previous_roll_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          science_group?: string | null
          sponsored_institution_name?: string | null
          sponsored_institution_type?: string | null
          streak?: number
          study_email_consent?: boolean
          study_email_last_sent_at?: string | null
          study_email_unsubscribed_at?: string | null
          subject_condition_baseline?: Json
          subjects?: string[] | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          target_marks_percentage?: number | null
          total_marks_percentage?: number | null
          total_study_time?: number
          university_courses?: string[]
          university_degree?: string | null
          university_exam_target_date?: string | null
          university_program?: string | null
          university_semester?: string | null
          university_stream?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          academic_institution_name?: string | null
          academic_institution_type?: string | null
          ai_onboarding_complete?: boolean
          ai_persona_provider?: string | null
          ai_persona_tier?: string | null
          avatar_url?: string | null
          baseline_completed_at?: string | null
          bio?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          class?: string | null
          coins?: number
          college_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          education_level?: string
          email?: string
          full_name?: string
          gender?: string | null
          gender_changed_at?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          is_ai_operated?: boolean
          is_email_verified?: boolean
          is_profile_complete?: boolean
          last_active_date?: string | null
          level?: number
          location?: string | null
          notification_preferences?: Json
          onboarding_completed?: boolean
          onboarding_step?: number
          optional_subject_ids?: string[]
          parent_link_code?: string | null
          phone?: string | null
          preferred_language?: string
          preferred_output_style?: string
          previous_roll_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          science_group?: string | null
          sponsored_institution_name?: string | null
          sponsored_institution_type?: string | null
          streak?: number
          study_email_consent?: boolean
          study_email_last_sent_at?: string | null
          study_email_unsubscribed_at?: string | null
          subject_condition_baseline?: Json
          subjects?: string[] | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          target_marks_percentage?: number | null
          total_marks_percentage?: number | null
          total_study_time?: number
          university_courses?: string[]
          university_degree?: string | null
          university_exam_target_date?: string | null
          university_program?: string | null
          university_semester?: string | null
          university_stream?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qbank_import_chunks: {
        Row: {
          batch: string
          chunk: string
          idx: number
          total: number
        }
        Insert: {
          batch: string
          chunk: string
          idx: number
          total: number
        }
        Update: {
          batch?: string
          chunk?: string
          idx?: number
          total?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          board: Database["public"]["Enums"]["board_type"] | null
          chapter_id: string
          concept_id: string | null
          correct_answer: Json
          correct_rate: number
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          is_demo_eligible: boolean
          is_verified: boolean
          marks: number
          metadata: Json
          options: Json | null
          question_type: string | null
          slo_code: string | null
          source_id: string | null
          source_kind: string | null
          subject_id: string
          tags: string[] | null
          text: string
          times_attempted: number
          topic_id: string | null
          type: Database["public"]["Enums"]["question_type"]
          year: number | null
        }
        Insert: {
          board?: Database["public"]["Enums"]["board_type"] | null
          chapter_id: string
          concept_id?: string | null
          correct_answer: Json
          correct_rate?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_demo_eligible?: boolean
          is_verified?: boolean
          marks?: number
          metadata?: Json
          options?: Json | null
          question_type?: string | null
          slo_code?: string | null
          source_id?: string | null
          source_kind?: string | null
          subject_id: string
          tags?: string[] | null
          text: string
          times_attempted?: number
          topic_id?: string | null
          type?: Database["public"]["Enums"]["question_type"]
          year?: number | null
        }
        Update: {
          board?: Database["public"]["Enums"]["board_type"] | null
          chapter_id?: string
          concept_id?: string | null
          correct_answer?: Json
          correct_rate?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_demo_eligible?: boolean
          is_verified?: boolean
          marks?: number
          metadata?: Json
          options?: Json | null
          question_type?: string | null
          slo_code?: string | null
          source_id?: string | null
          source_kind?: string | null
          subject_id?: string
          tags?: string[] | null
          text?: string
          times_attempted?: number
          topic_id?: string | null
          type?: Database["public"]["Enums"]["question_type"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          answers: Json
          chapter_ids: string[] | null
          class_id: string | null
          client_idempotency_key: string | null
          completed_at: string | null
          correct_count: number
          current_index: number
          id: string
          incorrect_count: number
          mode: Database["public"]["Enums"]["quiz_mode"]
          questions: Json
          score: number | null
          skipped_count: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subject_id: string
          time_limit: number | null
          time_spent: number
          total_marks: number
          user_id: string
        }
        Insert: {
          answers?: Json
          chapter_ids?: string[] | null
          class_id?: string | null
          client_idempotency_key?: string | null
          completed_at?: string | null
          correct_count?: number
          current_index?: number
          id?: string
          incorrect_count?: number
          mode?: Database["public"]["Enums"]["quiz_mode"]
          questions?: Json
          score?: number | null
          skipped_count?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          subject_id: string
          time_limit?: number | null
          time_spent?: number
          total_marks?: number
          user_id: string
        }
        Update: {
          answers?: Json
          chapter_ids?: string[] | null
          class_id?: string | null
          client_idempotency_key?: string | null
          completed_at?: string | null
          correct_count?: number
          current_index?: number
          id?: string
          incorrect_count?: number
          mode?: Database["public"]["Enums"]["quiz_mode"]
          questions?: Json
          score?: number | null
          skipped_count?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          subject_id?: string
          time_limit?: number | null
          time_spent?: number
          total_marks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_attendance: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          left_at: string | null
          session_date: string
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          session_date?: string
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          session_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quran_attendance_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "quran_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quran_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_daily_practice: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          practice_date: string
          student_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          practice_date?: string
          student_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          practice_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quran_daily_practice_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_group_members: {
        Row: {
          added_by: string | null
          created_at: string
          group_id: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          group_id: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          group_id?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quran_group_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quran_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "quran_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quran_group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_groups: {
        Row: {
          created_at: string
          created_by: string | null
          current_lesson: string | null
          days_of_week: number[]
          id: string
          livekit_room_name: string
          max_students: number
          name: string
          session_time: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_lesson?: string | null
          days_of_week?: number[]
          id?: string
          livekit_room_name: string
          max_students?: number
          name: string
          session_time: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_lesson?: string | null
          days_of_week?: number[]
          id?: string
          livekit_room_name?: string
          max_students?: number
          name?: string
          session_time?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quran_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quran_groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "quran_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_teachers: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          id: string
          profile_id: string
          status: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id: string
          status?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quran_teachers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quran_teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_signups: {
        Row: {
          code_used: string
          converted_at: string | null
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
          reward_granted: boolean
          status: string
        }
        Insert: {
          code_used: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
          reward_granted?: boolean
          status?: string
        }
        Update: {
          code_used?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
          reward_granted?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_signups_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_signups_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          created_at: string
          id: string
          status: string
          student_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          student_id: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          student_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          added_at: string
          authors: string | null
          citation_apa: string | null
          citation_mla: string | null
          id: string
          project_id: string
          source_url: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          added_at?: string
          authors?: string | null
          citation_apa?: string | null
          citation_mla?: string | null
          id?: string
          project_id: string
          source_url?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          added_at?: string
          authors?: string | null
          citation_apa?: string | null
          citation_mla?: string | null
          id?: string
          project_id?: string
          source_url?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          resource_id: string
          resource_kind: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          resource_id: string
          resource_kind: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          resource_id?: string
          resource_kind?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_concept_links: {
        Row: {
          concept_id: string
          confidence: number
          created_at: string
          resource_id: string
          resource_kind: string
        }
        Insert: {
          concept_id: string
          confidence?: number
          created_at?: string
          resource_id: string
          resource_kind: string
        }
        Update: {
          concept_id?: string
          confidence?: number
          created_at?: string
          resource_id?: string
          resource_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_concept_links_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_mcq_sets: {
        Row: {
          created_at: string
          error_message: string | null
          generated_at: string | null
          id: string
          long_questions: Json
          questions: Json
          resource_id: string
          resource_kind: string
          short_questions: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          long_questions?: Json
          questions?: Json
          resource_id: string
          resource_kind: string
          short_questions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          long_questions?: Json
          questions?: Json
          resource_id?: string
          resource_kind?: string
          short_questions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_processing_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          resource_id: string
          resource_kind: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          resource_id: string
          resource_kind: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          resource_id?: string
          resource_kind?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_reads: {
        Row: {
          chapter_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notified_test_prompt: boolean
          resource_id: string
          resource_kind: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notified_test_prompt?: boolean
          resource_id: string
          resource_kind: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notified_test_prompt?: boolean
          resource_id?: string
          resource_kind?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_reads_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_reads_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_source_chunks: {
        Row: {
          chunk_index: number
          concept_id: string | null
          confidence: number
          created_at: string
          heading: string | null
          id: string
          metadata: Json
          page_number: number | null
          resource_id: string
          resource_kind: string
          search_vector: unknown
          text: string
        }
        Insert: {
          chunk_index?: number
          concept_id?: string | null
          confidence?: number
          created_at?: string
          heading?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
          resource_id: string
          resource_kind: string
          search_vector?: unknown
          text: string
        }
        Update: {
          chunk_index?: number
          concept_id?: string | null
          confidence?: number
          created_at?: string
          heading?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
          resource_id?: string
          resource_kind?: string
          search_vector?: unknown
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_source_chunks_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_tests: {
        Row: {
          created_at: string
          id: string
          scheduled_at: string
          score: number | null
          status: string
          student_id: string
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          scheduled_at: string
          score?: number | null
          status?: string
          student_id: string
          subject: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          scheduled_at?: string
          score?: number | null
          status?: string
          student_id?: string
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_academic_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_current: boolean
          name: string
          organization_id: string
          starts_on: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_current?: boolean
          name: string
          organization_id: string
          starts_on: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_current?: boolean
          name?: string
          organization_id?: string
          starts_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_academic_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admission_documents: {
        Row: {
          admission_id: string
          document_type: string
          file_name: string
          id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          verification_status: string
        }
        Insert: {
          admission_id: string
          document_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          verification_status?: string
        }
        Update: {
          admission_id?: string
          document_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_admission_documents_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "school_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admission_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_documents_admission_tenant_fk"
            columns: ["admission_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_admissions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_admissions: {
        Row: {
          academic_year_id: string | null
          applicant_email: string | null
          applicant_name: string
          applicant_profile_id: string | null
          application_number: string
          applying_for_class: string
          b_form_number: string | null
          campus_id: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          guardian_cnic: string | null
          guardian_email: string | null
          guardian_name: string
          guardian_phone: string
          id: string
          notes: string | null
          organization_id: string
          previous_school: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_photo_url: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          applicant_email?: string | null
          applicant_name: string
          applicant_profile_id?: string | null
          application_number: string
          applying_for_class: string
          b_form_number?: string | null
          campus_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          guardian_cnic?: string | null
          guardian_email?: string | null
          guardian_name: string
          guardian_phone: string
          id?: string
          notes?: string | null
          organization_id: string
          previous_school?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_photo_url?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          applicant_email?: string | null
          applicant_name?: string
          applicant_profile_id?: string | null
          application_number?: string
          applying_for_class?: string
          b_form_number?: string | null
          campus_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          guardian_cnic?: string | null
          guardian_email?: string | null
          guardian_name?: string
          guardian_phone?: string
          id?: string
          notes?: string | null
          organization_id?: string
          previous_school?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_photo_url?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_admissions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admissions_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admissions_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admissions_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_admissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admissions_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          audience_roles: string[]
          body: string
          campus_id: string | null
          created_at: string
          created_by: string
          delivery_channels: string[]
          expires_at: string | null
          id: string
          organization_id: string
          priority: string
          published_at: string | null
          title: string
        }
        Insert: {
          audience_roles?: string[]
          body: string
          campus_id?: string | null
          created_at?: string
          created_by: string
          delivery_channels?: string[]
          expires_at?: string | null
          id?: string
          organization_id: string
          priority?: string
          published_at?: string | null
          title: string
        }
        Update: {
          audience_roles?: string[]
          body?: string
          campus_id?: string | null
          created_at?: string
          created_by?: string
          delivery_channels?: string[]
          expires_at?: string | null
          id?: string
          organization_id?: string
          priority?: string
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_attendance_records: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          id: string
          marked_at: string
          marked_by: string
          organization_id: string
          remarks: string | null
          section_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          check_in_time?: string | null
          id?: string
          marked_at?: string
          marked_by: string
          organization_id: string
          remarks?: string | null
          section_id: string
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          id?: string
          marked_at?: string
          marked_by?: string
          organization_id?: string
          remarks?: string | null
          section_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_records_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_hash: string | null
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_calendar_events: {
        Row: {
          audience_roles: string[]
          campus_id: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          organization_id: string
          starts_at: string
          title: string
        }
        Insert: {
          audience_roles?: string[]
          campus_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          organization_id: string
          starts_at: string
          title: string
        }
        Update: {
          audience_roles?: string[]
          campus_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_calendar_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_calendar_events_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_campuses: {
        Row: {
          address: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_main: boolean
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_campuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          academic_year_id: string
          campus_id: string
          created_at: string
          display_order: number
          grade_level: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          academic_year_id: string
          campus_id: string
          created_at?: string
          display_order?: number
          grade_level?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          academic_year_id?: string
          campus_id?: string
          created_at?: string
          display_order?: number
          grade_level?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_classes_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_classes_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_classes_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_contact_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          organization_id: string
          recipient_role: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          sender_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          organization_id: string
          recipient_role: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          sender_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          recipient_role?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          sender_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_contact_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_contact_messages_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_contact_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_enrollments: {
        Row: {
          academic_year_id: string
          admission_number: string
          created_at: string
          enrolled_on: string
          id: string
          organization_id: string
          roll_number: string | null
          section_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          admission_number: string
          created_at?: string
          enrolled_on?: string
          id?: string
          organization_id: string
          roll_number?: string | null
          section_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          admission_number?: string
          created_at?: string
          enrolled_on?: string
          id?: string
          organization_id?: string
          roll_number?: string | null
          section_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_enrollments_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_enrollments_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_exam_marks: {
        Row: {
          entered_at: string
          entered_by: string
          id: string
          is_absent: boolean
          marks_obtained: number | null
          organization_id: string
          remarks: string | null
          schedule_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          entered_at?: string
          entered_by: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          organization_id: string
          remarks?: string | null
          schedule_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          entered_at?: string
          entered_by?: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          organization_id?: string
          remarks?: string | null
          schedule_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_exam_marks_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_marks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_marks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "school_exam_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_marks_schedule_tenant_fk"
            columns: ["schedule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_exam_schedules"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_exam_schedules: {
        Row: {
          created_at: string
          ends_at: string | null
          exam_date: string
          exam_id: string
          id: string
          max_marks: number
          organization_id: string
          passing_marks: number
          room: string | null
          section_id: string
          starts_at: string | null
          subject_name: string
          subject_offering_id: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          exam_date: string
          exam_id: string
          id?: string
          max_marks?: number
          organization_id: string
          passing_marks?: number
          room?: string | null
          section_id: string
          starts_at?: string | null
          subject_name: string
          subject_offering_id?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          exam_date?: string
          exam_id?: string
          id?: string
          max_marks?: number
          organization_id?: string
          passing_marks?: number
          room?: string | null
          section_id?: string
          starts_at?: string | null
          subject_name?: string
          subject_offering_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_exam_schedules_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_schedules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_schedules_subject_offering_id_fkey"
            columns: ["subject_offering_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_schedules_exam_tenant_fk"
            columns: ["exam_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_schedules_offering_tenant_fk"
            columns: ["subject_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_schedules_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_exams: {
        Row: {
          academic_year_id: string
          created_at: string
          created_by: string
          ends_on: string
          grading_scheme: Json
          id: string
          name: string
          organization_id: string
          published_at: string | null
          starts_on: string
          status: string
          term: string | null
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          created_by: string
          ends_on: string
          grading_scheme?: Json
          id?: string
          name: string
          organization_id: string
          published_at?: string | null
          starts_on: string
          status?: string
          term?: string | null
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          created_by?: string
          ends_on?: string
          grading_scheme?: Json
          id?: string
          name?: string
          organization_id?: string
          published_at?: string | null
          starts_on?: string
          status?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exams_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          organization_id: string
          paid_via: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_via?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_fee_invoices: {
        Row: {
          academic_year_id: string
          billing_period: string | null
          created_at: string
          created_by: string
          discount_amount: number
          due_date: string
          fee_structure_id: string | null
          fine_amount: number
          id: string
          issue_date: string
          notes: string | null
          organization_id: string
          paid_amount: number
          scholarship_amount: number
          status: string
          student_id: string
          subtotal: number
          total_amount: number | null
          updated_at: string
          voucher_number: string
        }
        Insert: {
          academic_year_id: string
          billing_period?: string | null
          created_at?: string
          created_by: string
          discount_amount?: number
          due_date: string
          fee_structure_id?: string | null
          fine_amount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id: string
          paid_amount?: number
          scholarship_amount?: number
          status?: string
          student_id: string
          subtotal: number
          total_amount?: number | null
          updated_at?: string
          voucher_number: string
        }
        Update: {
          academic_year_id?: string
          billing_period?: string | null
          created_at?: string
          created_by?: string
          discount_amount?: number
          due_date?: string
          fee_structure_id?: string | null
          fine_amount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          scholarship_amount?: number
          status?: string
          student_id?: string
          subtotal?: number
          total_amount?: number | null
          updated_at?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_fee_invoices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "school_fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invoices_structure_tenant_fk"
            columns: ["fee_structure_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_fee_structures"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_invoices_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          paid_at: string
          payment_group_id: string | null
          payment_method: string
          provider: string | null
          provider_reference: string | null
          receipt_number: string
          received_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          paid_at?: string
          payment_group_id?: string | null
          payment_method: string
          provider?: string | null
          provider_reference?: string | null
          receipt_number: string
          received_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string
          payment_group_id?: string | null
          payment_method?: string
          provider?: string | null
          provider_reference?: string | null
          receipt_number?: string
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_fee_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "school_fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payments_invoice_tenant_fk"
            columns: ["invoice_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_fee_invoices"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_fee_structures: {
        Row: {
          academic_year_id: string
          amount: number
          class_id: string | null
          created_at: string
          due_day: number | null
          fee_type: string
          frequency: string
          id: string
          is_active: boolean
          late_fee_amount: number
          late_fee_type: string
          name: string
          organization_id: string
        }
        Insert: {
          academic_year_id: string
          amount: number
          class_id?: string | null
          created_at?: string
          due_day?: number | null
          fee_type: string
          frequency?: string
          id?: string
          is_active?: boolean
          late_fee_amount?: number
          late_fee_type?: string
          name: string
          organization_id: string
        }
        Update: {
          academic_year_id?: string
          amount?: number
          class_id?: string | null
          created_at?: string
          due_day?: number | null
          fee_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          late_fee_amount?: number
          late_fee_type?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_structures_class_tenant_fk"
            columns: ["class_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_fee_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fee_structures_year_tenant_fk"
            columns: ["academic_year_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_academic_years"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_guardians: {
        Row: {
          can_pick_up: boolean
          created_at: string
          guardian_id: string
          id: string
          is_primary: boolean
          organization_id: string
          receives_alerts: boolean
          relationship: string
          student_id: string
        }
        Insert: {
          can_pick_up?: boolean
          created_at?: string
          guardian_id: string
          id?: string
          is_primary?: boolean
          organization_id: string
          receives_alerts?: boolean
          relationship?: string
          student_id: string
        }
        Update: {
          can_pick_up?: boolean
          created_at?: string
          guardian_id?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          receives_alerts?: boolean
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_homework: {
        Row: {
          assigned_on: string
          attachment_url: string | null
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          max_marks: number | null
          organization_id: string
          section_id: string
          subject_offering_id: string | null
          title: string
        }
        Insert: {
          assigned_on?: string
          attachment_url?: string | null
          created_at?: string
          created_by: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number | null
          organization_id: string
          section_id: string
          subject_offering_id?: string | null
          title: string
        }
        Update: {
          assigned_on?: string
          attachment_url?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number | null
          organization_id?: string
          section_id?: string
          subject_offering_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_homework_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_homework_offering_tenant_fk"
            columns: ["subject_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_homework_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_homework_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_homework_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_homework_subject_offering_id_fkey"
            columns: ["subject_offering_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      school_join_requests: {
        Row: {
          id: string
          organization_id: string
          requested_at: string
          requester_id: string
          resolved_at: string | null
          resolved_by: string | null
          role_requested: string
          status: string
        }
        Insert: {
          id?: string
          organization_id: string
          requested_at?: string
          requester_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          role_requested: string
          status?: string
        }
        Update: {
          id?: string
          organization_id?: string
          requested_at?: string
          requester_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          role_requested?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_join_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_leave_requests: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          notified_at: string | null
          organization_id: string
          reason: string
          requester_id: string
          requester_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          starts_on: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          notified_at?: string | null
          organization_id: string
          reason: string
          requester_id: string
          requester_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_on: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          notified_at?: string | null
          organization_id?: string
          reason?: string
          requester_id?: string
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lesson_plans: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          lesson_date: string
          objectives: string | null
          organization_id: string
          resources: Json
          status: string
          subject_offering_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          lesson_date: string
          objectives?: string | null
          organization_id: string
          resources?: Json
          status?: string
          subject_offering_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          lesson_date?: string
          objectives?: string | null
          organization_id?: string
          resources?: Json
          status?: string
          subject_offering_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_lesson_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lesson_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lesson_plans_subject_offering_id_fkey"
            columns: ["subject_offering_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lessons_offering_tenant_fk"
            columns: ["subject_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_memberships: {
        Row: {
          campus_id: string | null
          designation: string | null
          employee_code: string | null
          id: string
          joined_at: string
          member_role: string
          organization_id: string
          permissions: string[]
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          designation?: string | null
          employee_code?: string | null
          id?: string
          joined_at?: string
          member_role: string
          organization_id: string
          permissions?: string[]
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          designation?: string | null
          employee_code?: string | null
          id?: string
          joined_at?: string
          member_role?: string
          organization_id?: string
          permissions?: string[]
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_memberships_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_notification_deliveries: {
        Row: {
          announcement_id: string | null
          attempts: number
          body: string | null
          category: string
          channel: string
          created_at: string
          dedupe_key: string | null
          id: string
          last_error: string | null
          notification_id: string | null
          organization_id: string
          provider_reference: string | null
          recipient_address: string | null
          recipient_id: string | null
          reference_id: string | null
          reference_type: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          title: string | null
        }
        Insert: {
          announcement_id?: string | null
          attempts?: number
          body?: string | null
          category?: string
          channel: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string | null
          organization_id: string
          provider_reference?: string | null
          recipient_address?: string | null
          recipient_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          announcement_id?: string | null
          attempts?: number
          body?: string | null
          category?: string
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string | null
          organization_id?: string
          provider_reference?: string | null
          recipient_address?: string | null
          recipient_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_deliveries_announcement_tenant_fk"
            columns: ["announcement_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_announcements"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_notification_deliveries_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "school_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notification_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notification_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_organization_plan_settings: {
        Row: {
          billing_status: string
          created_at: string
          enabled_modules: string[]
          grant_tier: string
          max_storage_gb: number
          max_students: number
          max_teachers: number
          monthly_price_pkr: number
          monthly_price_usd: number
          notes: string | null
          organization_id: string
          plan_tier_id: string | null
          renews_on: string | null
          starts_on: string | null
          trial_days: number | null
          trial_ends_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_status?: string
          created_at?: string
          enabled_modules?: string[]
          grant_tier?: string
          max_storage_gb?: number
          max_students?: number
          max_teachers?: number
          monthly_price_pkr?: number
          monthly_price_usd?: number
          notes?: string | null
          organization_id: string
          plan_tier_id?: string | null
          renews_on?: string | null
          starts_on?: string | null
          trial_days?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_status?: string
          created_at?: string
          enabled_modules?: string[]
          grant_tier?: string
          max_storage_gb?: number
          max_students?: number
          max_teachers?: number
          monthly_price_pkr?: number
          monthly_price_usd?: number
          notes?: string | null
          organization_id?: string
          plan_tier_id?: string | null
          renews_on?: string | null
          starts_on?: string | null
          trial_days?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_organization_plan_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_organization_plan_settings_plan_tier_id_fkey"
            columns: ["plan_tier_id"]
            isOneToOne: false
            referencedRelation: "institution_plan_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_organization_plan_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_type?: string
          phone?: string | null
          principal_name?: string | null
          principal_signature_url?: string | null
          settings?: Json
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_type?: string
          phone?: string | null
          principal_name?: string | null
          principal_signature_url?: string | null
          settings?: Json
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payroll_items: {
        Row: {
          base_salary: number
          bonus_amount: number
          created_at: string
          deduction_amount: number
          id: string
          membership_id: string
          net_amount: number
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          payroll_run_id: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus_amount?: number
          created_at?: string
          deduction_amount?: number
          id?: string
          membership_id: string
          net_amount?: number
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payroll_run_id: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus_amount?: number
          created_at?: string
          deduction_amount?: number
          id?: string
          membership_id?: string
          net_amount?: number
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payroll_run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_payroll_items_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "school_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payroll_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "school_payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payroll_runs: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          deductions_amount: number
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          organization_id: string
          paid_by: string | null
          payroll_month: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions_amount?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          organization_id: string
          paid_by?: string | null
          payroll_month: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions_amount?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          organization_id?: string
          paid_by?: string | null
          payroll_month?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payroll_runs_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_pending_student_additions: {
        Row: {
          created_at: string
          detected_by: string
          extracted_name: string
          extracted_roll_number: string | null
          id: string
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          section_id: string
          status: string
        }
        Insert: {
          created_at?: string
          detected_by: string
          extracted_name: string
          extracted_roll_number?: string | null
          id?: string
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id: string
          status?: string
        }
        Update: {
          created_at?: string
          detected_by?: string
          extracted_name?: string
          extracted_roll_number?: string | null
          id?: string
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_pending_additions_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_pending_student_additions_detected_by_fkey"
            columns: ["detected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_pending_student_additions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_pending_student_additions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_pending_student_additions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      school_principal_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_principal_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_principal_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ptm_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string
          organization_id: string
          request_id: string
          visibility: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          organization_id: string
          request_id: string
          visibility?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          organization_id?: string
          request_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_ptm_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "school_ptm_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ptm_participants: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          participant_role: string
          profile_id: string
          request_id: string
          rsvp_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          participant_role: string
          profile_id: string
          request_id: string
          rsvp_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          participant_role?: string
          profile_id?: string
          request_id?: string
          rsvp_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_ptm_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_participants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "school_ptm_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ptm_requests: {
        Row: {
          campus_id: string | null
          cancel_reason: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          join_link: string | null
          location: string | null
          meeting_mode: string
          organization_id: string
          parent_id: string | null
          reminder_sent_at: string | null
          requested_by: string
          rescheduled_from_id: string | null
          responded_at: string | null
          responded_by: string | null
          slot_id: string | null
          starts_at: string | null
          status: string
          student_id: string
          teacher_id: string
          teacher_response: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          join_link?: string | null
          location?: string | null
          meeting_mode?: string
          organization_id: string
          parent_id?: string | null
          reminder_sent_at?: string | null
          requested_by: string
          rescheduled_from_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          slot_id?: string | null
          starts_at?: string | null
          status?: string
          student_id: string
          teacher_id: string
          teacher_response?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          join_link?: string | null
          location?: string | null
          meeting_mode?: string
          organization_id?: string
          parent_id?: string | null
          reminder_sent_at?: string | null
          requested_by?: string
          rescheduled_from_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          slot_id?: string | null
          starts_at?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          teacher_response?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_ptm_requests_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_ptm_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "school_ptm_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "school_ptm_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_slot_tenant_fk"
            columns: ["slot_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_ptm_slots"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_ptm_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ptm_slots: {
        Row: {
          campus_id: string | null
          created_at: string
          ends_at: string
          id: string
          is_open: boolean
          location: string | null
          max_participants: number
          meeting_mode: string
          notes: string | null
          organization_id: string
          starts_at: string
          teacher_id: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          is_open?: boolean
          location?: string | null
          max_participants?: number
          meeting_mode?: string
          notes?: string | null
          organization_id: string
          starts_at: string
          teacher_id: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          is_open?: boolean
          location?: string | null
          max_participants?: number
          meeting_mode?: string
          notes?: string | null
          organization_id?: string
          starts_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_ptm_slots_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_slots_campus_tenant_fk"
            columns: ["campus_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_ptm_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ptm_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_report_cards: {
        Row: {
          ai_comment: string | null
          ai_comment_generated_at: string | null
          class_position: number | null
          exam_id: string
          generated_at: string
          gpa: number | null
          grade: string | null
          id: string
          obtained_marks: number
          organization_id: string
          percentage: number
          published_at: string | null
          student_id: string
          summary: Json
          teacher_comment: string | null
          total_marks: number
        }
        Insert: {
          ai_comment?: string | null
          ai_comment_generated_at?: string | null
          class_position?: number | null
          exam_id: string
          generated_at?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          obtained_marks?: number
          organization_id: string
          percentage?: number
          published_at?: string | null
          student_id: string
          summary?: Json
          teacher_comment?: string | null
          total_marks?: number
        }
        Update: {
          ai_comment?: string | null
          ai_comment_generated_at?: string | null
          class_position?: number | null
          exam_id?: string
          generated_at?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          obtained_marks?: number
          organization_id?: string
          percentage?: number
          published_at?: string | null
          student_id?: string
          summary?: Json
          teacher_comment?: string | null
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_report_cards_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_reports_exam_tenant_fk"
            columns: ["exam_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      school_resources: {
        Row: {
          class_id: string | null
          context_text_url: string | null
          created_at: string
          dark_file_url: string | null
          description: string | null
          file_type: string
          file_url: string
          id: string
          light_file_url: string | null
          organization_id: string
          resource_type: string
          section_id: string | null
          status: string
          subject_name: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          class_id?: string | null
          context_text_url?: string | null
          created_at?: string
          dark_file_url?: string | null
          description?: string | null
          file_type?: string
          file_url: string
          id?: string
          light_file_url?: string | null
          organization_id: string
          resource_type?: string
          section_id?: string | null
          status?: string
          subject_name?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          class_id?: string | null
          context_text_url?: string | null
          created_at?: string
          dark_file_url?: string | null
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
          light_file_url?: string | null
          organization_id?: string
          resource_type?: string
          section_id?: string | null
          status?: string
          subject_name?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_resources_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_sections: {
        Row: {
          capacity: number
          class_id: string
          created_at: string
          homeroom_teacher_id: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          room: string | null
        }
        Insert: {
          capacity?: number
          class_id: string
          created_at?: string
          homeroom_teacher_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          room?: string | null
        }
        Update: {
          capacity?: number
          class_id?: string
          created_at?: string
          homeroom_teacher_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_sections_class_tenant_fk"
            columns: ["class_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_sections_homeroom_teacher_id_fkey"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_staff_attendance: {
        Row: {
          attendance_date: string
          check_in_at: string | null
          check_out_at: string | null
          id: string
          marked_by: string | null
          membership_id: string
          organization_id: string
          remarks: string | null
          status: string
        }
        Insert: {
          attendance_date: string
          check_in_at?: string | null
          check_out_at?: string | null
          id?: string
          marked_by?: string | null
          membership_id: string
          organization_id: string
          remarks?: string | null
          status: string
        }
        Update: {
          attendance_date?: string
          check_in_at?: string | null
          check_out_at?: string | null
          id?: string
          marked_by?: string | null
          membership_id?: string
          organization_id?: string
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_staff_attendance_member_tenant_fk"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_staff_attendance_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "school_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_staff_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_staff_compensation: {
        Row: {
          bank_account_number: string | null
          bank_account_title: string | null
          base_salary: number
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          membership_id: string
          notes: string | null
          organization_id: string
          pay_frequency: string
          updated_at: string
          wallet_number: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_account_title?: string | null
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          membership_id: string
          notes?: string | null
          organization_id: string
          pay_frequency?: string
          updated_at?: string
          wallet_number?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_account_title?: string | null
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          membership_id?: string
          notes?: string | null
          organization_id?: string
          pay_frequency?: string
          updated_at?: string
          wallet_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_compensation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_staff_compensation_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "school_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_staff_compensation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subject_offerings: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          section_id: string
          subject_id: string | null
          subject_name: string
          teacher_id: string | null
          weekly_periods: number
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          section_id: string
          subject_id?: string | null
          subject_name: string
          teacher_id?: string | null
          weekly_periods?: number
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          section_id?: string
          subject_id?: string | null
          subject_name?: string
          teacher_id?: string | null
          weekly_periods?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_offerings_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_subject_offerings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subject_offerings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subject_offerings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subject_offerings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_teacher_biometric_devices: {
        Row: {
          campus_id: string | null
          comm_key: number
          created_at: string
          created_by: string | null
          device_ip: string
          id: string
          last_sync_error: string | null
          last_sync_status: string
          last_synced_at: string | null
          name: string
          organization_id: string
          port: number
        }
        Insert: {
          campus_id?: string | null
          comm_key?: number
          created_at?: string
          created_by?: string | null
          device_ip: string
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string
          last_synced_at?: string | null
          name: string
          organization_id: string
          port?: number
        }
        Update: {
          campus_id?: string | null
          comm_key?: number
          created_at?: string
          created_by?: string | null
          device_ip?: string
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          port?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_teacher_biometric_devices_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_teacher_biometric_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_teacher_biometric_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_teacher_biometric_mappings: {
        Row: {
          created_at: string
          device_id: string
          device_user_id: string
          id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_user_id: string
          id?: string
          membership_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_user_id?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_teacher_biometric_mappings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "school_teacher_biometric_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_teacher_biometric_mappings_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "school_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      school_timetable_entries: {
        Row: {
          created_at: string
          day_of_week: number
          ends_at: string
          id: string
          organization_id: string
          room: string | null
          section_id: string
          starts_at: string
          subject_name: string
          subject_offering_id: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          ends_at: string
          id?: string
          organization_id: string
          room?: string | null
          section_id: string
          starts_at: string
          subject_name: string
          subject_offering_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          ends_at?: string
          id?: string
          organization_id?: string
          room?: string | null
          section_id?: string
          starts_at?: string
          subject_name?: string
          subject_offering_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_timetable_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_entries_subject_offering_id_fkey"
            columns: ["subject_offering_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_offering_tenant_fk"
            columns: ["subject_offering_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_subject_offerings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "school_timetable_section_tenant_fk"
            columns: ["section_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      speaking_practice_sessions: {
        Row: {
          ai_feedback: string | null
          audio_url: string | null
          created_at: string
          id: string
          language: string
          prompt_text: string
          pronunciation_score: number | null
          student_id: string
          transcript: string | null
        }
        Insert: {
          ai_feedback?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          language: string
          prompt_text: string
          pronunciation_score?: number | null
          student_id: string
          transcript?: string | null
        }
        Update: {
          ai_feedback?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          language?: string
          prompt_text?: string
          pronunciation_score?: number | null
          student_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "speaking_practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_avatar_inventory: {
        Row: {
          acquired_at: string
          equipped: boolean
          id: string
          item_id: string
          student_id: string
        }
        Insert: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id: string
          student_id: string
        }
        Update: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_avatar_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "avatar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_avatar_inventory_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "student_chat_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chat_requests: {
        Row: {
          created_at: string
          id: string
          moderation_blocked_until: string | null
          moderation_last_checked_message_count: number
          moderation_last_reason: string | null
          moderation_warning_count: number
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          moderation_blocked_until?: string | null
          moderation_last_checked_message_count?: number
          moderation_last_reason?: string | null
          moderation_warning_count?: number
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          moderation_blocked_until?: string | null
          moderation_last_checked_message_count?: number
          moderation_last_reason?: string | null
          moderation_warning_count?: number
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_digital_twin: {
        Row: {
          attention_span_minutes: number | null
          avg_solve_speed_seconds: number | null
          confidence_level: number
          created_at: string
          id: string
          last_recomputed_at: string | null
          learning_style: string | null
          predicted_exam_score: number | null
          preferred_study_time: string | null
          signal_count: number
          strengths: Json
          student_id: string
          updated_at: string
          weaknesses: Json
        }
        Insert: {
          attention_span_minutes?: number | null
          avg_solve_speed_seconds?: number | null
          confidence_level?: number
          created_at?: string
          id?: string
          last_recomputed_at?: string | null
          learning_style?: string | null
          predicted_exam_score?: number | null
          preferred_study_time?: string | null
          signal_count?: number
          strengths?: Json
          student_id: string
          updated_at?: string
          weaknesses?: Json
        }
        Update: {
          attention_span_minutes?: number | null
          avg_solve_speed_seconds?: number | null
          confidence_level?: number
          created_at?: string
          id?: string
          last_recomputed_at?: string | null
          learning_style?: string | null
          predicted_exam_score?: number | null
          preferred_study_time?: string | null
          signal_count?: number
          strengths?: Json
          student_id?: string
          updated_at?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "student_digital_twin_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_digital_twin_history: {
        Row: {
          confidence_level: number
          created_at: string
          id: string
          predicted_exam_score: number | null
          strengths: Json
          student_id: string
          weaknesses: Json
        }
        Insert: {
          confidence_level: number
          created_at?: string
          id?: string
          predicted_exam_score?: number | null
          strengths?: Json
          student_id: string
          weaknesses?: Json
        }
        Update: {
          confidence_level?: number
          created_at?: string
          id?: string
          predicted_exam_score?: number | null
          strengths?: Json
          student_id?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "student_digital_twin_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_mistakes: {
        Row: {
          chapter_id: string | null
          concept_id: string | null
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          last_reviewed_at: string | null
          past_paper_question_id: string | null
          question_id: string | null
          question_text: string
          selected_answer: string | null
          source: string
          status: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          concept_id?: string | null
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          last_reviewed_at?: string | null
          past_paper_question_id?: string | null
          question_id?: string | null
          question_text: string
          selected_answer?: string | null
          source?: string
          status?: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          concept_id?: string | null
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          last_reviewed_at?: string | null
          past_paper_question_id?: string | null
          question_id?: string | null
          question_text?: string
          selected_answer?: string | null
          source?: string
          status?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_mistakes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mistakes_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mistakes_past_paper_question_id_fkey"
            columns: ["past_paper_question_id"]
            isOneToOne: false
            referencedRelation: "past_paper_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mistakes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_predictions: {
        Row: {
          admission_probability: Json | null
          burnout_risk_score: number | null
          chapter_mastery_estimate: Json | null
          computed_at: string
          dropout_risk_score: number | null
          id: string
          narrative: Json
          predicted_board_marks: number | null
          predicted_entry_test_score: number | null
          student_id: string
          weak_chapter_risk: Json | null
        }
        Insert: {
          admission_probability?: Json | null
          burnout_risk_score?: number | null
          chapter_mastery_estimate?: Json | null
          computed_at?: string
          dropout_risk_score?: number | null
          id?: string
          narrative?: Json
          predicted_board_marks?: number | null
          predicted_entry_test_score?: number | null
          student_id: string
          weak_chapter_risk?: Json | null
        }
        Update: {
          admission_probability?: Json | null
          burnout_risk_score?: number | null
          chapter_mastery_estimate?: Json | null
          computed_at?: string
          dropout_risk_score?: number | null
          id?: string
          narrative?: Json
          predicted_board_marks?: number | null
          predicted_entry_test_score?: number | null
          student_id?: string
          weak_chapter_risk?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "student_predictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_revision_items: {
        Row: {
          chapter_id: string | null
          completed_at: string | null
          concept_id: string | null
          created_at: string
          due_at: string
          id: string
          interval_days: number
          mistake_id: string | null
          prompt: string
          status: string
          student_id: string
          subject_id: string | null
          title: string
        }
        Insert: {
          chapter_id?: string | null
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          due_at: string
          id?: string
          interval_days?: number
          mistake_id?: string | null
          prompt: string
          status?: string
          student_id: string
          subject_id?: string | null
          title: string
        }
        Update: {
          chapter_id?: string | null
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          interval_days?: number
          mistake_id?: string | null
          prompt?: string
          status?: string
          student_id?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_revision_items_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_revision_items_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "curriculum_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_revision_items_mistake_id_fkey"
            columns: ["mistake_id"]
            isOneToOne: false
            referencedRelation: "student_mistakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_revision_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_revision_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_weekly_snapshots: {
        Row: {
          ai_messages_sent: number
          average_score: number
          created_at: string
          id: string
          quizzes_completed: number
          streak_days: number
          student_id: string
          study_minutes: number
          subjects_studied: string[] | null
          week_start: string
          xp_earned: number
        }
        Insert: {
          ai_messages_sent?: number
          average_score?: number
          created_at?: string
          id?: string
          quizzes_completed?: number
          streak_days?: number
          student_id: string
          study_minutes?: number
          subjects_studied?: string[] | null
          week_start: string
          xp_earned?: number
        }
        Update: {
          ai_messages_sent?: number
          average_score?: number
          created_at?: string
          id?: string
          quizzes_completed?: number
          streak_days?: number
          student_id?: string
          study_minutes?: number
          subjects_studied?: string[] | null
          week_start?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_weekly_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_sessions: {
        Row: {
          chapter_id: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          is_completed: boolean
          plan_id: string
          session_date: string
          session_type: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          is_completed?: boolean
          plan_id: string
          session_date: string
          session_type: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_completed?: boolean
          plan_id?: string
          session_date?: string
          session_type?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          constraints: Json
          created_at: string
          daily_available_hours: number
          exam_date: string | null
          id: string
          is_active: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          constraints?: Json
          created_at?: string
          daily_available_hours?: number
          exam_date?: string | null
          id?: string
          is_active?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          constraints?: Json
          created_at?: string
          daily_available_hours?: number
          exam_date?: string | null
          id?: string
          is_active?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_routines: {
        Row: {
          created_at: string
          generated_by_provider: string | null
          id: string
          preferences: Json
          schedule: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_by_provider?: string | null
          id?: string
          preferences?: Json
          schedule?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_by_provider?: string | null
          id?: string
          preferences?: Json
          schedule?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          date: string
          duration: number
          id: string
          subject_id: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id: string
          xp_earned: number
        }
        Insert: {
          created_at?: string
          date?: string
          duration?: number
          id?: string
          subject_id?: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id: string
          xp_earned?: number
        }
        Update: {
          created_at?: string
          date?: string
          duration?: number
          id?: string
          subject_id?: string | null
          type?: Database["public"]["Enums"]["session_type"]
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          boards: Database["public"]["Enums"]["board_type"][]
          code: string
          color: string
          created_at: string
          description: string | null
          grade_levels: Database["public"]["Enums"]["grade_level"][]
          icon_url: string | null
          id: string
          is_active: boolean
          is_optional: boolean
          name: string
          slug: string
          stream: string | null
          total_chapters: number
          total_questions: number
        }
        Insert: {
          boards?: Database["public"]["Enums"]["board_type"][]
          code: string
          color?: string
          created_at?: string
          description?: string | null
          grade_levels?: Database["public"]["Enums"]["grade_level"][]
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_optional?: boolean
          name: string
          slug: string
          stream?: string | null
          total_chapters?: number
          total_questions?: number
        }
        Update: {
          boards?: Database["public"]["Enums"]["board_type"][]
          code?: string
          color?: string
          created_at?: string
          description?: string | null
          grade_levels?: Database["public"]["Enums"]["grade_level"][]
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_optional?: boolean
          name?: string
          slug?: string
          stream?: string | null
          total_chapters?: number
          total_questions?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          board: string | null
          created_at: string
          grade_level: Database["public"]["Enums"]["grade_level"] | null
          id: string
          join_code: string
          name: string
          subject_id: string | null
          teacher_id: string
        }
        Insert: {
          board?: string | null
          created_at?: string
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          join_code: string
          name: string
          subject_id?: string | null
          teacher_id: string
        }
        Update: {
          board?: string | null
          created_at?: string
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          join_code?: string
          name?: string
          subject_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_generated_test_items: {
        Row: {
          created_at: string
          id: string
          marks: number
          position: number
          question_id: string | null
          question_snapshot: Json
          section: string
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks?: number
          position?: number
          question_id?: string | null
          question_snapshot?: Json
          section: string
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marks?: number
          position?: number
          question_id?: string | null
          question_snapshot?: Json
          section?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_generated_test_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_generated_test_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "teacher_generated_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_generated_tests: {
        Row: {
          chapter_id: string
          created_at: string
          created_by: string
          custom_header: string | null
          custom_watermark_image_url: string | null
          custom_watermark_text: string | null
          difficulty: string | null
          duration_minutes: number
          grade_level: string | null
          hide_platform_branding: boolean
          id: string
          include_answer_key: boolean
          institution_name: string | null
          long_count: number
          mcq_count: number
          paper_snapshot: Json
          plan_tier: string
          school_class: string | null
          short_count: number
          subject_id: string
          theme: string
          title: string
          total_marks: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          created_by: string
          custom_header?: string | null
          custom_watermark_image_url?: string | null
          custom_watermark_text?: string | null
          difficulty?: string | null
          duration_minutes?: number
          grade_level?: string | null
          hide_platform_branding?: boolean
          id?: string
          include_answer_key?: boolean
          institution_name?: string | null
          long_count?: number
          mcq_count?: number
          paper_snapshot?: Json
          plan_tier?: string
          school_class?: string | null
          short_count?: number
          subject_id: string
          theme?: string
          title?: string
          total_marks?: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          created_by?: string
          custom_header?: string | null
          custom_watermark_image_url?: string | null
          custom_watermark_text?: string | null
          difficulty?: string | null
          duration_minutes?: number
          grade_level?: string | null
          hide_platform_branding?: boolean
          id?: string
          include_answer_key?: boolean
          institution_name?: string | null
          long_count?: number
          mcq_count?: number
          paper_snapshot?: Json
          plan_tier?: string
          school_class?: string | null
          short_count?: number
          subject_id?: string
          theme?: string
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_generated_tests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_generated_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_generated_tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          chapter_id: string
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          video_url: string | null
        }
        Insert: {
          chapter_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      university_degree_programs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          stream: string | null
          total_years: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          stream?: string | null
          total_years?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          stream?: string | null
          total_years?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_degree_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      university_program_year_subjects: {
        Row: {
          created_at: string
          id: string
          program_year_id: string
          sort_order: number
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_year_id: string
          sort_order?: number
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_year_id?: string
          sort_order?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_program_year_subjects_program_year_id_fkey"
            columns: ["program_year_id"]
            isOneToOne: false
            referencedRelation: "university_program_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_program_year_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "university_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      university_program_years: {
        Row: {
          created_at: string
          id: string
          label: string
          program_id: string
          sort_order: number
          year_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          program_id: string
          sort_order?: number
          year_number: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          program_id?: string
          sort_order?: number
          year_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "university_program_years_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "university_degree_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      university_questions: {
        Row: {
          correct_answer: Json
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          is_verified: boolean
          marks: number
          options: Json
          subject_id: string
          text: string
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_verified?: boolean
          marks?: number
          options?: Json
          subject_id: string
          text: string
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_verified?: boolean
          marks?: number
          options?: Json
          subject_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "university_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      university_subject_resources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          resource_type: string
          sort_order: number
          subject_id: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          resource_type: string
          sort_order?: number
          subject_id: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          resource_type?: string
          sort_order?: number
          subject_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "university_subject_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_subject_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "university_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      university_subjects: {
        Row: {
          created_at: string
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          program_year_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          program_year_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          program_year_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_subjects_program_year_id_fkey"
            columns: ["program_year_id"]
            isOneToOne: false
            referencedRelation: "university_program_years"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_qbank_stage_20260823: {
        Row: {
          batch_id: string
          chunk: string
          seq: number
          total: number
        }
        Insert: {
          batch_id: string
          chunk: string
          seq: number
          total: number
        }
        Update: {
          batch_id?: string
          chunk?: string
          seq?: number
          total?: number
        }
        Relationships: []
      }
      vision_scans: {
        Row: {
          ai_explanation: string | null
          chapter_id: string | null
          created_at: string
          id: string
          image_url: string
          language: string
          ocr_text: string | null
          scan_type: string
          student_id: string
        }
        Insert: {
          ai_explanation?: string | null
          chapter_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          language?: string
          ocr_text?: string | null
          scan_type: string
          student_id: string
        }
        Update: {
          ai_explanation?: string | null
          chapter_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          language?: string
          ocr_text?: string | null
          scan_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_scans_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_scans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      apply_chem_extract_response: {
        Args: { p_request_id: number }
        Returns: Json
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_next_review: {
        Args: { p_ease_factor: number; p_interval: number; p_quality: number }
        Returns: Json
      }
      college_can_view_student: {
        Args: { p_organization_id: string; p_student_id: string }
        Returns: boolean
      }
      college_enabled_modules: {
        Args: { p_organization_id: string }
        Returns: string[]
      }
      college_has_role: {
        Args: { p_organization_id: string; p_roles: string[] }
        Returns: boolean
      }
      college_is_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      college_is_platform_admin: { Args: never; Returns: boolean }
      college_teacher_can_manage_section: {
        Args: { p_organization_id: string; p_section_id: string }
        Returns: boolean
      }
      college_teacher_can_manage_student: {
        Args: { p_organization_id: string; p_student_id: string }
        Returns: boolean
      }
      college_update_organization_logo: {
        Args: { p_logo_url: string; p_organization_id: string }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "college_organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      college_update_organization_profile: {
        Args: {
          p_address: string
          p_currency: string
          p_email: string
          p_name: string
          p_organization_id: string
          p_phone: string
          p_timezone: string
        }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "college_organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      college_update_principal_signature: {
        Args: {
          p_organization_id: string
          p_principal_name: string
          p_signature_url: string
        }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "college_organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_week_start: { Args: never; Returns: string }
      enforce_session_limit: {
        Args: {
          p_current_session_id: string
          p_max_sessions?: number
          p_user_id: string
        }
        Returns: undefined
      }
      exec_script_b64: { Args: { p_b64: string }; Returns: undefined }
      finalize_qbank_txt_import: { Args: { p_batch: string }; Returns: Json }
      get_import_staged_payload: { Args: { p_batch: string }; Returns: string }
      get_leaderboard: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          board: Database["public"]["Enums"]["board_type"]
          full_name: string
          id: string
          level: number
          rank: number
          streak: number
          xp: number
        }[]
      }
      get_or_create_direct_conversation: {
        Args: {
          p_context_type: string
          p_organization_id: string
          p_other_profile_id: string
          p_relationship_type: string
        }
        Returns: {
          context_type: string
          created_at: string
          id: string
          last_message_at: string | null
          organization_id: string | null
          participant_one_id: string
          participant_two_id: string
          relationship_type: string
        }
        SetofOptions: {
          from: "*"
          to: "direct_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      import_academic_questions: { Args: { p_payload: Json }; Returns: number }
      import_qbank_payload: { Args: { p_payload: Json }; Returns: Json }
      increment_ad_impression: {
        Args: { p_banner_id: string }
        Returns: undefined
      }
      increment_coins: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      increment_xp_and_league: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          level: number
          weekly_xp: number
          xp: number
        }[]
      }
      is_institution_owner_or_admin: {
        Args: { p_institution_type: string; p_organization_id: string }
        Returns: boolean
      }
      is_institution_principal: {
        Args: { p_institution_type: string; p_organization_id: string }
        Returns: boolean
      }
      kick_atm_mcq: { Args: never; Returns: number }
      kick_atomic_mcq: { Args: never; Returns: number }
      kick_basic_mcq: { Args: never; Returns: number }
      kick_http_get: { Args: { u: string }; Returns: number }
      linked_accounts_record_switch_attempt: {
        Args: { p_link_id: string; p_success: boolean }
        Returns: {
          created_at: string
          failed_attempts: number
          id: string
          last_switched_at: string | null
          linked_full_name: string | null
          linked_masked_email: string
          linked_profile_id: string
          linked_role: Database["public"]["Enums"]["user_role"]
          locked_until: string | null
          owner_full_name: string | null
          owner_masked_email: string
          owner_profile_id: string
          owner_role: Database["public"]["Enums"]["user_role"]
        }
        SetofOptions: {
          from: "*"
          to: "linked_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      queue_chem_key_probe: { Args: never; Returns: number }
      queue_chem_parser_test: { Args: never; Returns: number }
      queue_chem_pdf_test: { Args: never; Returns: number }
      queue_chem_qbank_import: { Args: { p_part: string }; Returns: number }
      queue_extract_chem_qbank: { Args: { p_part: string }; Returns: number }
      queue_g11_chemistry_verification: {
        Args: { p_part: string }
        Returns: number
      }
      queue_one_chem_pdf_import: { Args: { p_part: string }; Returns: number }
      queue_stage_one_chem_pdf: { Args: { p_part: string }; Returns: number }
      quran_is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      quran_is_group_teacher: { Args: { p_group_id: string }; Returns: boolean }
      quran_is_platform_admin: { Args: never; Returns: boolean }
      quran_is_teacher_of: { Args: { p_teacher_id: string }; Returns: boolean }
      refresh_subject_counts: { Args: never; Returns: undefined }
      run_debug_halogen: { Args: never; Returns: number }
      run_g12_qbank_finalizer: { Args: never; Returns: number }
      run_g12_sections: { Args: never; Returns: number[] }
      run_g12_source_bundle: { Args: never; Returns: number }
      run_halogen_mcq: { Args: never; Returns: number }
      run_halogen_tail: { Args: never; Returns: number }
      school_can_view_student: {
        Args: { p_organization_id: string; p_student_id: string }
        Returns: boolean
      }
      school_enabled_modules: {
        Args: { p_organization_id: string }
        Returns: string[]
      }
      school_has_role: {
        Args: { p_organization_id: string; p_roles: string[] }
        Returns: boolean
      }
      school_is_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      school_is_platform_admin: { Args: never; Returns: boolean }
      school_teacher_can_manage_section: {
        Args: { p_organization_id: string; p_section_id: string }
        Returns: boolean
      }
      school_teacher_can_manage_student: {
        Args: { p_organization_id: string; p_student_id: string }
        Returns: boolean
      }
      school_update_organization_logo: {
        Args: { p_logo_url: string; p_organization_id: string }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "school_organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      school_update_organization_profile: {
        Args: {
          p_address: string
          p_currency: string
          p_email: string
          p_name: string
          p_organization_id: string
          p_phone: string
          p_timezone: string
        }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "school_organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      school_update_principal_signature: {
        Args: {
          p_organization_id: string
          p_principal_name: string
          p_signature_url: string
        }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_type: string
          phone: string | null
          principal_name: string | null
          principal_signature_url: string | null
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "school_organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_resource_source_chunks: {
        Args: {
          p_limit?: number
          p_query: string
          p_resource_id: string
          p_resource_kind: string
        }
        Returns: {
          chunk_index: number
          heading: string
          id: string
          metadata: Json
          page_number: number
          rank: number
          text: string
        }[]
      }
      search_subject_questions: {
        Args: {
          p_chapter_id?: string
          p_limit?: number
          p_query?: string
          p_subject_id: string
        }
        Returns: {
          chapter_id: string
          correct_answer: Json
          difficulty: string
          explanation: string
          id: string
          marks: number
          options: Json
          question_type: string
          similarity: number
          text: string
        }[]
      }
      search_subject_resource_chunks: {
        Args: {
          p_chapter_id?: string
          p_limit?: number
          p_query?: string
          p_subject_id: string
        }
        Returns: {
          chunk_index: number
          heading: string
          page_number: number
          rank: number
          resource_id: string
          resource_kind: string
          resource_title: string
          text: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      temp_run_drive_id_test: { Args: never; Returns: number }
      temp_run_pdf_text_v3: { Args: never; Returns: number }
      temp_run_pdf_text_v4: { Args: never; Returns: number }
      temp_run_test_pdf_parse: { Args: never; Returns: number }
      text_to_bytea: { Args: { data: string }; Returns: string }
      update_streak: { Args: { p_user_id: string }; Returns: undefined }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      board_type:
        | "FBISE"
        | "BISE_LHR"
        | "BISE_KHI"
        | "BISE_RWP"
        | "BISE_FSD"
        | "AKU"
        | "OTHER"
        | "CBSE"
        | "ICSE"
        | "STATE_BOARD_IN"
      competition_scope: "global" | "school" | "college"
      competition_type: "daily" | "class_vs_class" | "school_vs_school"
      difficulty_level: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
      grade_level:
        | "GRADE_9"
        | "GRADE_10"
        | "GRADE_11"
        | "GRADE_12"
        | "O_LEVEL"
        | "A_LEVEL"
      league_tier: "bronze" | "silver" | "gold" | "platinum"
      notification_type:
        | "ACHIEVEMENT"
        | "STREAK"
        | "REMINDER"
        | "SYSTEM"
        | "SOCIAL"
      paper_type: "ANNUAL" | "SUPPLEMENTARY" | "MODEL"
      question_type: "MCQ" | "SHORT" | "LONG" | "FILL_BLANK" | "TRUE_FALSE"
      quiz_mode: "PRACTICE" | "TEST" | "REVIEW" | "EXAM"
      session_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED"
      session_type: "READING" | "QUIZ" | "FLASHCARD" | "AI_CHAT" | "PAST_PAPER"
      subscription_tier: "FREE" | "PRO" | "ELITE"
      user_role: "student" | "teacher" | "principal" | "admin" | "parent"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      board_type: [
        "FBISE",
        "BISE_LHR",
        "BISE_KHI",
        "BISE_RWP",
        "BISE_FSD",
        "AKU",
        "OTHER",
        "CBSE",
        "ICSE",
        "STATE_BOARD_IN",
      ],
      competition_scope: ["global", "school", "college"],
      competition_type: ["daily", "class_vs_class", "school_vs_school"],
      difficulty_level: ["EASY", "MEDIUM", "HARD", "EXPERT"],
      grade_level: [
        "GRADE_9",
        "GRADE_10",
        "GRADE_11",
        "GRADE_12",
        "O_LEVEL",
        "A_LEVEL",
      ],
      league_tier: ["bronze", "silver", "gold", "platinum"],
      notification_type: [
        "ACHIEVEMENT",
        "STREAK",
        "REMINDER",
        "SYSTEM",
        "SOCIAL",
      ],
      paper_type: ["ANNUAL", "SUPPLEMENTARY", "MODEL"],
      question_type: ["MCQ", "SHORT", "LONG", "FILL_BLANK", "TRUE_FALSE"],
      quiz_mode: ["PRACTICE", "TEST", "REVIEW", "EXAM"],
      session_status: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"],
      session_type: ["READING", "QUIZ", "FLASHCARD", "AI_CHAT", "PAST_PAPER"],
      subscription_tier: ["FREE", "PRO", "ELITE"],
      user_role: ["student", "teacher", "principal", "admin", "parent"],
    },
  },
} as const
