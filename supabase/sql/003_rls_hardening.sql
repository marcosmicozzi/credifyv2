-- Additional RLS policies to guarantee users only interact with data they own.

-- USER_FOLLOWS
alter table user_follows enable row level security;

drop policy if exists "Users can read follow relationships they participate in" on user_follows;
drop policy if exists "Users can manage follow relationships they initiate" on user_follows;

create policy "Users can read follow relationships they participate in"
  on user_follows
  for select
  using (
    follower_id = auth.uid()
    or followed_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

create policy "Users can manage follow relationships they initiate"
  on user_follows
  for all
  using (
    follower_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    follower_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- USER_METRICS materialized via triggers, restrict updates to service role
drop policy if exists "Service role manages user metrics" on user_metrics;

create policy "Service role manages user metrics"
  on user_metrics
  for all
  using (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- Projects are immutable by end-users; restrict modifications to service role
drop policy if exists "Service role manages projects" on projects;

create policy "Service role manages projects"
  on projects
  for all
  using (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- User projects membership maintenance controlled by service role
drop policy if exists "Service role manages membership" on user_projects;

create policy "Service role manages membership"
  on user_projects
  for all
  using (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  with check (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );


