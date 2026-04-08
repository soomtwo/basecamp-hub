-- ============================================
-- Positions reference table
-- ============================================

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  category text not null,
  sort_order int default 0
);

insert into positions (title, category, sort_order) values
  -- In-Store / Hourly
  ('Barista', 'In-Store / Hourly', 1),
  ('Senior/Lead Barista', 'In-Store / Hourly', 2),
  ('Shift Supervisor', 'In-Store / Hourly', 3),

  -- Store Management
  ('Assistant Store Manager', 'Store Management', 4),
  ('Store Manager', 'Store Management', 5),

  -- Above-Store
  ('Area/District Manager', 'Above-Store', 6),
  ('Regional Manager', 'Above-Store', 7),
  ('Director of Operations', 'Above-Store', 8),

  -- Support / Corporate
  ('HR Manager', 'Support / Corporate', 9),
  ('HR Business Partner', 'Support / Corporate', 10),
  ('Training & Development Manager', 'Support / Corporate', 11),
  ('Marketing Manager', 'Support / Corporate', 12),
  ('Supply Chain / Procurement', 'Support / Corporate', 13),
  ('Finance / Accounting', 'Support / Corporate', 14);

-- Allow all authenticated users to read positions
alter table positions enable row level security;
create policy "Anyone can view positions" on positions for select using (true);
