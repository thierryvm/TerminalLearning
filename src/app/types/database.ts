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
        };
        Insert: {
          id?: string;
          name: string;
          teacher_id: string;
          institution_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          teacher_id?: string;
          institution_id?: string | null;
          created_at?: string;
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
