-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- GROUPS
-- ============================================================
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now(),
  owner_id uuid not null references auth.users on delete cascade
);

alter table groups enable row level security;

-- NOTE: groups RLS policies that reference group_members are defined
-- after the group_members table below.

create policy "Authenticated users can create groups"
  on groups for insert with check (auth.uid() = owner_id);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
create table group_members (
  group_id uuid references groups on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table group_members enable row level security;

create policy "Members can view their group's members"
  on group_members for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Users can join groups (insert own record)"
  on group_members for insert with check (auth.uid() = user_id);

create policy "Admins can manage group members"
  on group_members for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
    )
  );

-- Deferred groups policies (require group_members to exist)
create policy "Group members can view their groups"
  on groups for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group admins can update their groups"
  on groups for update using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
    )
  );

-- ============================================================
-- INVITE TOKENS
-- ============================================================
create table invite_tokens (
  token text primary key default encode(gen_random_bytes(24), 'base64url'),
  group_id uuid not null references groups on delete cascade,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days'),
  used_count int default 0
);

alter table invite_tokens enable row level security;

create policy "Anyone can read valid invite tokens"
  on invite_tokens for select using (expires_at > now());

create policy "Group admins can create invite tokens"
  on invite_tokens for insert with check (
    exists (
      select 1 from group_members
      where group_members.group_id = invite_tokens.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
    )
  );

-- ============================================================
-- EVENTS
-- ============================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  title text not null,
  description text,
  coordinator_id uuid not null references auth.users on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'polling', 'confirmed', 'past')),
  confirmed_date date,
  created_at timestamptz default now()
);

alter table events enable row level security;

create policy "Group members can view events"
  on events for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = events.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can create events"
  on events for insert with check (
    auth.uid() = coordinator_id
    and exists (
      select 1 from group_members
      where group_members.group_id = events.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Coordinator or admin can update events"
  on events for update using (
    auth.uid() = coordinator_id
    or exists (
      select 1 from group_members
      where group_members.group_id = events.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
    )
  );

-- ============================================================
-- EVENT DATES
-- ============================================================
create table event_dates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  date date not null
);

alter table event_dates enable row level security;

create policy "Group members can view event dates"
  on event_dates for select using (
    exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = event_dates.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Coordinator can manage event dates"
  on event_dates for insert with check (
    exists (
      select 1 from events
      where events.id = event_dates.event_id
      and events.coordinator_id = auth.uid()
    )
  );

create policy "Coordinator can delete event dates"
  on event_dates for delete using (
    exists (
      select 1 from events
      where events.id = event_dates.event_id
      and events.coordinator_id = auth.uid()
    )
  );

-- ============================================================
-- DATE VOTES
-- ============================================================
create table date_votes (
  event_id uuid not null references events on delete cascade,
  date_id uuid not null references event_dates on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  availability text not null check (availability in ('yes', 'maybe', 'no')),
  primary key (date_id, user_id)
);

alter table date_votes enable row level security;

create policy "Group members can view votes"
  on date_votes for select using (
    exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = date_votes.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Members can upsert own votes"
  on date_votes for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = date_votes.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Members can update own votes"
  on date_votes for update using (auth.uid() = user_id);

create policy "Members can delete own votes"
  on date_votes for delete using (auth.uid() = user_id);

-- ============================================================
-- ACTIVITY SUGGESTIONS
-- ============================================================
create table activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  url text,
  created_at timestamptz default now()
);

alter table activity_suggestions enable row level security;

create policy "Group members can view activity suggestions"
  on activity_suggestions for select using (
    exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = activity_suggestions.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can add suggestions"
  on activity_suggestions for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = activity_suggestions.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can delete own suggestions"
  on activity_suggestions for delete using (auth.uid() = user_id);

-- ============================================================
-- ACTIVITY VOTES
-- ============================================================
create table activity_votes (
  suggestion_id uuid not null references activity_suggestions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  primary key (suggestion_id, user_id)
);

alter table activity_votes enable row level security;

create policy "Group members can view activity votes"
  on activity_votes for select using (
    exists (
      select 1 from activity_suggestions
      join events on events.id = activity_suggestions.event_id
      join group_members on group_members.group_id = events.group_id
      where activity_suggestions.id = activity_votes.suggestion_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Members can upsert own activity votes"
  on activity_votes for insert with check (auth.uid() = user_id);

create policy "Members can update own activity votes"
  on activity_votes for update using (auth.uid() = user_id);

create policy "Members can delete own activity votes"
  on activity_votes for delete using (auth.uid() = user_id);

-- ============================================================
-- MENU ITEMS
-- ============================================================
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('starter', 'main', 'dessert', 'drink')),
  created_at timestamptz default now()
);

alter table menu_items enable row level security;

create policy "Group members can view menu items"
  on menu_items for select using (
    exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = menu_items.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can add menu items"
  on menu_items for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from events
      join group_members on group_members.group_id = events.group_id
      where events.id = menu_items.event_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can delete own menu items"
  on menu_items for delete using (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  event_id uuid references events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Group members can view messages"
  on messages for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = messages.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can send messages"
  on messages for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from group_members
      where group_members.group_id = messages.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can delete own messages"
  on messages for delete using (auth.uid() = user_id);

-- Enable realtime for messages
alter publication supabase_realtime add table messages;
