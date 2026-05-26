export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'super_admin' | 'institution_admin' | 'teacher' | 'pending_teacher' | 'student';
export type EnvId = 'linux' | 'macos' | 'windows';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          created_at: string;
          role: UserRole;
          display_name: string | null;
          bio: string | null;
          preferred_env: EnvId | null;
          sector: string | null;
          institution_id: string | null;
          role_requested_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          created_at?: string;
          role?: UserRole;
          display_name?: string | null;
          bio?: string | null;
          preferred_env?: EnvId | null;
          sector?: string | null;
          institution_id?: string | null;
          role_requested_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          created_at?: string;
          role?: UserRole;
          display_name?: string | null;
          bio?: string | null;
          preferred_env?: EnvId | null;
          sector?: string | null;
          institution_id?: string | null;
          role_requested_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          }
        ];
      };
      progress: {
        Row: {
          user_id: string;
          lesson_id: string;
          completed: boolean;
          completed_at: string | null;
          score: number | null;
        };
        Insert: {
          user_id: string;
          lesson_id: string;
          completed?: boolean;
          completed_at?: string | null;
          score?: number | null;
        };
        Update: {
          user_id?: string;
          lesson_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          domain_whitelist: string[] | null;
          admin_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain_whitelist?: string[] | null;
          admin_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain_whitelist?: string[] | null;
          admin_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'institutions_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      classes: {
        Row: {
          id: string;
          name: string;
          teacher_id: string;
          institution_id: string | null;
          created_at: string;
          /**
           * Unique 12-char hex code (48 bits entropy via gen_random_bytes(6)).
           * Auto-generated on INSERT via trigger `set_invitation_code_before_insert`.
           * Used by `join_class_by_code()` RPC for atomic student enrollment.
           * THI-235 Sprint 2.A étape 1 (migrations 016/017/018/019).
           */
          invitation_code: string;
        };
        Insert: {
          id?: string;
          name: string;
          teacher_id: string;
          institution_id?: string | null;
          created_at?: string;
          // invitation_code is NOT exposed in Insert: migration 020 hardens the
          // trigger to ALWAYS regenerate, ignoring any client-supplied value
          // (security-auditor H2 — prevent client-forced reduced-entropy codes).
          // For test fixtures needing a fixed code, INSERT then UPDATE.
        };
        Update: {
          id?: string;
          name?: string;
          teacher_id?: string;
          institution_id?: string | null;
          created_at?: string;
          invitation_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classes_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          }
        ];
      };
      class_enrollments: {
        Row: {
          class_id: string;
          student_id: string;
          enrolled_at: string;
        };
        Insert: {
          class_id: string;
          student_id: string;
          enrolled_at?: string;
        };
        Update: {
          class_id?: string;
          student_id?: string;
          enrolled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_enrollments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_enrollments_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      security_audit_logs: {
        Row: {
          id: string;
          created_at: string;
          trigger: 'schedule' | 'workflow_dispatch' | 'manual';
          npm_audit_status: 'pass' | 'fail' | 'skipped';
          secrets_scan_status: 'pass' | 'fail' | 'skipped';
          headers_status: 'pass' | 'fail' | 'skipped';
          cookies_status: 'pass' | 'fail' | 'skipped';
          overall_status: 'pass' | 'warning' | 'fail';
          run_url: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          trigger: 'schedule' | 'workflow_dispatch' | 'manual';
          npm_audit_status: 'pass' | 'fail' | 'skipped';
          secrets_scan_status: 'pass' | 'fail' | 'skipped';
          headers_status: 'pass' | 'fail' | 'skipped';
          cookies_status: 'pass' | 'fail' | 'skipped';
          overall_status: 'pass' | 'warning' | 'fail';
          run_url?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          trigger?: 'schedule' | 'workflow_dispatch' | 'manual';
          npm_audit_status?: 'pass' | 'fail' | 'skipped';
          secrets_scan_status?: 'pass' | 'fail' | 'skipped';
          headers_status?: 'pass' | 'fail' | 'skipped';
          cookies_status?: 'pass' | 'fail' | 'skipped';
          overall_status?: 'pass' | 'warning' | 'fail';
          run_url?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_my_institution_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_teacher_of_class: {
        Args: { p_class_id: string };
        Returns: boolean;
      };
      /**
       * THI-235 Sprint 2.A étape 1 — atomic student enrollment via invitation code.
       * Security definer, trim()-normalizes input, raises 42501 (not authed),
       * 22023 (empty code), 02000 (invalid code). Returns class info + already_enrolled
       * flag for idempotent UX. Consumed by `/app/join?code=XXX` page (étape 3).
       */
      join_class_by_code: {
        Args: { code: string };
        Returns: {
          class_id: string;
          class_name: string;
          teacher_id: string;
          joined_at: string;
          already_enrolled: boolean;
        }[];
      };
      /**
       * THI-280 Sprint 2.B Étape 3 — institution_admin promotes pending_teacher → teacher
       * within their own institution. SECURITY DEFINER with FOR UPDATE row lock +
       * compare-and-swap UPDATE (race-safe Sourcery review). Raises :
       *  - PERMISSION_DENIED : caller not institution_admin, or cross-institution target
       *  - NOT_FOUND         : target user does not exist
       *  - INVALID_STATE     : target is not in pending_teacher state
       * Inserts admin_audit_log row; migration 026 trigger covers direct PATCH bypass.
       */
      approve_teacher: {
        Args: { target_user_id: string };
        Returns: void;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
