// =============================================
// src/lib/supabase/database.types.ts
// Tipos generados del esquema PostgreSQL de Supabase
// Regenerar con: npx supabase gen types typescript --project-id tu-project-ref
// =============================================

// =============================================
// Formato exacto que genera `npx supabase gen types typescript`.
// NO usar Record<string, never> en Views/Functions — causa que el
// compilador infiera `never` para todas las tablas.
// =============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RecordingStatus = "raw" | "processing" | "ready" | "error";

export interface Database {
  public: {
    Tables: {
      recordings: {
        Row: {
          id: string;
          user_id: string;
          status: RecordingStatus;
          raw_path: string | null;
          processed_url: string | null;
          thumbnail_url: string | null;
          duration_seconds: number | null;
          size_bytes: number | null;
          title: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: RecordingStatus;
          raw_path?: string | null;
          processed_url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          size_bytes?: number | null;
          title?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: RecordingStatus;
          raw_path?: string | null;
          processed_url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          size_bytes?: number | null;
          title?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      recording_status: RecordingStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
