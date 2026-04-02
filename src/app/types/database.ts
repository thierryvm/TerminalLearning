export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
