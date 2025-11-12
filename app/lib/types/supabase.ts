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
          // new columns
          sleepover: boolean | null;
          public_holiday: boolean | null;
          time_from: string | null; // SQL time represented as string in JS
          time_to: string | null;
        };
        Insert: {
          id?: number;
          code: string;
          category: string;
          description?: string | null;
          max_rate: number;
          billed_rate: number;
          rate_offset?: number | null;
          // new columns for insert (optional)
          sleepover?: boolean | null;
          public_holiday?: boolean | null;
          time_from?: string | null;
          time_to?: string | null;
        };
        Update: {
          id?: number;
          code?: string;
          category?: string;
          description?: string | null;
          max_rate?: number;
          billed_rate?: number;
          rate_offset?: number | null;
          sleepover?: boolean | null;
          public_holiday?: boolean | null;
          time_from?: string | null;
          time_to?: string | null;
        };
      };
      carers: {
        Row: {
          id: number;
          first_name: string;
          last_name: string;
          address: string;
          phone_number: string;
          email: string;
          abn: string;
          account_name: string;
          bsb: string;
          account_number: string;
          logo_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          first_name: string;
          last_name: string;
          address: string;
          phone_number: string;
          email: string;
          abn: string;
          account_name: string;
          bsb: string;
          account_number: string;
          logo_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          first_name?: string;
          last_name?: string;
          address?: string;
          phone_number?: string;
          email?: string;
          abn?: string;
          account_name?: string;
          bsb?: string;
          account_number?: string;
          logo_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Functions: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
};