-- ============================================
-- Basecamp Hub — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Locations
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  created_at timestamptz default now()
);

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  position text,
  department text,
  role text default 'employee', -- 'employee', 'manager', 'admin'
  location_id uuid references locations(id),
  manager_id uuid references profiles(id),
  hire_date date,
  anniversary_month int, -- 1-12
  anniversary_day int,   -- 1-31
  photo_url text,
  phone text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Schedules
create table schedules (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  week_start date not null,
  status text default 'draft', -- 'draft', 'pending_approval', 'approved'
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  unique(location_id, week_start)
);

-- Shifts
create table shifts (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id) on delete cascade,
  employee_id uuid references profiles(id),
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

-- Vacation Requests
create table vacation_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles(id),
  start_date date not null,
  end_date date not null,
  reason text,
  status text default 'pending', -- 'pending', 'approved', 'denied'
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Shift Swap Requests
create table shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id),
  requester_shift_id uuid references shifts(id),
  target_employee_id uuid references profiles(id), -- null = open to anyone
  target_shift_id uuid references shifts(id),      -- null = open to anyone
  status text default 'pending', -- 'pending', 'accepted', 'declined'
  responded_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table profiles enable row level security;
alter table locations enable row level security;
alter table schedules enable row level security;
alter table shifts enable row level security;
alter table vacation_requests enable row level security;
alter table shift_swap_requests enable row level security;

-- Profiles: users can see everyone at their location, edit only their own
create policy "Users can view profiles at their location"
  on profiles for select
  using (
    location_id = (select location_id from profiles where id = auth.uid())
    or id = auth.uid()
  );

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- Locations: everyone can read
create policy "Anyone can view locations"
  on locations for select using (true);

-- Schedules: users see their location's schedules
create policy "Users can view their location schedule"
  on schedules for select
  using (
    location_id = (select location_id from profiles where id = auth.uid())
  );

-- Shifts: users see shifts for their location's schedules
create policy "Users can view shifts at their location"
  on shifts for select
  using (
    schedule_id in (
      select id from schedules
      where location_id = (select location_id from profiles where id = auth.uid())
    )
  );

-- Vacation requests: employees see their own, managers see their location
create policy "Employees can view their own vacation requests"
  on vacation_requests for select
  using (employee_id = auth.uid());

create policy "Employees can insert vacation requests"
  on vacation_requests for insert
  with check (employee_id = auth.uid());

-- Shift swaps: requesters and targets can see their own
create policy "Users can view their own shift swap requests"
  on shift_swap_requests for select
  using (requester_id = auth.uid() or target_employee_id = auth.uid());

create policy "Users can insert shift swap requests"
  on shift_swap_requests for insert
  with check (requester_id = auth.uid());

-- ============================================
-- Sample Data (optional — remove before prod)
-- ============================================

insert into locations (name, city) values
  ('Pike Place', 'Seattle'),
  ('Capitol Hill', 'Seattle'),
  ('Pearl District', 'Portland');
