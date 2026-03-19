create table if not exists public.market_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  atlas_credits_balance numeric(18,2) not null default 10000,
  total_invested_credits numeric(18,2) not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.market_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('song', 'artist', 'album')),
  entity_id text not null,
  entity_name text not null,
  entity_subtitle text,
  entity_href text not null,
  artwork_url text,
  shares numeric(18,6) not null default 0,
  average_cost_per_share numeric(18,6) not null default 0,
  realized_profit_loss numeric(18,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.market_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('song', 'artist', 'album')),
  entity_id text not null,
  entity_name text not null,
  entity_subtitle text,
  entity_href text not null,
  artwork_url text,
  side text not null check (side in ('buy', 'sell')),
  shares numeric(18,6) not null,
  price_per_share numeric(18,6) not null,
  total_amount numeric(18,2) not null,
  realized_profit_loss numeric(18,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.market_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  badge_label text not null,
  badge_description text not null,
  awarded_at timestamptz not null default timezone('utc', now()),
  unique (user_id, badge_key)
);

create index if not exists market_positions_user_idx
on public.market_positions (user_id, updated_at desc);

create index if not exists market_positions_entity_idx
on public.market_positions (entity_type, entity_id);

create index if not exists market_transactions_user_idx
on public.market_transactions (user_id, created_at desc);

create index if not exists market_transactions_entity_idx
on public.market_transactions (entity_type, entity_id, created_at desc);

create index if not exists market_badges_user_idx
on public.market_badges (user_id, awarded_at desc);

create or replace function public.touch_market_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists market_accounts_touch_updated_at on public.market_accounts;
create trigger market_accounts_touch_updated_at
before update on public.market_accounts
for each row execute function public.touch_market_updated_at();

drop trigger if exists market_positions_touch_updated_at on public.market_positions;
create trigger market_positions_touch_updated_at
before update on public.market_positions
for each row execute function public.touch_market_updated_at();

alter table public.market_accounts enable row level security;
alter table public.market_positions enable row level security;
alter table public.market_transactions enable row level security;
alter table public.market_badges enable row level security;

drop policy if exists "Users can read public market accounts" on public.market_accounts;
create policy "Users can read public market accounts"
on public.market_accounts
for select
using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can manage own market accounts" on public.market_accounts;
create policy "Users can manage own market accounts"
on public.market_accounts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read public market positions" on public.market_positions;
create policy "Users can read public market positions"
on public.market_positions
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.market_accounts a
    where a.user_id = market_positions.user_id
      and a.is_public = true
  )
);

drop policy if exists "Users can manage own market positions" on public.market_positions;
create policy "Users can manage own market positions"
on public.market_positions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read public market transactions" on public.market_transactions;
create policy "Users can read public market transactions"
on public.market_transactions
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.market_accounts a
    where a.user_id = market_transactions.user_id
      and a.is_public = true
  )
);

drop policy if exists "Users can manage own market transactions" on public.market_transactions;
create policy "Users can manage own market transactions"
on public.market_transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read public market badges" on public.market_badges;
create policy "Users can read public market badges"
on public.market_badges
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.market_accounts a
    where a.user_id = market_badges.user_id
      and a.is_public = true
  )
);

drop policy if exists "Users can manage own market badges" on public.market_badges;
create policy "Users can manage own market badges"
on public.market_badges
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
