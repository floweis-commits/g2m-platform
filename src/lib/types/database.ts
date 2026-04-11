export interface Project {
  id: string;
  user_id: string;
  name: string;
  website_url: string | null;
  company_data: Record<string, unknown> | null;
  product_data: Record<string, unknown> | null;
  writing_style: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type ProjectUpdate = Partial<ProjectInsert>;

export interface Sheet {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  query: string | null;
  status: "draft" | "sourcing" | "completed";
  created_at: string;
  updated_at: string;
}

export type SheetInsert = Omit<Sheet, "id" | "created_at" | "updated_at">;
export type SheetUpdate = Partial<SheetInsert>;

export interface Lead {
  id: string;
  sheet_id: string;
  user_id: string;
  data: Record<string, unknown>;
  score: number | null;
  score_reasoning: string | null;
  row_index: number | null;
  created_at: string;
}

export type LeadInsert = Omit<Lead, "id" | "created_at">;
export type LeadUpdate = Partial<LeadInsert>;

export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ConnectedAccountInsert = Omit<
  ConnectedAccount,
  "id" | "created_at"
>;
export type ConnectedAccountUpdate = Partial<ConnectedAccountInsert>;

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

export type UserApiKeyInsert = Omit<UserApiKey, "id" | "created_at">;
export type UserApiKeyUpdate = Partial<UserApiKeyInsert>;

export interface CreditEvent {
  id: string;
  user_id: string;
  provider: string;
  operation: string;
  cost_usd: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type CreditEventInsert = Omit<CreditEvent, "id" | "created_at">;
