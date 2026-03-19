create table if not exists public.taste_groups (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 3),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists taste_groups_creator_idx
on public.taste_groups (created_by_user_id, updated_at desc);

create table if not exists public.taste_group_members (
  group_id uuid not null references public.taste_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);

create index if not exists taste_group_members_user_idx
on public.taste_group_members (user_id, joined_at desc);

create table if not exists public.taste_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.taste_groups(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  unique (group_id, invited_user_id)
);

create index if not exists taste_group_invites_user_idx
on public.taste_group_invites (invited_user_id, status, created_at desc);

create or replace function public.touch_taste_group_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists taste_groups_touch_updated_at on public.taste_groups;
create trigger taste_groups_touch_updated_at
before update on public.taste_groups
for each row execute function public.touch_taste_group_updated_at();

create or replace function public.touch_group_when_member_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.taste_groups
  set updated_at = timezone('utc', now())
  where id = coalesce(new.group_id, old.group_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists taste_group_members_touch_group on public.taste_group_members;
create trigger taste_group_members_touch_group
after insert or update or delete on public.taste_group_members
for each row execute procedure public.touch_group_when_member_changes();

drop trigger if exists taste_group_invites_touch_group on public.taste_group_invites;
create trigger taste_group_invites_touch_group
after insert or update or delete on public.taste_group_invites
for each row execute procedure public.touch_group_when_member_changes();

alter table public.taste_groups enable row level security;
alter table public.taste_group_members enable row level security;
alter table public.taste_group_invites enable row level security;

drop policy if exists "Members can view taste groups" on public.taste_groups;
create policy "Members can view taste groups"
on public.taste_groups
for select
to authenticated
using (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_groups.id
      and member.user_id = auth.uid()
  )
);

drop policy if exists "Authenticated users can create taste groups" on public.taste_groups;
create policy "Authenticated users can create taste groups"
on public.taste_groups
for insert
to authenticated
with check (auth.uid() = created_by_user_id);

drop policy if exists "Owners can update taste groups" on public.taste_groups;
create policy "Owners can update taste groups"
on public.taste_groups
for update
to authenticated
using (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_groups.id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_groups.id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  )
);

drop policy if exists "Owners can delete taste groups" on public.taste_groups;
create policy "Owners can delete taste groups"
on public.taste_groups
for delete
to authenticated
using (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_groups.id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  )
);

drop policy if exists "Members can view taste group members" on public.taste_group_members;
create policy "Members can view taste group members"
on public.taste_group_members
for select
to authenticated
using (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_group_members.group_id
      and member.user_id = auth.uid()
  )
);

drop policy if exists "Owners can manage taste group members" on public.taste_group_members;
create policy "Owners can manage taste group members"
on public.taste_group_members
for all
to authenticated
using (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_group_members.group_id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_group_members.group_id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  )
);

drop policy if exists "Relevant users can view taste group invites" on public.taste_group_invites;
create policy "Relevant users can view taste group invites"
on public.taste_group_invites
for select
to authenticated
using (
  auth.uid() in (invited_by_user_id, invited_user_id)
  or exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_group_invites.group_id
      and member.user_id = auth.uid()
  )
);

drop policy if exists "Owners can create taste group invites" on public.taste_group_invites;
create policy "Owners can create taste group invites"
on public.taste_group_invites
for insert
to authenticated
with check (
  auth.uid() = invited_by_user_id
  and exists (
    select 1
    from public.taste_group_members member
    where member.group_id = taste_group_invites.group_id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  )
);

drop policy if exists "Relevant users can update taste group invites" on public.taste_group_invites;
create policy "Relevant users can update taste group invites"
on public.taste_group_invites
for update
to authenticated
using (
  auth.uid() in (invited_by_user_id, invited_user_id)
)
with check (
  auth.uid() in (invited_by_user_id, invited_user_id)
);
