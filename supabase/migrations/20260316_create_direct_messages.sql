create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_low_id uuid not null references auth.users(id) on delete cascade,
  participant_high_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  latest_message_at timestamptz not null default timezone('utc', now()),
  constraint direct_conversations_no_self check (participant_low_id <> participant_high_id),
  constraint direct_conversations_sorted check (participant_low_id < participant_high_id),
  unique (participant_low_id, participant_high_id)
);

create index if not exists direct_conversations_latest_message_at_idx
on public.direct_conversations (latest_message_at desc);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists direct_messages_conversation_id_created_at_idx
on public.direct_messages (conversation_id, created_at asc);

create or replace function public.are_users_mutual_followers(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.follows
    where follower_id = first_user and following_id = second_user
  )
  and exists (
    select 1
    from public.follows
    where follower_id = second_user and following_id = first_user
  );
$$;

create or replace function public.is_direct_conversation_participant(conversation_uuid uuid, current_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.direct_conversations
    where id = conversation_uuid
      and (participant_low_id = current_user or participant_high_id = current_user)
  );
$$;

create or replace function public.can_send_direct_message(conversation_uuid uuid, current_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.direct_conversations
    where id = conversation_uuid
      and (
        (participant_low_id = current_user and public.are_users_mutual_followers(participant_low_id, participant_high_id))
        or
        (participant_high_id = current_user and public.are_users_mutual_followers(participant_low_id, participant_high_id))
      )
  );
$$;

create or replace function public.touch_direct_conversation_latest_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.direct_conversations
  set latest_message_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists on_direct_message_created on public.direct_messages;

create trigger on_direct_message_created
after insert on public.direct_messages
for each row execute procedure public.touch_direct_conversation_latest_message();

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns public.direct_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  low_user uuid;
  high_user uuid;
  conversation public.direct_conversations;
begin
  if current_user is null then
    raise exception 'You must be signed in to message people.';
  end if;

  if other_user_id is null then
    raise exception 'A recipient is required.';
  end if;

  if current_user = other_user_id then
    raise exception 'You cannot message yourself.';
  end if;

  if not public.are_users_mutual_followers(current_user, other_user_id) then
    raise exception 'You can only message users who mutually follow you.';
  end if;

  if current_user < other_user_id then
    low_user := current_user;
    high_user := other_user_id;
  else
    low_user := other_user_id;
    high_user := current_user;
  end if;

  insert into public.direct_conversations (participant_low_id, participant_high_id)
  values (low_user, high_user)
  on conflict (participant_low_id, participant_high_id)
  do update set latest_message_at = public.direct_conversations.latest_message_at
  returning * into conversation;

  return conversation;
end;
$$;

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Participants can view direct conversations" on public.direct_conversations;
create policy "Participants can view direct conversations"
on public.direct_conversations
for select
to authenticated
using (public.is_direct_conversation_participant(id));

drop policy if exists "Participants can view direct messages" on public.direct_messages;
create policy "Participants can view direct messages"
on public.direct_messages
for select
to authenticated
using (public.is_direct_conversation_participant(conversation_id));

drop policy if exists "Participants can send direct messages while mutually following" on public.direct_messages;
create policy "Participants can send direct messages while mutually following"
on public.direct_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_direct_conversation_participant(conversation_id)
  and public.can_send_direct_message(conversation_id)
);
