-- ============================================
-- Schedule Status table (draft / published)
-- Run this in Supabase SQL Editor
-- ============================================

create table if not exists schedule_status (
  location_id uuid references locations(id) on delete cascade,
  month       date not null,   -- always first day of month, e.g. 2026-04-01
  status      text not null default 'draft',  -- 'draft' | 'published'
  created_by  uuid references profiles(id),
  published_at timestamptz,
  created_at  timestamptz default now(),
  primary key (location_id, month)
);

alter table schedule_status enable row level security;

create policy "Anyone authenticated can view schedule_status"
  on schedule_status for select using (auth.uid() is not null);

create policy "Authenticated can insert schedule_status"
  on schedule_status for insert with check (auth.uid() is not null);

create policy "Authenticated can update schedule_status"
  on schedule_status for update using (auth.uid() is not null);


-- ============================================
-- New test profiles: Sofia 3, 4, 6, 7
-- ============================================

do $$
declare
  pearl_id uuid;
begin
  select id into pearl_id from locations where name = 'Pearl District' limit 1;

  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (gen_random_uuid(), 'sofia3@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Three"}',  'authenticated', 'authenticated'),
    (gen_random_uuid(), 'sofia4@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Four"}',   'authenticated', 'authenticated'),
    (gen_random_uuid(), 'sofia6@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Six"}',    'authenticated', 'authenticated'),
    (gen_random_uuid(), 'sofia7@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Seven"}',  'authenticated', 'authenticated');

  update profiles set location_id = pearl_id, position = 'Shift Supervisor',       department = 'In-Store / Hourly' where email = 'sofia3@basecampcoffee.com';
  update profiles set location_id = pearl_id, position = 'Assistant Store Manager', department = 'Store Management'  where email = 'sofia4@basecampcoffee.com';
  update profiles set location_id = pearl_id, position = 'Area/District Manager',   department = 'Above-Store'       where email = 'sofia6@basecampcoffee.com';
  update profiles set location_id = pearl_id, position = 'Regional Manager',        department = 'Above-Store'       where email = 'sofia7@basecampcoffee.com';
end $$;
