-- CodeLens database schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Enable pgvector only if you plan to add real embeddings later; the
-- embedding column below is optional and unused by keyword-based retrieval.
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  name text,
  email text not null,
  avatar_url text,
  github_access_token text,          -- encrypted at rest by Supabase; never selected to the client
  github_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- repositories
-- ============================================================
create table if not exists repositories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  github_repo_id bigint not null,
  name text not null,
  full_name text not null,
  description text,
  owner text not null,
  default_branch text not null default 'main',
  language text,
  github_url text not null,
  is_private boolean not null default false,
  stars integer not null default 0,
  updated_at_github timestamptz,
  analyzed boolean not null default false,
  analysis_status text not null default 'idle'
    check (analysis_status in ('idle', 'pending', 'analyzing', 'complete', 'failed')),
  analysis_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, github_repo_id)
);

create index if not exists idx_repositories_user_id on repositories (user_id);

-- ============================================================
-- repository_files
-- ============================================================
create table if not exists repository_files (
  id uuid primary key default uuid_generate_v4(),
  repository_id uuid not null references repositories (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  extension text,
  language text,
  file_size integer not null default 0,
  content text,                       -- null for large/binary files that were skipped
  is_important boolean not null default false,
  created_at timestamptz not null default now(),
  unique (repository_id, file_path)
);

create index if not exists idx_repository_files_repo_id on repository_files (repository_id);
create index if not exists idx_repository_files_important on repository_files (repository_id, is_important);

-- ============================================================
-- dependencies
-- ============================================================
create table if not exists dependencies (
  id uuid primary key default uuid_generate_v4(),
  repository_id uuid not null references repositories (id) on delete cascade,
  name text not null,
  version text not null,
  dependency_type text not null check (dependency_type in ('production', 'development')),
  source_file text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dependencies_repo_id on dependencies (repository_id);

-- ============================================================
-- code_chunks (retrieval unit for RAG)
-- ============================================================
create table if not exists code_chunks (
  id uuid primary key default uuid_generate_v4(),
  repository_id uuid not null references repositories (id) on delete cascade,
  file_id uuid not null references repository_files (id) on delete cascade,
  chunk_text text not null,
  start_line integer not null,
  end_line integer not null,
  symbol_name text,
  language text,
  metadata jsonb,
  embedding vector(1536),             -- populated only if/when embeddings are added
  created_at timestamptz not null default now()
);

create index if not exists idx_code_chunks_repo_id on code_chunks (repository_id);
create index if not exists idx_code_chunks_file_id on code_chunks (file_id);
-- Keyword search support (used by the current retrieval implementation):
create index if not exists idx_code_chunks_text_search
  on code_chunks using gin (to_tsvector('english', chunk_text));

-- ============================================================
-- analyses (one AI-generated overview per repository)
-- ============================================================
create table if not exists analyses (
  id uuid primary key default uuid_generate_v4(),
  repository_id uuid not null references repositories (id) on delete cascade unique,
  project_overview text not null,
  technology_stack jsonb not null default '{}'::jsonb,
  architecture text not null,
  authentication text not null,
  database_information text not null,
  important_files jsonb not null default '[]'::jsonb,
  api_information jsonb not null default '[]'::jsonb,
  dependencies_summary text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- architecture_components
-- ============================================================
create table if not exists architecture_components (
  id uuid primary key default uuid_generate_v4(),
  repository_id uuid not null references repositories (id) on delete cascade,
  component_name text not null,
  component_type text not null
    check (component_type in ('frontend', 'backend', 'database', 'external-api', 'auth', 'ai')),
  description text not null,
  related_files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_architecture_components_repo_id on architecture_components (repository_id);

-- ============================================================
-- chat_sessions / chat_messages
-- ============================================================
create table if not exists chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  repository_id uuid not null references repositories (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_id on chat_sessions (user_id);
create index if not exists idx_chat_sessions_repo_id on chat_sessions (repository_id);

create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_id on chat_messages (session_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute procedure set_updated_at();

drop trigger if exists trg_repositories_updated_at on repositories;
create trigger trg_repositories_updated_at before update on repositories
  for each row execute procedure set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table repositories enable row level security;
alter table repository_files enable row level security;
alter table dependencies enable row level security;
alter table code_chunks enable row level security;
alter table analyses enable row level security;
alter table architecture_components enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- profiles: a user can only read/write their own profile
create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id);

-- repositories: a user can only see/manage their own repositories
create policy "repositories_select_own" on repositories for select using (auth.uid() = user_id);
create policy "repositories_insert_own" on repositories for insert with check (auth.uid() = user_id);
create policy "repositories_update_own" on repositories for update using (auth.uid() = user_id);
create policy "repositories_delete_own" on repositories for delete using (auth.uid() = user_id);

-- repository_files: only accessible via a repository the user owns
create policy "repository_files_select_own" on repository_files for select
  using (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));
create policy "repository_files_insert_own" on repository_files for insert
  with check (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));

-- dependencies
create policy "dependencies_select_own" on dependencies for select
  using (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));
create policy "dependencies_insert_own" on dependencies for insert
  with check (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));

-- code_chunks
create policy "code_chunks_select_own" on code_chunks for select
  using (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));
create policy "code_chunks_insert_own" on code_chunks for insert
  with check (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));

-- analyses
create policy "analyses_select_own" on analyses for select
  using (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));
create policy "analyses_insert_own" on analyses for insert
  with check (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));

-- architecture_components
create policy "architecture_components_select_own" on architecture_components for select
  using (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));
create policy "architecture_components_insert_own" on architecture_components for insert
  with check (exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid()));

-- chat_sessions
create policy "chat_sessions_select_own" on chat_sessions for select using (auth.uid() = user_id);
create policy "chat_sessions_insert_own" on chat_sessions for insert with check (auth.uid() = user_id);
create policy "chat_sessions_delete_own" on chat_sessions for delete using (auth.uid() = user_id);

-- chat_messages: only accessible via a session the user owns
create policy "chat_messages_select_own" on chat_messages for select
  using (exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "chat_messages_insert_own" on chat_messages for insert
  with check (exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'user_name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
