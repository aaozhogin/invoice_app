export type Json = null | string | number | boolean | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      line_items: {
        Row: {
          id: number;
          code: string | null;
          category: string | null;
          description: string | null;
          max_rate: number | null;
          billed_rate: number | null;
          rate_offset: number | null;
        };
        Insert: {
          id?: number;
          code: string;
          category: string;
          description?: string | null;
          max_rate: number;
          billed_rate: number;
          rate_offset?: number | null;
        };
        Update: {
          id?: number;
          code?: string;
          category?: string;
          description?: string | null;
          max_rate?: number;
          billed_rate?: number;
          rate_offset?: number | null;
        };
      };
    };
    Functions: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
};