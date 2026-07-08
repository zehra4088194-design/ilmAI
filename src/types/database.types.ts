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
      doubt_replies: {
        Row: {
          body: string
          created_at: string
          doubt_id: string
          id: string
          is_accepted: boolean
          teacher_id: string
        }
        Insert: {
          body: string
          created_at?: string
          doubt_id: string
          id?: string
          is_accepted?: boolean
          teacher_id: string
        }
        Update: {
          body?: string
          created_at?: string
          doubt_id?: string
          id?: string
          is_accepted?: boolean
          teacher_id?: string
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
      lectures: {
        Row: {
          chapter_id: string
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
          category: string
          created_at: string
          description: string | null
          drive_file_id: string | null
          drive_url: string
          file_type: string | null
          grade_level: Database["public"]["Enums"]["grade_level"] | null
          id: string
          subject_id: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          added_by?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          category?: string
          created_at?: string
          description?: string | null
          drive_file_id?: string | null
          drive_url: string
          file_type?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          subject_id?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          added_by?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          category?: string
          created_at?: string
          description?: string | null
          drive_file_id?: string | null
          drive_url?: string
          file_type?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
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
            foreignKeyName: "library_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
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
          linked_at: string | null
          parent_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          linked_at?: string | null
          parent_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          linked_at?: string | null
          parent_id?: string
          status?: string
          student_id?: string
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
      past_papers: {
        Row: {
          board: Database["public"]["Enums"]["board_type"]
          created_at: string
          download_count: number
          duration: number
          file_url: string
          id: string
          is_verified: boolean
          paper_type: Database["public"]["Enums"]["paper_type"]
          subject_id: string
          thumbnail_url: string | null
          total_questions: number
          year: number
        }
        Insert: {
          board: Database["public"]["Enums"]["board_type"]
          created_at?: string
          download_count?: number
          duration?: number
          file_url: string
          id?: string
          is_verified?: boolean
          paper_type?: Database["public"]["Enums"]["paper_type"]
          subject_id: string
          thumbnail_url?: string | null
          total_questions?: number
          year: number
        }
        Update: {
          board?: Database["public"]["Enums"]["board_type"]
          created_at?: string
          download_count?: number
          duration?: number
          file_url?: string
          id?: string
          is_verified?: boolean
          paper_type?: Database["public"]["Enums"]["paper_type"]
          subject_id?: string
          thumbnail_url?: string | null
          total_questions?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "past_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          ai_onboarding_complete: boolean
          ai_persona_provider: string | null
          ai_persona_tier: string | null
          avatar_url: string | null
          bio: string | null
          board: Database["public"]["Enums"]["board_type"] | null
          class: string | null
          created_at: string
          email: string
          full_name: string
          grade_level: Database["public"]["Enums"]["grade_level"] | null
          id: string
          is_ai_operated: boolean
          is_email_verified: boolean
          is_profile_complete: boolean
          last_active_date: string | null
          level: number
          location: string | null
          onboarding_step: number
          optional_subject_ids: string[]
          parent_link_code: string | null
          phone: string | null
          previous_roll_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          streak: number
          subjects: string[] | null
          subscription_expires_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          target_marks_percentage: number | null
          total_marks_percentage: number | null
          total_study_time: number
          updated_at: string
          xp: number
        }
        Insert: {
          ai_onboarding_complete?: boolean
          ai_persona_provider?: string | null
          ai_persona_tier?: string | null
          avatar_url?: string | null
          bio?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          class?: string | null
          created_at?: string
          email: string
          full_name: string
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id: string
          is_ai_operated?: boolean
          is_email_verified?: boolean
          is_profile_complete?: boolean
          last_active_date?: string | null
          level?: number
          location?: string | null
          onboarding_step?: number
          optional_subject_ids?: string[]
          parent_link_code?: string | null
          phone?: string | null
          previous_roll_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          streak?: number
          subjects?: string[] | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          target_marks_percentage?: number | null
          total_marks_percentage?: number | null
          total_study_time?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          ai_onboarding_complete?: boolean
          ai_persona_provider?: string | null
          ai_persona_tier?: string | null
          avatar_url?: string | null
          bio?: string | null
          board?: Database["public"]["Enums"]["board_type"] | null
          class?: string | null
          created_at?: string
          email?: string
          full_name?: string
          grade_level?: Database["public"]["Enums"]["grade_level"] | null
          id?: string
          is_ai_operated?: boolean
          is_email_verified?: boolean
          is_profile_complete?: boolean
          last_active_date?: string | null
          level?: number
          location?: string | null
          onboarding_step?: number
          optional_subject_ids?: string[]
          parent_link_code?: string | null
          phone?: string | null
          previous_roll_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          streak?: number
          subjects?: string[] | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          target_marks_percentage?: number | null
          total_marks_percentage?: number | null
          total_study_time?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          board: Database["public"]["Enums"]["board_type"] | null
          chapter_id: string
          correct_answer: Json
          correct_rate: number
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          is_verified: boolean
          marks: number
          options: Json | null
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
          correct_answer: Json
          correct_rate?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_verified?: boolean
          marks?: number
          options?: Json | null
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
          correct_answer?: Json
          correct_rate?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_verified?: boolean
          marks?: number
          options?: Json | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      calculate_next_review: {
        Args: { p_ease_factor: number; p_interval: number; p_quality: number }
        Returns: Json
      }
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
      refresh_subject_counts: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_streak: { Args: { p_user_id: string }; Returns: undefined }
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
      difficulty_level: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
      grade_level:
        | "GRADE_9"
        | "GRADE_10"
        | "GRADE_11"
        | "GRADE_12"
        | "O_LEVEL"
        | "A_LEVEL"
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
      user_role: "student" | "teacher" | "admin" | "parent"
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
      difficulty_level: ["EASY", "MEDIUM", "HARD", "EXPERT"],
      grade_level: [
        "GRADE_9",
        "GRADE_10",
        "GRADE_11",
        "GRADE_12",
        "O_LEVEL",
        "A_LEVEL",
      ],
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
      user_role: ["student", "teacher", "admin", "parent"],
    },
  },
} as const
