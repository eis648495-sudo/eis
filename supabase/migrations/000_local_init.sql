-- Local development schema for PostgREST (replaces unreachable Supabase)
-- Based on 001_init_schema.sql with anon role + grants, no storage.buckets

create extension if not exists "pgcrypto";

-- ========== ANON ROLE (for PostgREST) ==========
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

-- ========== MEMBERS ==========
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  full_name text default '',
  referral_code text,
  referrer_id uuid references public.members(id),
  status text default 'pending',
  role text default 'member',
  tree_level int default 0,
  gcash_number text,
  gcash_name text,
  phone text,
  address text,
  email text,
  age int,
  facebook_name text,
  backup_mobile text,
  approved_date timestamptz,
  created_date timestamptz default now(),
  created_at timestamptz default now(),
  direct_downlines_count int default 0,
  maintenance_override text,
  maintenance_timer_seconds int default 0,
  maintenance_timer_set_at timestamptz
);

-- ========== MAINTENANCE CODES ==========
create table if not exists public.maintenance_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  amount numeric default 0,
  is_used boolean default false,
  description text,
  assigned_username text,
  assigned_sub_admin_id uuid references public.members(id),
  used_by_member_id uuid references public.members(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

-- ========== TRANSACTIONS ==========
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  type text not null,
  amount numeric default 0,
  description text,
  status text default 'completed',
  bonus_level int,
  from_member_id uuid references public.members(id),
  created_date timestamptz default now(),
  created_at timestamptz default now()
);

-- ========== CONVERSION REQUESTS ==========
create table if not exists public.conversion_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  amount numeric default 0,
  status text default 'pending',
  created_date timestamptz default now(),
  created_at timestamptz default now()
);

-- ========== GCASH INFO ==========
create table if not exists public.gcash_info (
  id uuid primary key default gen_random_uuid(),
  gcash_number text,
  gcash_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ========== SYSTEM SETTINGS ==========
create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique,
  setting_value text,
  created_at timestamptz default now()
);

-- ========== GCASH RECEIPTS ==========
create table if not exists public.gcash_receipts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  member_name text,
  receipt_url text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- ========== GRANTS FOR ANON ROLE ==========
grant usage on schema public to anon;
grant select, insert, update, delete on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon;

-- ========== DEFAULT SYSTEM SETTINGS ==========
insert into public.system_settings (setting_key, setting_value) values
  ('withdrawal_minimum_amount', '300'),
  ('tab_monitoring_visible', 'true'),
  ('tab_subadmin_visible', 'true'),
  ('tab_terms_visible', 'true'),
  ('tab_complan_visible', 'true')
on conflict (setting_key) do nothing;

-- ========== CREATE AN ADMIN ACCOUNT ==========
insert into public.members (username, password, full_name, referral_code, status, role, tree_level)
values ('admin', 'admin123', 'Administrator', 'ADMIN001', 'approved', 'admin', 0)
on conflict (username) do nothing;
