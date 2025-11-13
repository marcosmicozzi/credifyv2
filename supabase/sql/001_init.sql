-- CredifyV2 baseline schema migration
-- Captures current Supabase schema including tables, views, policies, and triggers.

-- =====================================================
-- USERS
-- =====================================================
create table if not exists users (
  u_id uuid primary key default gen_random_uuid(),
  u_email text unique not null,
  u_name text,
  u_password text,
  u_bio text,
  profile_image_url text,
  u_created_at timestamptz not null default now()
);

-- =====================================================
-- PROJECTS
-- =====================================================
create table if not exists projects (
  p_id text primary key,
  p_title text,
  p_description text,
  p_link text not null,
  p_platform text not null default 'youtube',
  p_channel text,
  p_posted_at timestamptz,
  p_thumbnail_url text,
  p_created_at timestamptz not null default now()
);

-- =====================================================
-- ROLES
-- =====================================================
create table if not exists roles (
  role_id serial primary key,
  role_name text unique not null,
  category text
);

-- =====================================================
-- USER_PROJECTS
-- =====================================================
create table if not exists user_projects (
  up_id uuid primary key default gen_random_uuid(),
  u_id uuid references users(u_id) on delete cascade,
  p_id text references projects(p_id) on delete cascade,
  role_id int references roles(role_id) on delete set null,
  u_role text,
  created_at timestamptz not null default now()
);

-- =====================================================
-- YOUTUBE_METRICS
-- =====================================================
create table if not exists youtube_metrics (
  id bigserial primary key,
  p_id text references projects(p_id) on delete cascade,
  platform text default 'youtube',
  fetched_at timestamptz not null default now(),
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  engagement_rate numeric,
  unique (p_id, fetched_at)
);

-- =====================================================
-- INSTAGRAM_METRICS
-- =====================================================
create table if not exists instagram_metrics (
  id bigserial primary key,
  p_id text references projects(p_id) on delete cascade,
  platform text default 'instagram',
  fetched_at timestamptz not null default now(),
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  reach bigint,
  save_count bigint,
  engagement_rate numeric,
  unique (p_id, fetched_at)
);

-- =====================================================
-- USER_METRICS
-- =====================================================
create table if not exists user_metrics (
  id bigserial primary key,
  u_id uuid references users(u_id) on delete cascade,
  total_view_count bigint default 0,
  total_like_count bigint default 0,
  total_comment_count bigint default 0,
  total_share_count bigint default 0,
  avg_engagement_rate numeric default 0,
  updated_at timestamptz not null default now()
);

-- =====================================================
-- USER_FOLLOWS
-- =====================================================
create table if not exists user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references users(u_id) on delete cascade,
  followed_id uuid references users(u_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followed_id)
);

create index if not exists idx_user_follows_follower on user_follows (follower_id);
create index if not exists idx_user_follows_followed on user_follows (followed_id);

-- =====================================================
-- USER_TOKENS
-- =====================================================
create table if not exists user_tokens (
  token_id uuid primary key default gen_random_uuid(),
  u_id uuid references users(u_id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok', 'vimeo')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  account_id text,
  account_username text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (u_id, platform)
);

create index if not exists idx_user_tokens_uid_platform on user_tokens (u_id, platform);
create index if not exists idx_user_tokens_account_id on user_tokens (account_id);

-- =====================================================
-- INSTAGRAM_INSIGHTS
-- =====================================================
create table if not exists instagram_insights (
  id bigserial primary key,
  u_id uuid references users(u_id) on delete cascade,
  account_id text,
  metric text not null check (
    metric in ('reach','profile_views','accounts_engaged','follower_count')
  ),
  value numeric,
  end_time timestamptz not null,
  retrieved_at timestamptz not null default now(),
  unique (u_id, account_id, metric, end_time)
);

create index if not exists idx_ig_insights_uid on instagram_insights (u_id);
create index if not exists idx_ig_insights_metric on instagram_insights (metric);
create index if not exists idx_ig_insights_end_time on instagram_insights (end_time);
create index if not exists idx_ig_insights_account on instagram_insights (account_id);

-- =====================================================
-- OAUTH_STATES
-- =====================================================
create table if not exists oauth_states (
  state text primary key,
  u_id uuid references users(u_id) on delete cascade,
  created_at timestamptz default timezone('utc', now()),
  expires_at timestamptz default (timezone('utc', now()) + interval '15 minutes')
);

alter table oauth_states enable row level security;

-- =====================================================
-- USER_SESSION_TOKENS
-- =====================================================
create table if not exists user_session_tokens (
  u_id uuid primary key references users(u_id) on delete cascade,
  refresh_token text not null,
  access_token text,
  updated_at timestamptz default timezone('utc', now())
);

alter table user_session_tokens enable row level security;

-- =====================================================
-- POLICIES (with service_role bypass)
-- =====================================================
drop policy if exists "Users can manage their own oauth states" on oauth_states;
drop policy if exists "Users can manage their own session tokens" on user_session_tokens;

create policy "Users can manage their own oauth states"
  on oauth_states
  for all
  using (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

create policy "Users can manage their own session tokens"
  on user_session_tokens
  for all
  using (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- =====================================================
-- VIEWS
-- =====================================================
create or replace view youtube_latest_metrics as
select distinct on (p_id)
  p_id, platform, view_count, like_count, comment_count, share_count, engagement_rate, fetched_at
from youtube_metrics
order by p_id, fetched_at desc;

create or replace view instagram_latest_metrics as
select distinct on (p_id)
  p_id, platform, view_count, like_count, comment_count, reach, save_count, engagement_rate, fetched_at
from instagram_metrics
order by p_id, fetched_at desc;

create or replace view instagram_account_latest_metrics as
select distinct on (u_id, metric)
  u_id, account_id, metric, value, end_time, retrieved_at
from instagram_insights
order by u_id, metric, end_time desc;

-- =====================================================
-- FUNCTION: update_user_metrics()
-- =====================================================
create or replace function update_user_metrics()
returns trigger as $$
begin
  update user_metrics um
  set
    total_view_count = sub.total_views,
    total_like_count = sub.total_likes,
    total_comment_count = sub.total_comments,
    total_share_count = sub.total_shares,
    avg_engagement_rate = sub.avg_engagement,
    updated_at = now()
  from (
    select
      up.u_id,
      coalesce(sum(all_m.view_count), 0) as total_views,
      coalesce(sum(all_m.like_count), 0) as total_likes,
      coalesce(sum(all_m.comment_count), 0) as total_comments,
      coalesce(sum(all_m.share_count), 0) as total_shares,
      coalesce(avg(all_m.engagement_rate), 0) as avg_engagement
    from user_projects up
    left join (
      select p_id, view_count, like_count, comment_count, share_count, engagement_rate from youtube_metrics
      union all
      select p_id, view_count, like_count, comment_count, null as share_count, engagement_rate from instagram_metrics
    ) all_m on up.p_id = all_m.p_id
    group by up.u_id
  ) as sub
  where um.u_id = sub.u_id;

  insert into user_metrics (u_id, total_view_count, total_like_count, total_comment_count, total_share_count, avg_engagement_rate)
  select
    up.u_id,
    coalesce(sum(all_m.view_count), 0),
    coalesce(sum(all_m.like_count), 0),
    coalesce(sum(all_m.comment_count), 0),
    coalesce(sum(all_m.share_count), 0),
    coalesce(avg(all_m.engagement_rate), 0)
  from user_projects up
  left join (
    select p_id, view_count, like_count, comment_count, share_count, engagement_rate from youtube_metrics
    union all
    select p_id, view_count, like_count, comment_count, null as share_count, engagement_rate from instagram_metrics
  ) all_m on up.p_id = all_m.p_id
  where up.u_id not in (select u_id from user_metrics)
  group by up.u_id;

  return null;
end;
$$ language plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================
drop trigger if exists trg_update_user_metrics_youtube on youtube_metrics;
drop trigger if exists trg_update_user_metrics_instagram on instagram_metrics;

create trigger trg_update_user_metrics_youtube
after insert or update or delete on youtube_metrics
for each statement execute function update_user_metrics();

create trigger trg_update_user_metrics_instagram
after insert or update or delete on instagram_metrics
for each statement execute function update_user_metrics();

-- =====================================================
-- PREPOPULATE DEFAULT ROLES
-- =====================================================
insert into roles (role_name, category) values
  ('Director', 'Direction'),
  ('Creative Director', 'Direction'),
  ('Editor', 'Video'),
  ('Colorist', 'Video'),
  ('Videographer', 'Video'),
  ('DOP', 'Video'),
  ('Producer', 'Production'),
  ('Model', 'Talent'),
  ('Composer', 'Sound'),
  ('Sound Designer', 'Sound'),
  ('Audio Engineer', 'Sound'),
  ('Mixing Engineer', 'Sound'),
  ('Mastering Engineer', 'Sound'),
  ('Other', 'Misc')
on conflict (role_name) do nothing;

-- =====================================================
-- REFRESH SCHEMA + SANITY CHECK
-- =====================================================
select pg_notify('pgrst', 'reload schema');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'oauth_states'
  and column_name = 'expires_at';

