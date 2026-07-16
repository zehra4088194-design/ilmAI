export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          condition_type: string;
          condition_value: number;
          created_at: string;
          description: string;
          icon_url: string;
          id: string;
          name: string;
          xp_reward: number;
        };
        Insert: {
          condition_type: string;
          condition_value?: number;
          created_at?: string;
          description: string;
          icon_url?: string;
          id?: string;
          name: string;
          xp_reward?: number;
        };
        Update: {
          condition_type?: string;
          condition_value?: number;
          created_at?: string;
          description?: string;
          icon_url?: string;
          id?: string;
          name?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      ai_answer_feedback: {
        Row: {
          created_at: string;
          id: string;
          is_helpful: boolean;
          source_id: string;
          source_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_helpful: boolean;
          source_id: string;
          source_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_helpful?: boolean;
          source_id?: string;
          source_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_answer_feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_insight_cache: {
        Row: {
          content: Json;
          generated_at: string;
          id: string;
          insight_type: string;
          student_id: string;
          valid_until: string;
        };
        Insert: {
          content: Json;
          generated_at?: string;
          id?: string;
          insight_type: string;
          student_id: string;
          valid_until: string;
        };
        Update: {
          content?: Json;
          generated_at?: string;
          id?: string;
          insight_type?: string;
          student_id?: string;
          valid_until?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_insight_cache_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_projects: {
        Row: {
          created_at: string;
          generated_content: Json;
          id: string;
          one_liner: string;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          generated_content: Json;
          id?: string;
          one_liner: string;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          generated_content?: Json;
          id?: string;
          one_liner?: string;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_projects_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      assignment_submissions: {
        Row: {
          ai_feedback: string | null;
          assignment_id: string;
          feedback: string | null;
          graded_at: string | null;
          id: string;
          marks_awarded: number | null;
          student_id: string;
          submission_text: string | null;
          submission_url: string | null;
          submitted_at: string;
        };
        Insert: {
          ai_feedback?: string | null;
          assignment_id: string;
          feedback?: string | null;
          graded_at?: string | null;
          id?: string;
          marks_awarded?: number | null;
          student_id: string;
          submission_text?: string | null;
          submission_url?: string | null;
          submitted_at?: string;
        };
        Update: {
          ai_feedback?: string | null;
          assignment_id?: string;
          feedback?: string | null;
          graded_at?: string | null;
          id?: string;
          marks_awarded?: number | null;
          student_id?: string;
          submission_text?: string | null;
          submission_url?: string | null;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignment_submissions_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'class_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignment_submissions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      avatar_items: {
        Row: {
          coin_price: number;
          id: string;
          is_default: boolean;
          name: string;
          slot: string;
          svg_asset_url: string;
        };
        Insert: {
          coin_price?: number;
          id?: string;
          is_default?: boolean;
          name: string;
          slot: string;
          svg_asset_url: string;
        };
        Update: {
          coin_price?: number;
          id?: string;
          is_default?: boolean;
          name?: string;
          slot?: string;
          svg_asset_url?: string;
        };
        Relationships: [];
      };
      boss_quiz_attempts: {
        Row: {
          boss_quiz_id: string;
          completed_at: string | null;
          id: string;
          quiz_session_id: string | null;
          score: number | null;
          user_id: string;
        };
        Insert: {
          boss_quiz_id: string;
          completed_at?: string | null;
          id?: string;
          quiz_session_id?: string | null;
          score?: number | null;
          user_id: string;
        };
        Update: {
          boss_quiz_id?: string;
          completed_at?: string | null;
          id?: string;
          quiz_session_id?: string | null;
          score?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'boss_quiz_attempts_boss_quiz_id_fkey';
            columns: ['boss_quiz_id'];
            isOneToOne: false;
            referencedRelation: 'boss_quizzes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'boss_quiz_attempts_quiz_session_id_fkey';
            columns: ['quiz_session_id'];
            isOneToOne: false;
            referencedRelation: 'quiz_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'boss_quiz_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      boss_quizzes: {
        Row: {
          coin_reward: number;
          created_at: string;
          id: string;
          quiz_session_template: Json;
          subject_id: string | null;
          week_start_date: string;
          xp_reward: number;
        };
        Insert: {
          coin_reward?: number;
          created_at?: string;
          id?: string;
          quiz_session_template: Json;
          subject_id?: string | null;
          week_start_date: string;
          xp_reward?: number;
        };
        Update: {
          coin_reward?: number;
          created_at?: string;
          id?: string;
          quiz_session_template?: Json;
          subject_id?: string | null;
          week_start_date?: string;
          xp_reward?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'boss_quizzes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      career_profile_inputs: {
        Row: {
          budget_range: string | null;
          id: string;
          interests: string[];
          learning_style_override: string | null;
          long_term_goal: string | null;
          personality_traits: Json;
          preferred_city: string | null;
          preferred_university: string | null;
          student_id: string;
          study_abroad_interest: boolean;
          updated_at: string;
        };
        Insert: {
          budget_range?: string | null;
          id?: string;
          interests?: string[];
          learning_style_override?: string | null;
          long_term_goal?: string | null;
          personality_traits?: Json;
          preferred_city?: string | null;
          preferred_university?: string | null;
          student_id: string;
          study_abroad_interest?: boolean;
          updated_at?: string;
        };
        Update: {
          budget_range?: string | null;
          id?: string;
          interests?: string[];
          learning_style_override?: string | null;
          long_term_goal?: string | null;
          personality_traits?: Json;
          preferred_city?: string | null;
          preferred_university?: string | null;
          student_id?: string;
          study_abroad_interest?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'career_profile_inputs_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      career_recommendations: {
        Row: {
          generated_at: string;
          id: string;
          merit_estimation: Json | null;
          recommended_careers: Json;
          recommended_degrees: Json;
          recommended_universities: Json;
          roadmap: Json;
          scholarships: Json | null;
          student_id: string;
          valid_until: string;
        };
        Insert: {
          generated_at?: string;
          id?: string;
          merit_estimation?: Json | null;
          recommended_careers: Json;
          recommended_degrees: Json;
          recommended_universities: Json;
          roadmap: Json;
          scholarships?: Json | null;
          student_id: string;
          valid_until: string;
        };
        Update: {
          generated_at?: string;
          id?: string;
          merit_estimation?: Json | null;
          recommended_careers?: Json;
          recommended_degrees?: Json;
          recommended_universities?: Json;
          roadmap?: Json;
          scholarships?: Json | null;
          student_id?: string;
          valid_until?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'career_recommendations_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chapters: {
        Row: {
          boards: Database['public']['Enums']['board_type'][];
          created_at: string;
          description: string | null;
          grade_levels: Database['public']['Enums']['grade_level'][];
          id: string;
          is_active: boolean;
          name: string;
          order_index: number;
          slug: string;
          subject_id: string;
          total_questions: number;
          total_topics: number;
        };
        Insert: {
          boards?: Database['public']['Enums']['board_type'][];
          created_at?: string;
          description?: string | null;
          grade_levels?: Database['public']['Enums']['grade_level'][];
          id?: string;
          is_active?: boolean;
          name: string;
          order_index?: number;
          slug: string;
          subject_id: string;
          total_questions?: number;
          total_topics?: number;
        };
        Update: {
          boards?: Database['public']['Enums']['board_type'][];
          created_at?: string;
          description?: string | null;
          grade_levels?: Database['public']['Enums']['grade_level'][];
          id?: string;
          is_active?: boolean;
          name?: string;
          order_index?: number;
          slug?: string;
          subject_id?: string;
          total_questions?: number;
          total_topics?: number;
        };
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
      class_assignments: {
        Row: {
          attachment_url: string | null;
          class_id: string;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          max_marks: number | null;
          title: string;
        };
        Insert: {
          attachment_url?: string | null;
          class_id: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          max_marks?: number | null;
          title: string;
        };
        Update: {
          attachment_url?: string | null;
          class_id?: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          max_marks?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_assignments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_classes';
            referencedColumns: ['id'];
          },
        ];
      };
      class_attendance: {
        Row: {
          class_id: string;
          id: string;
          marked_by: string | null;
          session_date: string;
          status: string;
          student_id: string;
        };
        Insert: {
          class_id: string;
          id?: string;
          marked_by?: string | null;
          session_date: string;
          status: string;
          student_id: string;
        };
        Update: {
          class_id?: string;
          id?: string;
          marked_by?: string | null;
          session_date?: string;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_attendance_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_attendance_marked_by_fkey';
            columns: ['marked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_attendance_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_enrollments: {
        Row: {
          class_id: string;
          enrolled_at: string;
          id: string;
          student_id: string;
        };
        Insert: {
          class_id: string;
          enrolled_at?: string;
          id?: string;
          student_id: string;
        };
        Update: {
          class_id?: string;
          enrolled_at?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_enrollments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_enrollments_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_lectures: {
        Row: {
          chapter_id: string | null;
          class_id: string;
          created_at: string;
          id: string;
          resource_url: string | null;
          title: string;
          video_url: string | null;
        };
        Insert: {
          chapter_id?: string | null;
          class_id: string;
          created_at?: string;
          id?: string;
          resource_url?: string | null;
          title: string;
          video_url?: string | null;
        };
        Update: {
          chapter_id?: string | null;
          class_id?: string;
          created_at?: string;
          id?: string;
          resource_url?: string | null;
          title?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'class_lectures_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_lectures_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_classes';
            referencedColumns: ['id'];
          },
        ];
      };
      coin_transactions: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          reason: string;
          reference_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          reason: string;
          reference_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          reason?: string;
          reference_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coin_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      college_admins: {
        Row: {
          assigned_by: string | null;
          college_id: string;
          created_at: string;
          id: string;
          profile_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          college_id: string;
          created_at?: string;
          id?: string;
          profile_id: string;
        };
        Update: {
          assigned_by?: string | null;
          college_id?: string;
          created_at?: string;
          id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'college_admins_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'college_admins_college_id_fkey';
            columns: ['college_id'];
            isOneToOne: false;
            referencedRelation: 'colleges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'college_admins_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      college_join_requests: {
        Row: {
          college_id: string;
          id: string;
          requested_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          student_id: string;
        };
        Insert: {
          college_id: string;
          id?: string;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          student_id: string;
        };
        Update: {
          college_id?: string;
          id?: string;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'college_join_requests_college_id_fkey';
            columns: ['college_id'];
            isOneToOne: false;
            referencedRelation: 'colleges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'college_join_requests_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'college_join_requests_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      college_lectures: {
        Row: {
          college_id: string;
          course_name: string | null;
          created_at: string;
          degree_name: string | null;
          description: string | null;
          chapter_title: string | null;
          id: string;
          semester: string | null;
          stream: string | null;
          title: string;
          uploaded_by: string;
          video_url: string;
        };
        Insert: {
          college_id: string;
          course_name?: string | null;
          created_at?: string;
          degree_name?: string | null;
          description?: string | null;
          chapter_title?: string | null;
          id?: string;
          semester?: string | null;
          stream?: string | null;
          title: string;
          uploaded_by: string;
          video_url: string;
        };
        Update: {
          college_id?: string;
          course_name?: string | null;
          created_at?: string;
          degree_name?: string | null;
          description?: string | null;
          chapter_title?: string | null;
          id?: string;
          semester?: string | null;
          stream?: string | null;
          title?: string;
          uploaded_by?: string;
          video_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'college_lectures_college_id_fkey';
            columns: ['college_id'];
            isOneToOne: false;
            referencedRelation: 'colleges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'college_lectures_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      college_resources: {
        Row: {
          college_id: string;
          course_name: string | null;
          created_at: string;
          dark_file_url: string | null;
          context_text_url: string | null;
          file_url: string;
          id: string;
          degree_name: string | null;
          chapter_title: string | null;
          light_file_url: string | null;
          resource_type: string;
          semester: string | null;
          stream: string | null;
          title: string;
          uploaded_by: string;
        };
        Insert: {
          college_id: string;
          course_name?: string | null;
          created_at?: string;
          dark_file_url?: string | null;
          context_text_url?: string | null;
          file_url: string;
          id?: string;
          degree_name?: string | null;
          chapter_title?: string | null;
          light_file_url?: string | null;
          resource_type: string;
          semester?: string | null;
          stream?: string | null;
          title: string;
          uploaded_by: string;
        };
        Update: {
          college_id?: string;
          course_name?: string | null;
          created_at?: string;
          dark_file_url?: string | null;
          context_text_url?: string | null;
          file_url?: string;
          id?: string;
          degree_name?: string | null;
          chapter_title?: string | null;
          light_file_url?: string | null;
          resource_type?: string;
          semester?: string | null;
          stream?: string | null;
          title?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'college_resources_college_id_fkey';
            columns: ['college_id'];
            isOneToOne: false;
            referencedRelation: 'colleges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'college_resources_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      colleges: {
        Row: {
          city: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          name: string;
          slug: string;
        };
        Insert: {
          city?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          city?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'colleges_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          messages: Json;
          provider: string;
          subject_id: string | null;
          title: string;
          total_messages: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          messages?: Json;
          provider?: string;
          subject_id?: string | null;
          title?: string;
          total_messages?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          messages?: Json;
          provider?: string;
          subject_id?: string | null;
          title?: string;
          total_messages?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      demo_attempts: {
        Row: {
          answers: Json;
          completed_at: string | null;
          converted_to_user_id: string | null;
          correct_count: number | null;
          id: string;
          ip_hash: string | null;
          question_ids: string[];
          score: number | null;
          session_token: string;
          started_at: string;
          subject_id: string | null;
          total_count: number | null;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          converted_to_user_id?: string | null;
          correct_count?: number | null;
          id?: string;
          ip_hash?: string | null;
          question_ids: string[];
          score?: number | null;
          session_token: string;
          started_at?: string;
          subject_id?: string | null;
          total_count?: number | null;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          converted_to_user_id?: string | null;
          correct_count?: number | null;
          id?: string;
          ip_hash?: string | null;
          question_ids?: string[];
          score?: number | null;
          session_token?: string;
          started_at?: string;
          subject_id?: string | null;
          total_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'demo_attempts_converted_to_user_id_fkey';
            columns: ['converted_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'demo_attempts_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      doubt_replies: {
        Row: {
          body: string;
          created_at: string;
          doubt_id: string;
          id: string;
          is_accepted: boolean;
          teacher_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          doubt_id: string;
          id?: string;
          is_accepted?: boolean;
          teacher_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          doubt_id?: string;
          id?: string;
          is_accepted?: boolean;
          teacher_id?: string;
        };
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
      doubts: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          image_url: string | null;
          is_resolved: boolean;
          student_id: string;
          subject_id: string | null;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_resolved?: boolean;
          student_id: string;
          subject_id?: string | null;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_resolved?: boolean;
          student_id?: string;
          subject_id?: string | null;
          title?: string;
        };
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
      flashcard_decks: {
        Row: {
          chapter_id: string | null;
          cover_color: string;
          cover_icon: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          name: string;
          subject_id: string | null;
          total_cards: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chapter_id?: string | null;
          cover_color?: string;
          cover_icon?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name: string;
          subject_id?: string | null;
          total_cards?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string | null;
          cover_color?: string;
          cover_icon?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          name?: string;
          subject_id?: string | null;
          total_cards?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'flashcard_decks_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
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
            foreignKeyName: 'flashcard_decks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      flashcards: {
        Row: {
          back: string;
          created_at: string;
          deck_id: string;
          difficulty: Database['public']['Enums']['difficulty_level'];
          ease_factor: number;
          front: string;
          hint: string | null;
          id: string;
          interval: number;
          is_starred: boolean;
          last_rating: string | null;
          next_review_at: string;
          repetitions: number;
          tags: string[] | null;
          user_id: string;
        };
        Insert: {
          back: string;
          created_at?: string;
          deck_id: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          ease_factor?: number;
          front: string;
          hint?: string | null;
          id?: string;
          interval?: number;
          is_starred?: boolean;
          last_rating?: string | null;
          next_review_at?: string;
          repetitions?: number;
          tags?: string[] | null;
          user_id: string;
        };
        Update: {
          back?: string;
          created_at?: string;
          deck_id?: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          ease_factor?: number;
          front?: string;
          hint?: string | null;
          id?: string;
          interval?: number;
          is_starred?: boolean;
          last_rating?: string | null;
          next_review_at?: string;
          repetitions?: number;
          tags?: string[] | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'flashcards_deck_id_fkey';
            columns: ['deck_id'];
            isOneToOne: false;
            referencedRelation: 'flashcard_decks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'flashcards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      league_memberships: {
        Row: {
          created_at: string;
          id: string;
          tier: Database['public']['Enums']['league_tier'];
          user_id: string;
          week_start_date: string;
          weekly_xp: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          tier?: Database['public']['Enums']['league_tier'];
          user_id: string;
          week_start_date: string;
          weekly_xp?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          tier?: Database['public']['Enums']['league_tier'];
          user_id?: string;
          week_start_date?: string;
          weekly_xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'league_memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lectures: {
        Row: {
          chapter_id: string;
          created_at: string;
          duration_seconds: number | null;
          exercise_number: string | null;
          id: string;
          kind: string;
          order_index: number;
          thumbnail_url: string | null;
          title: string;
          topic_id: string | null;
          youtube_url: string;
        };
        Insert: {
          chapter_id: string;
          created_at?: string;
          duration_seconds?: number | null;
          exercise_number?: string | null;
          id?: string;
          kind?: string;
          order_index?: number;
          thumbnail_url?: string | null;
          title: string;
          topic_id?: string | null;
          youtube_url: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          duration_seconds?: number | null;
          exercise_number?: string | null;
          id?: string;
          kind?: string;
          order_index?: number;
          thumbnail_url?: string | null;
          title?: string;
          topic_id?: string | null;
          youtube_url?: string;
        };
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
          added_by: string | null;
          board: Database['public']['Enums']['board_type'] | null;
          category: string;
          chapter_id: string | null;
          created_at: string;
          context_text_url: string | null;
          description: string | null;
          drive_file_id: string | null;
          drive_url: string;
          dark_file_url: string | null;
          file_type: string | null;
          grade_level: Database['public']['Enums']['grade_level'] | null;
          id: string;
          light_file_url: string | null;
          resource_type: string;
          subject_id: string | null;
          thumbnail_url: string | null;
          title: string;
        };
        Insert: {
          added_by?: string | null;
          board?: Database['public']['Enums']['board_type'] | null;
          category?: string;
          chapter_id?: string | null;
          created_at?: string;
          context_text_url?: string | null;
          description?: string | null;
          drive_file_id?: string | null;
          drive_url: string;
          dark_file_url?: string | null;
          file_type?: string | null;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          light_file_url?: string | null;
          resource_type?: string;
          subject_id?: string | null;
          thumbnail_url?: string | null;
          title: string;
        };
        Update: {
          added_by?: string | null;
          board?: Database['public']['Enums']['board_type'] | null;
          category?: string;
          chapter_id?: string | null;
          created_at?: string;
          context_text_url?: string | null;
          description?: string | null;
          drive_file_id?: string | null;
          drive_url?: string;
          dark_file_url?: string | null;
          file_type?: string | null;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          light_file_url?: string | null;
          resource_type?: string;
          subject_id?: string | null;
          thumbnail_url?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'library_resources_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'library_resources_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'library_resources_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          chapter_id: string | null;
          content: string;
          created_at: string;
          folder: string | null;
          id: string;
          is_public: boolean;
          is_starred: boolean;
          subject_id: string | null;
          tags: string[] | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chapter_id?: string | null;
          content?: string;
          created_at?: string;
          folder?: string | null;
          id?: string;
          is_public?: boolean;
          is_starred?: boolean;
          subject_id?: string | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string | null;
          content?: string;
          created_at?: string;
          folder?: string | null;
          id?: string;
          is_public?: boolean;
          is_starred?: boolean;
          subject_id?: string | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notes_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
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
            foreignKeyName: 'notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          icon_url: string | null;
          id: string;
          is_read: boolean;
          link: string | null;
          message: string;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message: string;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
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
      offline_download_log: {
        Row: {
          device_hint: string | null;
          downloaded_at: string;
          id: string;
          resource_id: string;
          resource_type: string;
          student_id: string;
        };
        Insert: {
          device_hint?: string | null;
          downloaded_at?: string;
          id?: string;
          resource_id: string;
          resource_type: string;
          student_id: string;
        };
        Update: {
          device_hint?: string | null;
          downloaded_at?: string;
          id?: string;
          resource_id?: string;
          resource_type?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'offline_download_log_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      opportunities: {
        Row: {
          created_at: string;
          deadline: string | null;
          description: string | null;
          eligibility: string | null;
          external_url: string | null;
          id: string;
          is_verified: boolean;
          organization: string | null;
          source: string;
          target_boards: string[] | null;
          target_grade_levels: Database['public']['Enums']['grade_level'][] | null;
          title: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          eligibility?: string | null;
          external_url?: string | null;
          id?: string;
          is_verified?: boolean;
          organization?: string | null;
          source?: string;
          target_boards?: string[] | null;
          target_grade_levels?: Database['public']['Enums']['grade_level'][] | null;
          title: string;
          type: string;
        };
        Update: {
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          eligibility?: string | null;
          external_url?: string | null;
          id?: string;
          is_verified?: boolean;
          organization?: string | null;
          source?: string;
          target_boards?: string[] | null;
          target_grade_levels?: Database['public']['Enums']['grade_level'][] | null;
          title?: string;
          type?: string;
        };
        Relationships: [];
      };
      opportunity_bookmarks: {
        Row: {
          created_at: string;
          id: string;
          opportunity_id: string;
          reminder_date: string | null;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          opportunity_id: string;
          reminder_date?: string | null;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          opportunity_id?: string;
          reminder_date?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'opportunity_bookmarks_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'opportunities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_bookmarks_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      paper_checks: {
        Row: {
          answer_text: string | null;
          created_at: string;
          feedback: string;
          id: string;
          image_url: string | null;
          input_type: string;
          marks_obtained: number;
          marks_total: number;
          missing_elements: Json;
          provider: string;
          question_text: string | null;
          student_id: string;
          subject_id: string | null;
        };
        Insert: {
          answer_text?: string | null;
          created_at?: string;
          feedback: string;
          id?: string;
          image_url?: string | null;
          input_type?: string;
          marks_obtained: number;
          marks_total: number;
          missing_elements?: Json;
          provider?: string;
          question_text?: string | null;
          student_id: string;
          subject_id?: string | null;
        };
        Update: {
          answer_text?: string | null;
          created_at?: string;
          feedback?: string;
          id?: string;
          image_url?: string | null;
          input_type?: string;
          marks_obtained?: number;
          marks_total?: number;
          missing_elements?: Json;
          provider?: string;
          question_text?: string | null;
          student_id?: string;
          subject_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'paper_checks_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_checks_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      parent_attachments: {
        Row: {
          caption: string | null;
          created_at: string;
          file_name: string;
          file_size_kb: number;
          file_type: string;
          file_url: string;
          id: string;
          link_id: string;
          sender_id: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          file_name: string;
          file_size_kb: number;
          file_type: string;
          file_url: string;
          id?: string;
          link_id: string;
          sender_id: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          file_name?: string;
          file_size_kb?: number;
          file_type?: string;
          file_url?: string;
          id?: string;
          link_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'parent_attachments_link_id_fkey';
            columns: ['link_id'];
            isOneToOne: false;
            referencedRelation: 'parent_student_links';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parent_attachments_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      parent_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          link_id: string;
          read_at: string | null;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          link_id: string;
          read_at?: string | null;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          link_id?: string;
          read_at?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'parent_messages_link_id_fkey';
            columns: ['link_id'];
            isOneToOne: false;
            referencedRelation: 'parent_student_links';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parent_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      parent_student_links: {
        Row: {
          created_at: string;
          id: string;
          invite_code: string | null;
          invite_expires_at: string | null;
          linked_at: string | null;
          parent_id: string;
          status: string;
          student_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          linked_at?: string | null;
          parent_id: string;
          status?: string;
          student_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          linked_at?: string | null;
          parent_id?: string;
          status?: string;
          student_id?: string | null;
        };
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
      parent_weekly_reports: {
        Row: {
          ai_narrative: string | null;
          created_at: string;
          id: string;
          parent_id: string;
          student_id: string;
          suggested_actions: Json | null;
          summary: Json;
          week_start_date: string;
        };
        Insert: {
          ai_narrative?: string | null;
          created_at?: string;
          id?: string;
          parent_id: string;
          student_id: string;
          suggested_actions?: Json | null;
          summary: Json;
          week_start_date: string;
        };
        Update: {
          ai_narrative?: string | null;
          created_at?: string;
          id?: string;
          parent_id?: string;
          student_id?: string;
          suggested_actions?: Json | null;
          summary?: Json;
          week_start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'parent_weekly_reports_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parent_weekly_reports_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      past_papers: {
        Row: {
          board: Database['public']['Enums']['board_type'];
          chapter_id: string | null;
          created_at: string;
          context_text_url: string | null;
          download_count: number;
          duration: number;
          file_url: string;
          grade_level: Database['public']['Enums']['grade_level'] | null;
          id: string;
          is_verified: boolean;
          paper_type: Database['public']['Enums']['paper_type'];
          subject_id: string;
          thumbnail_url: string | null;
          total_questions: number;
          year: number;
        };
        Insert: {
          board: Database['public']['Enums']['board_type'];
          chapter_id?: string | null;
          created_at?: string;
          context_text_url?: string | null;
          download_count?: number;
          duration?: number;
          file_url: string;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          is_verified?: boolean;
          paper_type?: Database['public']['Enums']['paper_type'];
          subject_id: string;
          thumbnail_url?: string | null;
          total_questions?: number;
          year: number;
        };
        Update: {
          board?: Database['public']['Enums']['board_type'];
          chapter_id?: string | null;
          created_at?: string;
          context_text_url?: string | null;
          download_count?: number;
          duration?: number;
          file_url?: string;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          is_verified?: boolean;
          paper_type?: Database['public']['Enums']['paper_type'];
          subject_id?: string;
          thumbnail_url?: string | null;
          total_questions?: number;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'past_papers_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'past_papers_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      platform_settings: {
        Row: {
          created_at: string;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          created_at?: string;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          created_at?: string;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      portfolio_settings: {
        Row: {
          bio: string | null;
          headline: string | null;
          id: string;
          is_public: boolean;
          public_slug: string | null;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          headline?: string | null;
          id?: string;
          is_public?: boolean;
          public_slug?: string | null;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          headline?: string | null;
          id?: string;
          is_public?: boolean;
          public_slug?: string | null;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolio_settings_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      previous_marks: {
        Row: {
          created_at: string;
          id: string;
          marks_obtained: number;
          marks_total: number;
          student_id: string;
          subject_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          marks_obtained: number;
          marks_total?: number;
          student_id: string;
          subject_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          marks_obtained?: number;
          marks_total?: number;
          student_id?: string;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'previous_marks_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'previous_marks_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          ai_onboarding_complete: boolean;
          ai_persona_provider: string | null;
          ai_persona_tier: string | null;
          avatar_url: string | null;
          bio: string | null;
          board: Database['public']['Enums']['board_type'] | null;
          class: string | null;
          coins: number;
          college_id: string | null;
          created_at: string;
          education_level: string;
          email: string;
          full_name: string;
          gender: string | null;
          gender_changed_at: string | null;
          grade_level: Database['public']['Enums']['grade_level'] | null;
          id: string;
          is_ai_operated: boolean;
          is_email_verified: boolean;
          is_profile_complete: boolean;
          last_active_date: string | null;
          level: number;
          location: string | null;
          onboarding_completed: boolean;
          onboarding_step: number;
          optional_subject_ids: string[];
          parent_link_code: string | null;
          phone: string | null;
          preferred_output_style: string;
          previous_roll_number: string | null;
          role: Database['public']['Enums']['user_role'];
          sponsored_institution_name: string | null;
          sponsored_institution_type: string | null;
          streak: number;
          study_email_consent: boolean;
          study_email_last_sent_at: string | null;
          study_email_unsubscribed_at: string | null;
          subjects: string[] | null;
          subscription_expires_at: string | null;
          subscription_tier: Database['public']['Enums']['subscription_tier'];
          target_marks_percentage: number | null;
          total_marks_percentage: number | null;
          total_study_time: number;
          username: string | null;
          university_courses: string[];
          university_degree: string | null;
          university_exam_target_date: string | null;
          university_program: string | null;
          university_semester: string | null;
          university_stream: string | null;
          updated_at: string;
          xp: number;
        };
        Insert: {
          ai_onboarding_complete?: boolean;
          ai_persona_provider?: string | null;
          ai_persona_tier?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          board?: Database['public']['Enums']['board_type'] | null;
          class?: string | null;
          coins?: number;
          college_id?: string | null;
          created_at?: string;
          education_level?: string;
          email: string;
          full_name: string;
          gender?: string | null;
          gender_changed_at?: string | null;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id: string;
          is_ai_operated?: boolean;
          is_email_verified?: boolean;
          is_profile_complete?: boolean;
          last_active_date?: string | null;
          level?: number;
          location?: string | null;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          optional_subject_ids?: string[];
          parent_link_code?: string | null;
          phone?: string | null;
          preferred_output_style?: string;
          previous_roll_number?: string | null;
          role?: Database['public']['Enums']['user_role'];
          sponsored_institution_name?: string | null;
          sponsored_institution_type?: string | null;
          streak?: number;
          study_email_consent?: boolean;
          study_email_last_sent_at?: string | null;
          study_email_unsubscribed_at?: string | null;
          subjects?: string[] | null;
          subscription_expires_at?: string | null;
          subscription_tier?: Database['public']['Enums']['subscription_tier'];
          target_marks_percentage?: number | null;
          total_marks_percentage?: number | null;
          total_study_time?: number;
          username?: string | null;
          university_courses?: string[];
          university_degree?: string | null;
          university_exam_target_date?: string | null;
          university_program?: string | null;
          university_semester?: string | null;
          university_stream?: string | null;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          ai_onboarding_complete?: boolean;
          ai_persona_provider?: string | null;
          ai_persona_tier?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          board?: Database['public']['Enums']['board_type'] | null;
          class?: string | null;
          coins?: number;
          college_id?: string | null;
          created_at?: string;
          education_level?: string;
          email?: string;
          full_name?: string;
          gender?: string | null;
          gender_changed_at?: string | null;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          is_ai_operated?: boolean;
          is_email_verified?: boolean;
          is_profile_complete?: boolean;
          last_active_date?: string | null;
          level?: number;
          location?: string | null;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          optional_subject_ids?: string[];
          parent_link_code?: string | null;
          phone?: string | null;
          preferred_output_style?: string;
          previous_roll_number?: string | null;
          role?: Database['public']['Enums']['user_role'];
          sponsored_institution_name?: string | null;
          sponsored_institution_type?: string | null;
          streak?: number;
          study_email_consent?: boolean;
          study_email_last_sent_at?: string | null;
          study_email_unsubscribed_at?: string | null;
          subjects?: string[] | null;
          subscription_expires_at?: string | null;
          subscription_tier?: Database['public']['Enums']['subscription_tier'];
          target_marks_percentage?: number | null;
          total_marks_percentage?: number | null;
          total_study_time?: number;
          username?: string | null;
          university_courses?: string[];
          university_degree?: string | null;
          university_exam_target_date?: string | null;
          university_program?: string | null;
          university_semester?: string | null;
          university_stream?: string | null;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_college_id_fkey';
            columns: ['college_id'];
            isOneToOne: false;
            referencedRelation: 'colleges';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          board: Database['public']['Enums']['board_type'] | null;
          chapter_id: string;
          correct_answer: Json;
          correct_rate: number;
          created_at: string;
          difficulty: Database['public']['Enums']['difficulty_level'];
          explanation: string | null;
          id: string;
          is_demo_eligible: boolean;
          is_verified: boolean;
          marks: number;
          options: Json | null;
          subject_id: string;
          tags: string[] | null;
          text: string;
          times_attempted: number;
          topic_id: string | null;
          type: Database['public']['Enums']['question_type'];
          year: number | null;
        };
        Insert: {
          board?: Database['public']['Enums']['board_type'] | null;
          chapter_id: string;
          correct_answer: Json;
          correct_rate?: number;
          created_at?: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          explanation?: string | null;
          id?: string;
          is_demo_eligible?: boolean;
          is_verified?: boolean;
          marks?: number;
          options?: Json | null;
          subject_id: string;
          tags?: string[] | null;
          text: string;
          times_attempted?: number;
          topic_id?: string | null;
          type?: Database['public']['Enums']['question_type'];
          year?: number | null;
        };
        Update: {
          board?: Database['public']['Enums']['board_type'] | null;
          chapter_id?: string;
          correct_answer?: Json;
          correct_rate?: number;
          created_at?: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          explanation?: string | null;
          id?: string;
          is_demo_eligible?: boolean;
          is_verified?: boolean;
          marks?: number;
          options?: Json | null;
          subject_id?: string;
          tags?: string[] | null;
          text?: string;
          times_attempted?: number;
          topic_id?: string | null;
          type?: Database['public']['Enums']['question_type'];
          year?: number | null;
        };
        Relationships: [
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
          {
            foreignKeyName: 'questions_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_sessions: {
        Row: {
          answers: Json;
          chapter_ids: string[] | null;
          class_id: string | null;
          completed_at: string | null;
          correct_count: number;
          current_index: number;
          id: string;
          incorrect_count: number;
          mode: Database['public']['Enums']['quiz_mode'];
          questions: Json;
          score: number | null;
          skipped_count: number;
          started_at: string;
          status: Database['public']['Enums']['session_status'];
          subject_id: string;
          time_limit: number | null;
          time_spent: number;
          total_marks: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          chapter_ids?: string[] | null;
          class_id?: string | null;
          completed_at?: string | null;
          correct_count?: number;
          current_index?: number;
          id?: string;
          incorrect_count?: number;
          mode?: Database['public']['Enums']['quiz_mode'];
          questions?: Json;
          score?: number | null;
          skipped_count?: number;
          started_at?: string;
          status?: Database['public']['Enums']['session_status'];
          subject_id: string;
          time_limit?: number | null;
          time_spent?: number;
          total_marks?: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          chapter_ids?: string[] | null;
          class_id?: string | null;
          completed_at?: string | null;
          correct_count?: number;
          current_index?: number;
          id?: string;
          incorrect_count?: number;
          mode?: Database['public']['Enums']['quiz_mode'];
          questions?: Json;
          score?: number | null;
          skipped_count?: number;
          started_at?: string;
          status?: Database['public']['Enums']['session_status'];
          subject_id?: string;
          time_limit?: number | null;
          time_spent?: number;
          total_marks?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_sessions_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_sessions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      research_projects: {
        Row: {
          created_at: string;
          id: string;
          status: string;
          student_id: string;
          title: string;
          topic: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: string;
          student_id: string;
          title: string;
          topic?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: string;
          student_id?: string;
          title?: string;
          topic?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_projects_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      research_sources: {
        Row: {
          added_at: string;
          authors: string | null;
          citation_apa: string | null;
          citation_mla: string | null;
          id: string;
          project_id: string;
          source_url: string | null;
          summary: string | null;
          title: string | null;
        };
        Insert: {
          added_at?: string;
          authors?: string | null;
          citation_apa?: string | null;
          citation_mla?: string | null;
          id?: string;
          project_id: string;
          source_url?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Update: {
          added_at?: string;
          authors?: string | null;
          citation_apa?: string | null;
          citation_mla?: string | null;
          id?: string;
          project_id?: string;
          source_url?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'research_sources_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'research_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_tests: {
        Row: {
          created_at: string;
          id: string;
          scheduled_at: string;
          score: number | null;
          status: string;
          student_id: string;
          subject: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          scheduled_at: string;
          score?: number | null;
          status?: string;
          student_id: string;
          subject: string;
          title: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          scheduled_at?: string;
          score?: number | null;
          status?: string;
          student_id?: string;
          subject?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_tests_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      speaking_practice_sessions: {
        Row: {
          ai_feedback: string | null;
          audio_url: string | null;
          created_at: string;
          id: string;
          language: string;
          prompt_text: string;
          pronunciation_score: number | null;
          student_id: string;
          transcript: string | null;
        };
        Insert: {
          ai_feedback?: string | null;
          audio_url?: string | null;
          created_at?: string;
          id?: string;
          language: string;
          prompt_text: string;
          pronunciation_score?: number | null;
          student_id: string;
          transcript?: string | null;
        };
        Update: {
          ai_feedback?: string | null;
          audio_url?: string | null;
          created_at?: string;
          id?: string;
          language?: string;
          prompt_text?: string;
          pronunciation_score?: number | null;
          student_id?: string;
          transcript?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'speaking_practice_sessions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_avatar_inventory: {
        Row: {
          acquired_at: string;
          equipped: boolean;
          id: string;
          item_id: string;
          student_id: string;
        };
        Insert: {
          acquired_at?: string;
          equipped?: boolean;
          id?: string;
          item_id: string;
          student_id: string;
        };
        Update: {
          acquired_at?: string;
          equipped?: boolean;
          id?: string;
          item_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_avatar_inventory_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'avatar_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_avatar_inventory_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          read_at: string | null;
          request_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          request_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          request_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_chat_messages_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'student_chat_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_chat_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_chat_requests: {
        Row: {
          created_at: string;
          id: string;
          moderation_blocked_until: string | null;
          moderation_last_checked_message_count: number;
          moderation_last_reason: string | null;
          moderation_warning_count: number;
          recipient_id: string;
          requester_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          moderation_blocked_until?: string | null;
          moderation_last_checked_message_count?: number;
          moderation_last_reason?: string | null;
          moderation_warning_count?: number;
          recipient_id: string;
          requester_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          moderation_blocked_until?: string | null;
          moderation_last_checked_message_count?: number;
          moderation_last_reason?: string | null;
          moderation_warning_count?: number;
          recipient_id?: string;
          requester_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_chat_requests_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_chat_requests_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_digital_twin: {
        Row: {
          attention_span_minutes: number | null;
          avg_solve_speed_seconds: number | null;
          confidence_level: number;
          created_at: string;
          id: string;
          last_recomputed_at: string | null;
          learning_style: string | null;
          predicted_exam_score: number | null;
          preferred_study_time: string | null;
          signal_count: number;
          strengths: Json;
          student_id: string;
          updated_at: string;
          weaknesses: Json;
        };
        Insert: {
          attention_span_minutes?: number | null;
          avg_solve_speed_seconds?: number | null;
          confidence_level?: number;
          created_at?: string;
          id?: string;
          last_recomputed_at?: string | null;
          learning_style?: string | null;
          predicted_exam_score?: number | null;
          preferred_study_time?: string | null;
          signal_count?: number;
          strengths?: Json;
          student_id: string;
          updated_at?: string;
          weaknesses?: Json;
        };
        Update: {
          attention_span_minutes?: number | null;
          avg_solve_speed_seconds?: number | null;
          confidence_level?: number;
          created_at?: string;
          id?: string;
          last_recomputed_at?: string | null;
          learning_style?: string | null;
          predicted_exam_score?: number | null;
          preferred_study_time?: string | null;
          signal_count?: number;
          strengths?: Json;
          student_id?: string;
          updated_at?: string;
          weaknesses?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'student_digital_twin_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_digital_twin_history: {
        Row: {
          confidence_level: number;
          created_at: string;
          id: string;
          predicted_exam_score: number | null;
          strengths: Json;
          student_id: string;
          weaknesses: Json;
        };
        Insert: {
          confidence_level: number;
          created_at?: string;
          id?: string;
          predicted_exam_score?: number | null;
          strengths?: Json;
          student_id: string;
          weaknesses?: Json;
        };
        Update: {
          confidence_level?: number;
          created_at?: string;
          id?: string;
          predicted_exam_score?: number | null;
          strengths?: Json;
          student_id?: string;
          weaknesses?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'student_digital_twin_history_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_predictions: {
        Row: {
          admission_probability: Json | null;
          burnout_risk_score: number | null;
          chapter_mastery_estimate: Json | null;
          computed_at: string;
          dropout_risk_score: number | null;
          id: string;
          narrative: Json;
          predicted_board_marks: number | null;
          predicted_entry_test_score: number | null;
          student_id: string;
          weak_chapter_risk: Json | null;
        };
        Insert: {
          admission_probability?: Json | null;
          burnout_risk_score?: number | null;
          chapter_mastery_estimate?: Json | null;
          computed_at?: string;
          dropout_risk_score?: number | null;
          id?: string;
          narrative?: Json;
          predicted_board_marks?: number | null;
          predicted_entry_test_score?: number | null;
          student_id: string;
          weak_chapter_risk?: Json | null;
        };
        Update: {
          admission_probability?: Json | null;
          burnout_risk_score?: number | null;
          chapter_mastery_estimate?: Json | null;
          computed_at?: string;
          dropout_risk_score?: number | null;
          id?: string;
          narrative?: Json;
          predicted_board_marks?: number | null;
          predicted_entry_test_score?: number | null;
          student_id?: string;
          weak_chapter_risk?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'student_predictions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_weekly_snapshots: {
        Row: {
          ai_messages_sent: number;
          average_score: number;
          created_at: string;
          id: string;
          quizzes_completed: number;
          streak_days: number;
          student_id: string;
          study_minutes: number;
          subjects_studied: string[] | null;
          week_start: string;
          xp_earned: number;
        };
        Insert: {
          ai_messages_sent?: number;
          average_score?: number;
          created_at?: string;
          id?: string;
          quizzes_completed?: number;
          streak_days?: number;
          student_id: string;
          study_minutes?: number;
          subjects_studied?: string[] | null;
          week_start: string;
          xp_earned?: number;
        };
        Update: {
          ai_messages_sent?: number;
          average_score?: number;
          created_at?: string;
          id?: string;
          quizzes_completed?: number;
          streak_days?: number;
          student_id?: string;
          study_minutes?: number;
          subjects_studied?: string[] | null;
          week_start?: string;
          xp_earned?: number;
        };
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
      study_plan_sessions: {
        Row: {
          chapter_id: string | null;
          completed_at: string | null;
          created_at: string;
          duration_minutes: number;
          id: string;
          is_completed: boolean;
          plan_id: string;
          session_date: string;
          session_type: string;
          student_id: string;
          subject_id: string | null;
        };
        Insert: {
          chapter_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          duration_minutes: number;
          id?: string;
          is_completed?: boolean;
          plan_id: string;
          session_date: string;
          session_type: string;
          student_id: string;
          subject_id?: string | null;
        };
        Update: {
          chapter_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          is_completed?: boolean;
          plan_id?: string;
          session_date?: string;
          session_type?: string;
          student_id?: string;
          subject_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'study_plan_sessions_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_plan_sessions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'study_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_plan_sessions_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_plan_sessions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      study_plans: {
        Row: {
          constraints: Json;
          created_at: string;
          daily_available_hours: number;
          exam_date: string | null;
          id: string;
          is_active: boolean;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          constraints?: Json;
          created_at?: string;
          daily_available_hours?: number;
          exam_date?: string | null;
          id?: string;
          is_active?: boolean;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          constraints?: Json;
          created_at?: string;
          daily_available_hours?: number;
          exam_date?: string | null;
          id?: string;
          is_active?: boolean;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_plans_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      study_routines: {
        Row: {
          created_at: string;
          generated_by_provider: string | null;
          id: string;
          preferences: Json;
          schedule: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          generated_by_provider?: string | null;
          id?: string;
          preferences?: Json;
          schedule?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          generated_by_provider?: string | null;
          id?: string;
          preferences?: Json;
          schedule?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_routines_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      study_sessions: {
        Row: {
          created_at: string;
          date: string;
          duration: number;
          id: string;
          subject_id: string | null;
          type: Database['public']['Enums']['session_type'];
          user_id: string;
          xp_earned: number;
        };
        Insert: {
          created_at?: string;
          date?: string;
          duration?: number;
          id?: string;
          subject_id?: string | null;
          type: Database['public']['Enums']['session_type'];
          user_id: string;
          xp_earned?: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          duration?: number;
          id?: string;
          subject_id?: string | null;
          type?: Database['public']['Enums']['session_type'];
          user_id?: string;
          xp_earned?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'study_sessions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      subjects: {
        Row: {
          boards: Database['public']['Enums']['board_type'][];
          code: string;
          color: string;
          created_at: string;
          description: string | null;
          grade_levels: Database['public']['Enums']['grade_level'][];
          icon_url: string | null;
          id: string;
          is_active: boolean;
          is_optional: boolean;
          name: string;
          slug: string;
          stream: string | null;
          total_chapters: number;
          total_questions: number;
        };
        Insert: {
          boards?: Database['public']['Enums']['board_type'][];
          code: string;
          color?: string;
          created_at?: string;
          description?: string | null;
          grade_levels?: Database['public']['Enums']['grade_level'][];
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          is_optional?: boolean;
          name: string;
          slug: string;
          stream?: string | null;
          total_chapters?: number;
          total_questions?: number;
        };
        Update: {
          boards?: Database['public']['Enums']['board_type'][];
          code?: string;
          color?: string;
          created_at?: string;
          description?: string | null;
          grade_levels?: Database['public']['Enums']['grade_level'][];
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          is_optional?: boolean;
          name?: string;
          slug?: string;
          stream?: string | null;
          total_chapters?: number;
          total_questions?: number;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string;
          current_period_start: string;
          id: string;
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: string;
          tier: Database['public']['Enums']['subscription_tier'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          tier?: Database['public']['Enums']['subscription_tier'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          tier?: Database['public']['Enums']['subscription_tier'];
          updated_at?: string;
          user_id?: string;
        };
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
      teacher_classes: {
        Row: {
          board: string | null;
          created_at: string;
          grade_level: Database['public']['Enums']['grade_level'] | null;
          id: string;
          join_code: string;
          name: string;
          subject_id: string | null;
          teacher_id: string;
        };
        Insert: {
          board?: string | null;
          created_at?: string;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          join_code: string;
          name: string;
          subject_id?: string | null;
          teacher_id: string;
        };
        Update: {
          board?: string | null;
          created_at?: string;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          id?: string;
          join_code?: string;
          name?: string;
          subject_id?: string | null;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_classes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_classes_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      topics: {
        Row: {
          chapter_id: string;
          content: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          order_index: number;
          slug: string;
          video_url: string | null;
        };
        Insert: {
          chapter_id: string;
          content?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          order_index?: number;
          slug: string;
          video_url?: string | null;
        };
        Update: {
          chapter_id?: string;
          content?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          order_index?: number;
          slug?: string;
          video_url?: string | null;
        };
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
      user_achievements: {
        Row: {
          achievement_id: string;
          earned_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          earned_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          earned_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      vision_scans: {
        Row: {
          ai_explanation: string | null;
          chapter_id: string | null;
          created_at: string;
          id: string;
          image_url: string;
          language: string;
          ocr_text: string | null;
          scan_type: string;
          student_id: string;
        };
        Insert: {
          ai_explanation?: string | null;
          chapter_id?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          language?: string;
          ocr_text?: string | null;
          scan_type: string;
          student_id: string;
        };
        Update: {
          ai_explanation?: string | null;
          chapter_id?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          language?: string;
          ocr_text?: string | null;
          scan_type?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vision_scans_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vision_scans_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_xp: {
        Args: { p_amount: number; p_user_id: string };
        Returns: undefined;
      };
      calculate_next_review: {
        Args: { p_ease_factor: number; p_interval: number; p_quality: number };
        Returns: Json;
      };
      current_week_start: { Args: never; Returns: string };
      get_leaderboard: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          avatar_url: string;
          board: Database['public']['Enums']['board_type'];
          full_name: string;
          id: string;
          level: number;
          rank: number;
          streak: number;
          xp: number;
        }[];
      };
      increment_coins: {
        Args: { p_amount: number; p_user_id: string };
        Returns: number;
      };
      increment_xp_and_league: {
        Args: { p_amount: number; p_user_id: string };
        Returns: {
          level: number;
          weekly_xp: number;
          xp: number;
        }[];
      };
      refresh_subject_counts: { Args: never; Returns: undefined };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      update_streak: { Args: { p_user_id: string }; Returns: undefined };
    };
    Enums: {
      board_type:
        | 'FBISE'
        | 'BISE_LHR'
        | 'BISE_KHI'
        | 'BISE_RWP'
        | 'BISE_FSD'
        | 'AKU'
        | 'OTHER'
        | 'CBSE'
        | 'ICSE'
        | 'STATE_BOARD_IN';
      difficulty_level: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
      grade_level: 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12' | 'O_LEVEL' | 'A_LEVEL';
      league_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
      notification_type: 'ACHIEVEMENT' | 'STREAK' | 'REMINDER' | 'SYSTEM' | 'SOCIAL';
      paper_type: 'ANNUAL' | 'SUPPLEMENTARY' | 'MODEL';
      question_type: 'MCQ' | 'SHORT' | 'LONG' | 'FILL_BLANK' | 'TRUE_FALSE';
      quiz_mode: 'PRACTICE' | 'TEST' | 'REVIEW' | 'EXAM';
      session_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
      session_type: 'READING' | 'QUIZ' | 'FLASHCARD' | 'AI_CHAT' | 'PAST_PAPER';
      subscription_tier: 'FREE' | 'PRO' | 'ELITE';
      user_role: 'student' | 'teacher' | 'admin' | 'parent';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      board_type: [
        'FBISE',
        'BISE_LHR',
        'BISE_KHI',
        'BISE_RWP',
        'BISE_FSD',
        'AKU',
        'OTHER',
        'CBSE',
        'ICSE',
        'STATE_BOARD_IN',
      ],
      difficulty_level: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
      grade_level: ['GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12', 'O_LEVEL', 'A_LEVEL'],
      league_tier: ['bronze', 'silver', 'gold', 'platinum'],
      notification_type: ['ACHIEVEMENT', 'STREAK', 'REMINDER', 'SYSTEM', 'SOCIAL'],
      paper_type: ['ANNUAL', 'SUPPLEMENTARY', 'MODEL'],
      question_type: ['MCQ', 'SHORT', 'LONG', 'FILL_BLANK', 'TRUE_FALSE'],
      quiz_mode: ['PRACTICE', 'TEST', 'REVIEW', 'EXAM'],
      session_status: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      session_type: ['READING', 'QUIZ', 'FLASHCARD', 'AI_CHAT', 'PAST_PAPER'],
      subscription_tier: ['FREE', 'PRO', 'ELITE'],
      user_role: ['student', 'teacher', 'admin', 'parent'],
    },
  },
} as const;
