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
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          website_url: string | null;
          company_name: string | null;
          company_description: string | null;
          industry: string | null;
          employee_count: string | null;
          headquarters: string | null;
          product_name: string | null;
          product_description: string | null;
          target_customers: string | null;
          icp_description: string | null;
          competitors: string[] | null;
          unique_value_proposition: string | null;
          writing_style:
            | "professional"
            | "casual"
            | "bold"
            | "friendly"
            | "concise"
            | "storytelling"
            | "data-driven"
            | null;
          dos: string[] | null;
          donts: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          website_url?: string | null;
          company_name?: string | null;
          company_description?: string | null;
          industry?: string | null;
          employee_count?: string | null;
          headquarters?: string | null;
          product_name?: string | null;
          product_description?: string | null;
          target_customers?: string | null;
          icp_description?: string | null;
          competitors?: string[] | null;
          unique_value_proposition?: string | null;
          writing_style?:
            | "professional"
            | "casual"
            | "bold"
            | "friendly"
            | "concise"
            | "storytelling"
            | "data-driven"
            | null;
          dos?: string[] | null;
          donts?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          website_url?: string | null;
          company_name?: string | null;
          company_description?: string | null;
          industry?: string | null;
          employee_count?: string | null;
          headquarters?: string | null;
          product_name?: string | null;
          product_description?: string | null;
          target_customers?: string | null;
          icp_description?: string | null;
          competitors?: string[] | null;
          unique_value_proposition?: string | null;
          writing_style?:
            | "professional"
            | "casual"
            | "bold"
            | "friendly"
            | "concise"
            | "storytelling"
            | "data-driven"
            | null;
          dos?: string[] | null;
          donts?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sheets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          prompt: string | null;
          status: "idle" | "running" | "completed" | "error";
          source_type: "cold" | "warm" | null;
          column_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          prompt?: string | null;
          status?: "idle" | "running" | "completed" | "error";
          source_type?: "cold" | "warm" | null;
          column_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          prompt?: string | null;
          status?: "idle" | "running" | "completed" | "error";
          source_type?: "cold" | "warm" | null;
          column_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          sheet_id: string;
          user_id: string;
          company_name: string | null;
          domain: string | null;
          description: string | null;
          industry: string | null;
          employee_count: string | null;
          location: string | null;
          funding_stage: string | null;
          funding_amount: number | null;
          founded_year: number | null;
          linkedin_url: string | null;
          website_url: string | null;
          source: string | null;
          raw_data: Json;
          enrichment_data: Json;
          score: number | null;
          score_reasoning: string | null;
          score_breakdown: Json;
          status:
            | "new"
            | "enriching"
            | "enriched"
            | "enrichment_failed"
            | "exported"
            | "contacted";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          user_id: string;
          company_name?: string | null;
          domain?: string | null;
          description?: string | null;
          industry?: string | null;
          employee_count?: string | null;
          location?: string | null;
          funding_stage?: string | null;
          funding_amount?: number | null;
          founded_year?: number | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          source?: string | null;
          raw_data?: Json;
          enrichment_data?: Json;
          score?: number | null;
          score_reasoning?: string | null;
          score_breakdown?: Json;
          status?:
            | "new"
            | "enriching"
            | "enriched"
            | "enrichment_failed"
            | "exported"
            | "contacted";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          user_id?: string;
          company_name?: string | null;
          domain?: string | null;
          description?: string | null;
          industry?: string | null;
          employee_count?: string | null;
          location?: string | null;
          funding_stage?: string | null;
          funding_amount?: number | null;
          founded_year?: number | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          source?: string | null;
          raw_data?: Json;
          enrichment_data?: Json;
          score?: number | null;
          score_reasoning?: string | null;
          score_breakdown?: Json;
          status?:
            | "new"
            | "enriching"
            | "enriched"
            | "enrichment_failed"
            | "exported"
            | "contacted";
          created_at?: string;
          updated_at?: string;
        };
      };
      user_integrations: {
        Row: {
          id: string;
          user_id: string;
          integration_id: string;
          auth_type: "api-key" | "oauth";
          api_key: string | null;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          metadata: Json;
          connected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          integration_id: string;
          auth_type: "api-key" | "oauth";
          api_key?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          metadata?: Json;
          connected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          integration_id?: string;
          auth_type?: "api-key" | "oauth";
          api_key?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          metadata?: Json;
          connected_at?: string;
        };
      };
      scoring_criteria: {
        Row: {
          id: string;
          sheet_id: string;
          user_id: string;
          criteria: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          user_id: string;
          criteria?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          user_id?: string;
          criteria?: Json;
          created_at?: string;
        };
      };
      api_cost_events: {
        Row: {
          id: string;
          user_id: string;
          sheet_id: string | null;
          provider: string;
          model: string | null;
          operation: string;
          input_tokens: number;
          output_tokens: number;
          estimated_cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sheet_id?: string | null;
          provider: string;
          model?: string | null;
          operation: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sheet_id?: string | null;
          provider?: string;
          model?: string | null;
          operation?: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost_usd?: number;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
