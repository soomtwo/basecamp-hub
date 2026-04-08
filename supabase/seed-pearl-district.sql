-- Seed 10 baristas for the Pearl District location
-- Run this in Supabase SQL Editor

do $$
declare
  pearl_id uuid;
  barista_position text := 'Barista';
begin
  -- Get Pearl District location ID
  select id into pearl_id from locations where name = 'Pearl District' limit 1;

  -- Create auth users + profiles for each barista
  -- (trigger auto-creates profile, then we update with details)

  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (gen_random_uuid(), 'maya.chen@basecampcoffee.com',   crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Chen"}',   'authenticated', 'authenticated'),
    (gen_random_uuid(), 'liam.okafor@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Liam Okafor"}', 'authenticated', 'authenticated'),
    (gen_random_uuid(), 'sofia.reyes@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Reyes"}', 'authenticated', 'authenticated'),
    (gen_random_uuid(), 'noah.kim@basecampcoffee.com',    crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Noah Kim"}',    'authenticated', 'authenticated'),
    (gen_random_uuid(), 'amara.patel@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amara Patel"}', 'authenticated', 'authenticated'),
    (gen_random_uuid(), 'jake.moreno@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jake Moreno"}', 'authenticated', 'authenticated'),
    (gen_random_uuid(), 'zoe.nguyen@basecampcoffee.com',  crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Zoe Nguyen"}',  'authenticated', 'authenticated'),
    (gen_random_uuid(), 'eli.santos@basecampcoffee.com',  crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eli Santos"}',  'authenticated', 'authenticated'),
    (gen_random_uuid(), 'isla.brooks@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Isla Brooks"}', 'authenticated', 'authenticated'),
    (gen_random_uuid(), 'dani.torres@basecampcoffee.com', crypt('Basecamp2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dani Torres"}', 'authenticated', 'authenticated');

  -- Update their profiles with location and position
  update profiles
  set
    location_id = pearl_id,
    position    = barista_position,
    department  = 'In-Store / Hourly'
  where email in (
    'maya.chen@basecampcoffee.com',
    'liam.okafor@basecampcoffee.com',
    'sofia.reyes@basecampcoffee.com',
    'noah.kim@basecampcoffee.com',
    'amara.patel@basecampcoffee.com',
    'jake.moreno@basecampcoffee.com',
    'zoe.nguyen@basecampcoffee.com',
    'eli.santos@basecampcoffee.com',
    'isla.brooks@basecampcoffee.com',
    'dani.torres@basecampcoffee.com'
  );

end $$;
