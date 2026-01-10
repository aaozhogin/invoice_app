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
          // weekday filtering columns
          weekday: boolean | null;
          saturday: boolean | null;
          sunday: boolean | null;
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
          // weekday filtering columns
          weekday?: boolean | null;
          saturday?: boolean | null;
          sunday?: boolean | null;
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
          // weekday filtering columns
          weekday?: boolean | null;
          saturday?: boolean | null;
          sunday?: boolean | null;
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
      clients: {
        Row: {
          id: number;
          first_name: string;
          last_name: string;
          ndis_number: number;
          address: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: number;
          first_name: string;
          last_name: string;
          ndis_number: number;
          address: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          first_name?: string;
          last_name?: string;
          ndis_number?: number;
          address?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      shifts: {
        Row: {
          id: number;
          time_from: string;
          time_to: string;
          carer_id: number;
          line_item_code_id: number;
          cost: number;
          shift_date: string;
          category?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: number;
          time_from: string;
          time_to: string;
          carer_id: number;
          line_item_code_id: number;
          cost: number;
          shift_date: string;
          category?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          time_from?: string;
          time_to?: string;
          carer_id?: number;
          line_item_code_id?: number;
          cost?: number;
          shift_date?: string;
          category?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      line_item_categories: {
        Row: {
          id: number;
          name: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      saved_calendars: {
        Row: {
          id: string;
          name: string;
          date_from: string | null;
          date_to: string | null;
          client_id: number | null;
          config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date_from?: string | null;
          date_to?: string | null;
          client_id?: number | null;
          config: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date_from?: string | null;
          date_to?: string | null;
          client_id?: number | null;
          config?: Json;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          carer_id: number;
          client_id: number;
          date_from: string;
          date_to: string;
          invoice_date: string;
          file_name: string;
          file_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          carer_id: number;
          client_id: number;
          date_from: string;
          date_to: string;
          invoice_date: string;
          file_name: string;
          file_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          carer_id?: number;
          client_id?: number;
          date_from?: string;
          date_to?: string;
          invoice_date?: string;
          file_name?: string;
          file_path?: string;
          created_at?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenient type exports
export type LineItem = Database['public']['Tables']['line_items']['Row'];
export type Carer = Database['public']['Tables']['carers']['Row'];
export type Shift = Database['public']['Tables']['shifts']['Row'];
export type LineItemCategory = Database['public']['Tables']['line_item_categories']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];