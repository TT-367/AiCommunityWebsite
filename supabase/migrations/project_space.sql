create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('file', 'note', 'link')),
  title text not null,
  content text,
  url text,
  file_name text,
  mime text,
  size integer,
  data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_project_assets_set_updated_at on public.project_assets;
create trigger trg_project_assets_set_updated_at
before update on public.project_assets
for each row
execute function public.set_updated_at();

create table if not exists public.project_workspace_states (
  project_id uuid primary key references public.projects(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_project_workspace_states_set_updated_at on public.project_workspace_states;
create trigger trg_project_workspace_states_set_updated_at
before update on public.project_workspace_states
for each row
execute function public.set_updated_at();

create index if not exists idx_projects_owner_updated on public.projects (owner_id, updated_at desc);
create index if not exists idx_project_assets_project_updated on public.project_assets (project_id, updated_at desc);

alter table public.projects enable row level security;
alter table public.project_assets enable row level security;
alter table public.project_workspace_states enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "project_assets_select_in_own_project" on public.project_assets;
create policy "project_assets_select_in_own_project" on public.project_assets
for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_assets.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_assets_insert_in_own_project" on public.project_assets;
create policy "project_assets_insert_in_own_project" on public.project_assets
for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_assets.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_assets_update_in_own_project" on public.project_assets;
create policy "project_assets_update_in_own_project" on public.project_assets
for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_assets.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_assets.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_assets_delete_in_own_project" on public.project_assets;
create policy "project_assets_delete_in_own_project" on public.project_assets
for delete
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_assets.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_workspace_states_select_own" on public.project_workspace_states;
create policy "project_workspace_states_select_own" on public.project_workspace_states
for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_workspace_states.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_workspace_states_insert_own" on public.project_workspace_states;
create policy "project_workspace_states_insert_own" on public.project_workspace_states
for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_workspace_states.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_workspace_states_update_own" on public.project_workspace_states;
create policy "project_workspace_states_update_own" on public.project_workspace_states
for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_workspace_states.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_workspace_states.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_workspace_states_delete_own" on public.project_workspace_states;
create policy "project_workspace_states_delete_own" on public.project_workspace_states
for delete
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_workspace_states.project_id
      and p.owner_id = auth.uid()
  )
);

