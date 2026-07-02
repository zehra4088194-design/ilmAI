export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; email: string; full_name: string; avatar_url: string | null;
          board: string | null; grade_level: string | null; subjects: string[] | null;
          subscription_tier: string; subscription_expires_at: string | null;
          xp: number; level: number; streak: number; total_study_time: number;
          is_email_verified: boolean; is_profile_complete: boolean; onboarding_step: number;
          role: string; is_ai_operated: boolean; ai_persona_provider: string | null; ai_persona_tier: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      subjects: {
        Row: {
          id: string; name: string; slug: string; code: string; description: string | null;
          icon_url: string | null; color: string; boards: string[]; grade_levels: string[];
          is_active: boolean; total_chapters: number; total_questions: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
      };
      chapters: {
        Row: {
          id: string; subject_id: string; name: string; slug: string; description: string | null;
          order_index: number; is_active: boolean; total_topics: number; total_questions: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chapters']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['chapters']['Insert']>;
      };
      questions: {
        Row: {
          id: string; topic_id: string | null; chapter_id: string; subject_id: string;
          type: string; difficulty: string; text: string; options: Json | null;
          correct_answer: Json; explanation: string | null; marks: number;
          year: number | null; board: string | null; tags: string[] | null;
          is_verified: boolean; times_attempted: number; correct_rate: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['questions']['Insert']>;
      };
      quiz_sessions: {
        Row: {
          id: string; user_id: string; subject_id: string; chapter_ids: string[] | null;
          questions: Json; current_index: number; answers: Json; started_at: string;
          completed_at: string | null; time_limit: number | null; time_spent: number;
          status: string; score: number | null; total_marks: number;
          correct_count: number; incorrect_count: number; skipped_count: number; mode: string;
        };
        Insert: Omit<Database['public']['Tables']['quiz_sessions']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['quiz_sessions']['Insert']>;
      };
      conversations: {
        Row: {
          id: string; user_id: string; title: string; subject_id: string | null;
          messages: Json; created_at: string; updated_at: string;
          total_messages: number; provider: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      flashcard_decks: {
        Row: {
          id: string; user_id: string; name: string; description: string | null;
          subject_id: string | null; chapter_id: string | null; cover_color: string;
          is_public: boolean; total_cards: number; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flashcard_decks']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['flashcard_decks']['Insert']>;
      };
      flashcards: {
        Row: {
          id: string; user_id: string; deck_id: string; front: string; back: string;
          hint: string | null; tags: string[] | null; difficulty: string;
          next_review_at: string; interval: number; ease_factor: number;
          repetitions: number; is_starred: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flashcards']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['flashcards']['Insert']>;
      };
      study_sessions: {
        Row: {
          id: string; user_id: string; subject_id: string; type: string;
          duration: number; xp_earned: number; date: string; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_sessions']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['study_sessions']['Insert']>;
      };
      notes: {
        Row: {
          id: string; user_id: string; title: string; content: string;
          subject_id: string | null; chapter_id: string | null; tags: string[] | null;
          is_starred: boolean; is_public: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
      };
      achievements: {
        Row: {
          id: string; name: string; description: string; icon_url: string;
          xp_reward: number; condition_type: string; condition_value: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>;
      };
      user_achievements: {
        Row: { id: string; user_id: string; achievement_id: string; earned_at: string; };
        Insert: Omit<Database['public']['Tables']['user_achievements']['Row'], 'id' | 'earned_at'> & { id?: string; earned_at?: string };
        Update: Partial<Database['public']['Tables']['user_achievements']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string; user_id: string; stripe_subscription_id: string | null;
          stripe_customer_id: string | null; tier: string; status: string;
          current_period_start: string; current_period_end: string;
          cancel_at_period_end: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
      notifications: {
        Row: {
          id: string; user_id: string; type: string; title: string;
          message: string; icon_url: string | null; link: string | null;
          is_read: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      doubts: {
        Row: {
          id: string; student_id: string; subject_id: string | null; title: string;
          body: string; image_url: string | null; is_resolved: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doubts']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['doubts']['Insert']>;
      };
      doubt_replies: {
        Row: {
          id: string; doubt_id: string; teacher_id: string; body: string;
          is_accepted: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doubt_replies']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['doubt_replies']['Insert']>;
      };
      lectures: {
        Row: {
          id: string; chapter_id: string; topic_id: string | null; title: string;
          youtube_url: string; thumbnail_url: string | null; duration_seconds: number | null;
          kind: string; exercise_number: string | null; order_index: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lectures']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['lectures']['Insert']>;
      };
      library_resources: {
        Row: {
          id: string; title: string; description: string | null; category: string;
          subject_id: string | null; board: string | null; grade_level: string | null;
          drive_url: string; drive_file_id: string | null; thumbnail_url: string | null;
          file_type: string; added_by: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['library_resources']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['library_resources']['Insert']>;
      };
      study_routines: {
        Row: {
          id: string; user_id: string; preferences: Json; schedule: Json;
          generated_by_provider: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_routines']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['study_routines']['Insert']>;
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_leaderboard: { Args: { p_limit?: number; p_offset?: number }; Returns: Json; };
      calculate_next_review: { Args: { p_quality: number; p_interval: number; p_ease_factor: number }; Returns: Json; };
    };
    Enums: {
      board_type: 'FBISE' | 'BISE_LHR' | 'BISE_KHI' | 'BISE_RWP' | 'BISE_FSD' | 'AKU' | 'OTHER';
      grade_level: 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12' | 'O_LEVEL' | 'A_LEVEL';
      subscription_tier: 'FREE' | 'PRO' | 'ELITE';
      question_type: 'MCQ' | 'SHORT' | 'LONG' | 'FILL_BLANK' | 'TRUE_FALSE';
      difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
      session_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    };
  };
}
