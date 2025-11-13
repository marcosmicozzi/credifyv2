-- Enable Row Level Security across core tables and scope data access per user.

-- USERS
alter table users enable row level security;

drop policy if exists "Users can read their profile" on users;
drop policy if exists "Users can update their profile" on users;

create policy "Users can read their profile"
  on users
  for select
  using (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

create policy "Users can update their profile"
  on users
  for update
  using (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    auth.uid() = u_id
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- USER_PROJECTS
alter table user_projects enable row level security;

drop policy if exists "Users can view their project memberships" on user_projects;

create policy "Users can view their project memberships"
  on user_projects
  for select
  using (
    u_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- PROJECTS
alter table projects enable row level security;

drop policy if exists "Users can read their projects" on projects;

create policy "Users can read their projects"
  on projects
  for select
  using (
    exists (
      select 1
      from user_projects up
      where up.p_id = projects.p_id
        and up.u_id = auth.uid()
    )
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- USER_METRICS
alter table user_metrics enable row level security;

drop policy if exists "Users can read their aggregate metrics" on user_metrics;

create policy "Users can read their aggregate metrics"
  on user_metrics
  for select
  using (
    u_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- YOUTUBE_METRICS
alter table youtube_metrics enable row level security;

drop policy if exists "Users can read their YouTube metrics" on youtube_metrics;

create policy "Users can read their YouTube metrics"
  on youtube_metrics
  for select
  using (
    exists (
      select 1
      from user_projects up
      where up.p_id = youtube_metrics.p_id
        and up.u_id = auth.uid()
    )
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- INSTAGRAM_METRICS
alter table instagram_metrics enable row level security;

drop policy if exists "Users can read their Instagram metrics" on instagram_metrics;

create policy "Users can read their Instagram metrics"
  on instagram_metrics
  for select
  using (
    exists (
      select 1
      from user_projects up
      where up.p_id = instagram_metrics.p_id
        and up.u_id = auth.uid()
    )
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- INSTAGRAM_INSIGHTS
alter table instagram_insights enable row level security;

drop policy if exists "Users can read their Instagram insights" on instagram_insights;

create policy "Users can read their Instagram insights"
  on instagram_insights
  for select
  using (
    u_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- USER_TOKENS
alter table user_tokens enable row level security;

drop policy if exists "Users can manage their tokens" on user_tokens;

create policy "Users can manage their tokens"
  on user_tokens
  for all
  using (
    u_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    u_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );


