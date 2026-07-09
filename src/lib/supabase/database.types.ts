export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; email: string; full_name: string;
          avatar_url: string | null; board: Database['public']['Enums']['board_type'] | null; grade_level: Database['public']['Enums']['grade_level'] | null;
          onboarding_completed: boolean;
          subjects: string[] | null; phone: string | null; bio: string | null;
          location: string | null; subscription_tier: Database['public']['Enums']['subscription_tier']; subscription_expires_at: string | null;
          xp: number; level: number; streak: number;
          last_active_date: string | null; total_study_time: number; is_email_verified: boolean;
          is_profile_complete: boolean; onboarding_step: number; role: Database['public']['Enums']['user_role'];
          is_ai_operated: boolean; ai_persona_provider: string | null; ai_persona_tier: string | null;
          ai_onboarding_complete: boolean; target_marks_percentage: number | null;
          total_marks_percentage: number | null; previous_roll_number: string | null;
          optional_subject_ids: string[];
          education_level: 'school' | 'college' | 'university';
          university_program: string | null;
          university_semester: string | null;
          university_courses: string[];
          university_exam_target_date: string | null;
          preferred_output_style: 'simple' | 'academic' | 'professional' | 'detailed';
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'ai_onboarding_complete' | 'ai_persona_provider' | 'ai_persona_tier' | 'avatar_url' | 'bio' | 'board' | 'created_at' | 'education_level' | 'grade_level' | 'is_ai_operated' | 'is_email_verified' | 'is_profile_complete' | 'last_active_date' | 'level' | 'location' | 'onboarding_completed' | 'onboarding_step' | 'optional_subject_ids' | 'phone' | 'preferred_output_style' | 'previous_roll_number' | 'role' | 'streak' | 'subjects' | 'subscription_expires_at' | 'subscription_tier' | 'target_marks_percentage' | 'total_marks_percentage' | 'total_study_time' | 'university_courses' | 'university_exam_target_date' | 'university_program' | 'university_semester' | 'updated_at' | 'xp'> & { ai_onboarding_complete?: boolean; ai_persona_provider?: string | null; ai_persona_tier?: string | null; avatar_url?: string | null; bio?: string | null; board?: Database['public']['Enums']['board_type'] | null; created_at?: string; education_level?: 'school' | 'college' | 'university'; grade_level?: Database['public']['Enums']['grade_level'] | null; is_ai_operated?: boolean; is_email_verified?: boolean; is_profile_complete?: boolean; last_active_date?: string | null; level?: number; location?: string | null; onboarding_completed?: boolean; onboarding_step?: number; optional_subject_ids?: string[]; phone?: string | null; preferred_output_style?: 'simple' | 'academic' | 'professional' | 'detailed'; previous_roll_number?: string | null; role?: Database['public']['Enums']['user_role']; streak?: number; subjects?: string[] | null; subscription_expires_at?: string | null; subscription_tier?: Database['public']['Enums']['subscription_tier']; target_marks_percentage?: number | null; total_marks_percentage?: number | null; total_study_time?: number; university_courses?: string[]; university_exam_target_date?: string | null; university_program?: string | null; university_semester?: string | null; updated_at?: string; xp?: number; };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string; name: string; slug: string;
          code: string; description: string | null; icon_url: string | null;
          color: string; boards: string[]; grade_levels: string[];
          is_active: boolean; total_chapters: number; total_questions: number;
          is_optional: boolean; stream: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'boards' | 'color' | 'created_at' | 'description' | 'grade_levels' | 'icon_url' | 'id' | 'is_active' | 'is_optional' | 'stream' | 'total_chapters' | 'total_questions'> & { boards?: string[]; color?: string; created_at?: string; description?: string | null; grade_levels?: string[]; icon_url?: string | null; id?: string; is_active?: boolean; is_optional?: boolean; stream?: string | null; total_chapters?: number; total_questions?: number; };
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string; subject_id: string; name: string;
          slug: string; description: string | null; order_index: number;
          is_active: boolean; total_topics: number; total_questions: number;
          boards: string[]; grade_levels: string[]; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chapters']['Row'], 'boards' | 'created_at' | 'description' | 'grade_levels' | 'id' | 'is_active' | 'order_index' | 'total_questions' | 'total_topics'> & { boards?: string[]; created_at?: string; description?: string | null; grade_levels?: string[]; id?: string; is_active?: boolean; order_index?: number; total_questions?: number; total_topics?: number; };
        Update: Partial<Database['public']['Tables']['chapters']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'chapters_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      topics: {
        Row: {
          id: string; chapter_id: string; name: string;
          slug: string; content: string | null; video_url: string | null;
          order_index: number; is_active: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'content' | 'created_at' | 'id' | 'is_active' | 'order_index' | 'video_url'> & { content?: string | null; created_at?: string; id?: string; is_active?: boolean; order_index?: number; video_url?: string | null; };
        Update: Partial<Database['public']['Tables']['topics']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'topics_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          id: string; topic_id: string | null; chapter_id: string;
          subject_id: string; type: string; difficulty: string;
          text: string; options: Json | null; correct_answer: Json;
          explanation: string | null; marks: number; year: number | null;
          board: string | null; tags: string[] | null; is_verified: boolean;
          times_attempted: number; correct_rate: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'board' | 'correct_rate' | 'created_at' | 'difficulty' | 'explanation' | 'id' | 'is_verified' | 'marks' | 'options' | 'tags' | 'times_attempted' | 'topic_id' | 'type' | 'year'> & { board?: string | null; correct_rate?: number; created_at?: string; difficulty?: string; explanation?: string | null; id?: string; is_verified?: boolean; marks?: number; options?: Json | null; tags?: string[] | null; times_attempted?: number; topic_id?: string | null; type?: string; year?: number | null; };
        Update: Partial<Database['public']['Tables']['questions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'questions_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_sessions: {
        Row: {
          id: string; user_id: string; subject_id: string;
          chapter_ids: string[] | null; questions: Json[]; current_index: number;
          answers: Json; started_at: string; completed_at: string | null;
          time_limit: number | null; time_spent: number; status: string;
          score: number | null; total_marks: number; correct_count: number;
          incorrect_count: number; skipped_count: number; mode: string;
        };
        Insert: Omit<Database['public']['Tables']['quiz_sessions']['Row'], 'answers' | 'chapter_ids' | 'completed_at' | 'correct_count' | 'current_index' | 'id' | 'incorrect_count' | 'mode' | 'questions' | 'score' | 'skipped_count' | 'started_at' | 'status' | 'time_limit' | 'time_spent' | 'total_marks'> & { answers?: Json; chapter_ids?: string[] | null; completed_at?: string | null; correct_count?: number; current_index?: number; id?: string; incorrect_count?: number; mode?: string; questions?: Json[]; score?: number | null; skipped_count?: number; started_at?: string; status?: string; time_limit?: number | null; time_spent?: number; total_marks?: number; };
        Update: Partial<Database['public']['Tables']['quiz_sessions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'quiz_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_sessions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          id: string; user_id: string; title: string;
          subject_id: string | null; messages: Json; created_at: string;
          updated_at: string; total_messages: number; provider: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'created_at' | 'id' | 'messages' | 'provider' | 'subject_id' | 'title' | 'total_messages' | 'updated_at'> & { created_at?: string; id?: string; messages?: Json; provider?: string; subject_id?: string | null; title?: string; total_messages?: number; updated_at?: string; };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'conversations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      flashcard_decks: {
        Row: {
          id: string; user_id: string; name: string;
          description: string | null; subject_id: string | null; chapter_id: string | null;
          cover_color: string; cover_icon: string; is_public: boolean; total_cards: number;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flashcard_decks']['Row'], 'chapter_id' | 'cover_color' | 'cover_icon' | 'created_at' | 'description' | 'id' | 'is_public' | 'subject_id' | 'total_cards' | 'updated_at'> & { chapter_id?: string | null; cover_color?: string; cover_icon?: string; created_at?: string; description?: string | null; id?: string; is_public?: boolean; subject_id?: string | null; total_cards?: number; updated_at?: string; };
        Update: Partial<Database['public']['Tables']['flashcard_decks']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'flashcard_decks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'flashcard_decks_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'flashcard_decks_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
      };
      flashcards: {
        Row: {
          id: string; user_id: string; deck_id: string;
          front: string; back: string; hint: string | null;
          tags: string[] | null; difficulty: string; next_review_at: string;
          interval: number; ease_factor: number; repetitions: number;
          is_starred: boolean; last_rating: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flashcards']['Row'], 'created_at' | 'difficulty' | 'ease_factor' | 'hint' | 'id' | 'interval' | 'is_starred' | 'last_rating' | 'next_review_at' | 'repetitions' | 'tags'> & { created_at?: string; difficulty?: string; ease_factor?: number; hint?: string | null; id?: string; interval?: number; is_starred?: boolean; last_rating?: string | null; next_review_at?: string; repetitions?: number; tags?: string[] | null; };
        Update: Partial<Database['public']['Tables']['flashcards']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'flashcards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'flashcards_deck_id_fkey';
            columns: ['deck_id'];
            isOneToOne: false;
            referencedRelation: 'flashcard_decks';
            referencedColumns: ['id'];
          },
        ];
      };
      study_sessions: {
        Row: {
          id: string; user_id: string; subject_id: string | null;
          type: string; duration: number; xp_earned: number;
          date: string; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_sessions']['Row'], 'created_at' | 'date' | 'duration' | 'id' | 'subject_id' | 'xp_earned'> & { created_at?: string; date?: string; duration?: number; id?: string; subject_id?: string | null; xp_earned?: number; };
        Update: Partial<Database['public']['Tables']['study_sessions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'study_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_sessions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          id: string; user_id: string; title: string;
          content: string; subject_id: string | null; chapter_id: string | null;
          tags: string[] | null; folder: string | null; is_starred: boolean; is_public: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'chapter_id' | 'content' | 'created_at' | 'folder' | 'id' | 'is_public' | 'is_starred' | 'subject_id' | 'tags' | 'title' | 'updated_at'> & { chapter_id?: string | null; content?: string; created_at?: string; folder?: string | null; id?: string; is_public?: boolean; is_starred?: boolean; subject_id?: string | null; tags?: string[] | null; title?: string; updated_at?: string; };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notes_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
      };
      achievements: {
        Row: {
          id: string; name: string; description: string;
          icon_url: string; xp_reward: number; condition_type: string;
          condition_value: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'condition_value' | 'created_at' | 'icon_url' | 'id' | 'xp_reward'> & { condition_value?: number; created_at?: string; icon_url?: string; id?: string; xp_reward?: number; };
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>;
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string; user_id: string; achievement_id: string;
          earned_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_achievements']['Row'], 'earned_at' | 'id'> & { earned_at?: string; id?: string; };
        Update: Partial<Database['public']['Tables']['user_achievements']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string; user_id: string; stripe_subscription_id: string | null;
          stripe_customer_id: string | null; tier: string; status: string;
          current_period_start: string; current_period_end: string; cancel_at_period_end: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'cancel_at_period_end' | 'created_at' | 'current_period_end' | 'current_period_start' | 'id' | 'status' | 'stripe_customer_id' | 'stripe_subscription_id' | 'tier' | 'updated_at'> & { cancel_at_period_end?: boolean; created_at?: string; current_period_end?: string; current_period_start?: string; id?: string; status?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; tier?: string; updated_at?: string; };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string; user_id: string; type: string;
          title: string; message: string; icon_url: string | null;
          link: string | null; is_read: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'created_at' | 'icon_url' | 'id' | 'is_read' | 'link'> & { created_at?: string; icon_url?: string | null; id?: string; is_read?: boolean; link?: string | null; };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      past_papers: {
        Row: {
          id: string; subject_id: string; board: string;
          year: number; paper_type: Database['public']['Enums']['paper_type']; file_url: string;
          thumbnail_url: string | null; total_questions: number; duration: number;
          is_verified: boolean; download_count: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['past_papers']['Row'], 'created_at' | 'download_count' | 'duration' | 'id' | 'is_verified' | 'paper_type' | 'thumbnail_url' | 'total_questions'> & { created_at?: string; download_count?: number; duration?: number; id?: string; is_verified?: boolean; paper_type?: Database['public']['Enums']['paper_type']; thumbnail_url?: string | null; total_questions?: number; };
        Update: Partial<Database['public']['Tables']['past_papers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'past_papers_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      doubts: {
        Row: {
          id: string; student_id: string; subject_id: string | null;
          title: string; body: string; image_url: string | null;
          is_resolved: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doubts']['Row'], 'created_at' | 'id' | 'image_url' | 'is_resolved' | 'subject_id'> & { created_at?: string; id?: string; image_url?: string | null; is_resolved?: boolean; subject_id?: string | null; };
        Update: Partial<Database['public']['Tables']['doubts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'doubts_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'doubts_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      doubt_replies: {
        Row: {
          id: string; doubt_id: string; teacher_id: string;
          body: string; is_accepted: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doubt_replies']['Row'], 'created_at' | 'id' | 'is_accepted'> & { created_at?: string; id?: string; is_accepted?: boolean; };
        Update: Partial<Database['public']['Tables']['doubt_replies']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'doubt_replies_doubt_id_fkey';
            columns: ['doubt_id'];
            isOneToOne: false;
            referencedRelation: 'doubts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'doubt_replies_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lectures: {
        Row: {
          id: string; chapter_id: string; topic_id: string | null;
          title: string; youtube_url: string; thumbnail_url: string | null;
          duration_seconds: number | null; kind: 'lecture' | 'exercise_walkthrough'; exercise_number: string | null;
          order_index: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lectures']['Row'], 'created_at' | 'duration_seconds' | 'exercise_number' | 'id' | 'kind' | 'order_index' | 'thumbnail_url' | 'topic_id'> & { created_at?: string; duration_seconds?: number | null; exercise_number?: string | null; id?: string; kind?: 'lecture' | 'exercise_walkthrough'; order_index?: number; thumbnail_url?: string | null; topic_id?: string | null; };
        Update: Partial<Database['public']['Tables']['lectures']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'lectures_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lectures_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      library_resources: {
        Row: {
          id: string; title: string; description: string | null;
          category: 'local' | 'international'; subject_id: string | null; board: Database['public']['Enums']['board_type'] | null;
          grade_level: Database['public']['Enums']['grade_level'] | null; drive_url: string; drive_file_id: string | null;
          thumbnail_url: string | null; file_type: 'pdf' | 'docx' | 'pptx' | 'other'; added_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['library_resources']['Row'], 'added_by' | 'board' | 'category' | 'created_at' | 'description' | 'drive_file_id' | 'file_type' | 'grade_level' | 'id' | 'subject_id' | 'thumbnail_url'> & { added_by?: string | null; board?: Database['public']['Enums']['board_type'] | null; category?: 'local' | 'international'; created_at?: string; description?: string | null; drive_file_id?: string | null; file_type?: 'pdf' | 'docx' | 'pptx' | 'other'; grade_level?: Database['public']['Enums']['grade_level'] | null; id?: string; subject_id?: string | null; thumbnail_url?: string | null; };
        Update: Partial<Database['public']['Tables']['library_resources']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'library_resources_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'library_resources_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      study_routines: {
        Row: {
          id: string; user_id: string; preferences: Json;
          schedule: Json; generated_by_provider: string | null; created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_routines']['Row'], 'created_at' | 'generated_by_provider' | 'id' | 'preferences' | 'schedule' | 'updated_at'> & { created_at?: string; generated_by_provider?: string | null; id?: string; preferences?: Json; schedule?: Json; updated_at?: string; };
        Update: Partial<Database['public']['Tables']['study_routines']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'study_routines_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      parent_student_links: {
        Row: {
          id: string; parent_id: string; student_id: string;
          status: string; invite_code: string | null; linked_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['parent_student_links']['Row'], 'created_at' | 'id' | 'invite_code' | 'linked_at' | 'status'> & { created_at?: string; id?: string; invite_code?: string | null; linked_at?: string | null; status?: string; };
        Update: Partial<Database['public']['Tables']['parent_student_links']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'parent_student_links_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parent_student_links_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      parent_messages: {
        Row: {
          id: string; link_id: string; sender_id: string;
          content: string; created_at: string; read_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['parent_messages']['Row'], 'created_at' | 'id' | 'read_at'> & { created_at?: string; id?: string; read_at?: string | null; };
        Update: Partial<Database['public']['Tables']['parent_messages']['Insert']>;
        Relationships: [];
      };
      parent_attachments: {
        Row: {
          id: string; link_id: string; sender_id: string;
          file_url: string; file_name: string; file_type: string;
          file_size_kb: number; caption: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['parent_attachments']['Row'], 'caption' | 'created_at' | 'id'> & { caption?: string | null; created_at?: string; id?: string; };
        Update: Partial<Database['public']['Tables']['parent_attachments']['Insert']>;
        Relationships: [];
      };
      routine_tests: {
        Row: {
          id: string; student_id: string; subject: string; title: string;
          scheduled_at: string; status: string; score: number | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['routine_tests']['Row'], 'created_at' | 'id' | 'score' | 'status'> & { created_at?: string; id?: string; score?: number | null; status?: string; };
        Update: Partial<Database['public']['Tables']['routine_tests']['Insert']>;
        Relationships: [];
      };
      previous_marks: {
        Row: {
          id: string; student_id: string; subject_id: string;
          marks_obtained: number; marks_total: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['previous_marks']['Row'], 'created_at' | 'id' | 'marks_total'> & { created_at?: string; id?: string; marks_total?: number; };
        Update: Partial<Database['public']['Tables']['previous_marks']['Insert']>;
        Relationships: [];
      };
      paper_checks: {
        Row: {
          id: string; student_id: string; subject_id: string | null;
          input_type: string; question_text: string | null; answer_text: string | null;
          image_url: string | null; marks_obtained: number; marks_total: number;
          missing_elements: Json; feedback: string; provider: string; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['paper_checks']['Row'], 'answer_text' | 'created_at' | 'id' | 'image_url' | 'input_type' | 'missing_elements' | 'provider' | 'question_text' | 'subject_id'> & { answer_text?: string | null; created_at?: string; id?: string; image_url?: string | null; input_type?: string; missing_elements?: Json; provider?: string; question_text?: string | null; subject_id?: string | null; };
        Update: Partial<Database['public']['Tables']['paper_checks']['Insert']>;
        Relationships: [];
      };
      ai_answer_feedback: {
        Row: {
          id: string; user_id: string; source_type: string; source_id: string;
          is_helpful: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_answer_feedback']['Row'], 'created_at'> & { created_at?: string; };
        Update: Partial<Database['public']['Tables']['ai_answer_feedback']['Insert']>;
        Relationships: [];
      };
      student_weekly_snapshots: {
        Row: {
          id: string; student_id: string; week_start: string;
          xp_earned: number; quizzes_completed: number; average_score: number;
          study_minutes: number; streak_days: number; subjects_studied: string[] | null;
          ai_messages_sent: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['student_weekly_snapshots']['Row'], 'ai_messages_sent' | 'average_score' | 'created_at' | 'id' | 'quizzes_completed' | 'streak_days' | 'study_minutes' | 'subjects_studied' | 'xp_earned'> & { ai_messages_sent?: number; average_score?: number; created_at?: string; id?: string; quizzes_completed?: number; streak_days?: number; study_minutes?: number; subjects_studied?: string[] | null; xp_earned?: number; };
        Update: Partial<Database['public']['Tables']['student_weekly_snapshots']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'student_weekly_snapshots_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_leaderboard: { Args: { p_limit?: number; p_offset?: number }; Returns: Json; };
      calculate_next_review: { Args: { p_quality: number; p_interval: number; p_ease_factor: number }; Returns: Json; };
      refresh_subject_counts: { Args: Record<PropertyKey, never>; Returns: undefined; };
    };
    Enums: {
      board_type: 'FBISE' | 'BISE_LHR' | 'BISE_KHI' | 'BISE_RWP' | 'BISE_FSD' | 'AKU' | 'CBSE' | 'ICSE' | 'STATE_BOARD_IN' | 'OTHER';
      grade_level: 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12' | 'O_LEVEL' | 'A_LEVEL';
      subscription_tier: 'FREE' | 'PRO' | 'ELITE';
      question_type: 'MCQ' | 'SHORT' | 'LONG' | 'FILL_BLANK' | 'TRUE_FALSE';
      difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
      session_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
      quiz_mode: 'PRACTICE' | 'TEST' | 'REVIEW' | 'EXAM';
      session_type: 'READING' | 'QUIZ' | 'FLASHCARD' | 'AI_CHAT' | 'PAST_PAPER';
      notification_type: 'ACHIEVEMENT' | 'STREAK' | 'REMINDER' | 'SYSTEM' | 'SOCIAL';
      paper_type: 'ANNUAL' | 'SUPPLEMENTARY' | 'MODEL';
      user_role: 'student' | 'parent' | 'teacher' | 'admin';
    };
    CompositeTypes: { [_ in never]: never };
  };
}
