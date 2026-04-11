-- Enable extensions
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  website_url text,
  company_name text,
  company_description text,
  industry text,
  employee_count text,
  headquarters text,
  product_name text,
  product_description text,
  target_customers text,
  icp_description text,
  competitors text[],
  unique_value_proposition text,
  writing_style text check (writing_style in ('professional', 'casual', 'bold', 'friendly', 'concise', 'storytelling', 'data-driven')),
  dos text[],
  donts text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Sheets table
create table if not exists sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  prompt text,
  status text default 'idle' check (status in ('idle', 'running', 'completed', 'error')),
  source_type text check (source_type in ('cold', 'warm')),
  column_config jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Leads table
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references sheets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text,
  domain text,
  description text,
  industry text,
  employee_count text,
  location text,
  funding_stage text,
  funding_amount bigint,
  founded_year integer,
  linkedin_url text,
  website_url text,
  source text,
  raw_data jsonb default '{}'::jsonb,
  enrichment_data jsonb default '{}'::jsonb,
  score integer,
  score_reasoning text,
  score_breakdown jsonb default '{}'::jsonb,
  status text default 'new' check (status in ('new', 'enriching', 'enriched', 'enrichment_failed', 'exported', 'contacted')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- User integrations table
create table if not exists user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  integration_id text not null,
  auth_type text not null check (auth_type in ('api-key', 'oauth')),
  api_key text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  connected_at timestamptz default now() not null,
  unique(user_id, integration_id)
);

-- Scoring criteria table
create table if not exists scoring_criteria (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references sheets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null
);

-- API cost events table
create table if not exists api_cost_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sheet_id uuid references sheets(id) on delete set null,
  provider text not null,
  model text,
  operation text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  estimated_cost_usd numeric(10, 6) default 0,
  created_at timestamptz default now() not null
);

-- Enable RLS on all tables
alter table projects enable row level security;
alter table sheets enable row level security;
alter table leads enable row level security;
alter table user_integrations enable row level security;
alter table scoring_criteria enable row level security;
alter table api_cost_events enable row level security;

-- RLS Policies for projects
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- RLS Policies for sheets
create policy "Users can view their own sheets"
  on sheets for select
  using (auth.uid() = user_id);

create policy "Users can create sheets"
  on sheets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sheets"
  on sheets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sheets"
  on sheets for delete
  using (auth.uid() = user_id);

-- RLS Policies for leads
create policy "Users can view their own leads"
  on leads for select
  using (auth.uid() = user_id);

create policy "Users can create leads"
  on leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own leads"
  on leads for update
  using (auth.uid() = user_id);

create policy "Users can delete their own leads"
  on leads for delete
  using (auth.uid() = user_id);

-- RLS Policies for user_integrations
create policy "Users can view their own integrations"
  on user_integrations for select
  using (auth.uid() = user_id);

create policy "Users can create integrations"
  on user_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own integrations"
  on user_integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own integrations"
  on user_integrations for delete
  using (auth.uid() = user_id);

-- RLS Policies for scoring_criteria
create policy "Users can view their own scoring criteria"
  on scoring_criteria for select
  using (auth.uid() = user_id);

create policy "Users can create scoring criteria"
  on scoring_criteria for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own scoring criteria"
  on scoring_criteria for update
  using (auth.uid() = user_id);

create policy "Users can delete their own scoring criteria"
  on scoring_criteria for delete
  using (auth.uid() = user_id);

-- RLS Policies for api_cost_events
create policy "Users can view their own cost events"
  on api_cost_events for select
  using (auth.uid() = user_id);

create policy "Users can create cost events"
  on api_cost_events for insert
  with check (auth.uid() = user_id);

-- Updated_at triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_projects_updated_at before update on projects
  for each row execute function update_updated_at_column();

create trigger update_sheets_updated_at before update on sheets
  for each row execute function update_updated_at_column();

create trigger update_leads_updated_at before update on leads
  for each row execute function update_updated_at_column();

-- Create indexes for common queries
create index idx_projects_user_id on projects(user_id);
create index idx_sheets_user_id on sheets(user_id);
create index idx_sheets_project_id on sheets(project_id);
create index idx_leads_user_id on leads(user_id);
create index idx_leads_sheet_id on leads(sheet_id);
create index idx_user_integrations_user_id on user_integrations(user_id);
create index idx_user_integrations_integration_id on user_integrations(integration_id);
create index idx_scoring_criteria_sheet_id on scoring_criteria(sheet_id);
create index idx_api_cost_events_user_id on api_cost_events(user_id);
