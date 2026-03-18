create table if not exists public.music_platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  connection_type text not null default 'import',
  status text not null default 'connected',
  external_account_id text not null default '',
  external_account_label text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listening_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.music_platform_connections(id) on delete set null,
  platform text not null,
  source_label text,
  imported_events integer not null default 0,
  imported_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists music_platform_connections_user_idx
on public.music_platform_connections (user_id, platform);

create unique index if not exists music_platform_connections_identity_idx
on public.music_platform_connections (
  user_id,
  platform,
  connection_type,
  external_account_id
);

create index if not exists listening_import_batches_user_idx
on public.listening_import_batches (user_id, imported_at desc);

alter table public.music_platform_connections enable row level security;
alter table public.listening_import_batches enable row level security;

drop policy if exists "Users can view their own music platform connections" on public.music_platform_connections;
create policy "Users can view their own music platform connections"
on public.music_platform_connections
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own music platform connections" on public.music_platform_connections;
create policy "Users can insert their own music platform connections"
on public.music_platform_connections
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own music platform connections" on public.music_platform_connections;
create policy "Users can update their own music platform connections"
on public.music_platform_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own music platform connections" on public.music_platform_connections;
create policy "Users can delete their own music platform connections"
on public.music_platform_connections
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own listening import batches" on public.listening_import_batches;
create policy "Users can view their own listening import batches"
on public.listening_import_batches
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own listening import batches" on public.listening_import_batches;
create policy "Users can insert their own listening import batches"
on public.listening_import_batches
for insert
to authenticated
with check (auth.uid() = user_id);
