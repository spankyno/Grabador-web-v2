// =============================================
// src/lib/supabase/database.types.ts
// Tipos generados del esquema PostgreSQL de Supabase
// Regenerar con: npx supabase gen types typescript --project-id tu-project-ref
// =============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      recordings: {
        Row: {
          id: string;
          user_id: string;
          status: "raw" | "processing" | "ready" | "error";
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
          status?: "raw" | "processing" | "ready" | "error";
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
          status?: "raw" | "processing" | "ready" | "error";
          raw_path?: string | null;
          processed_url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          size_bytes?: number | null;
          title?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      recording_status: "raw" | "processing" | "ready" | "error";
    };
  };
}
