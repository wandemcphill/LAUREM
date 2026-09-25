-- LAUREM HR & Workforce Administration fields: manager linkage, emergency contacts, compliance tracking
alter table public.laurem_staff_profiles
  add column if not exists manager_id uuid references public.laurem_staff_profiles(id) on delete set null,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists nmc_status text check (nmc_status is null or nmc_status in ('fully_registered', 'registration_in_progress', 'verification_pending', 'restricted_not_cleared', 'not_applicable')),
  add column if not exists nmc_expiry_date date,
  add column if not exists right_to_work_expiry_date date,
  add column if not exists right_to_work_notes text,
  add column if not exists dbs_pvg_status text check (dbs_pvg_status is null or dbs_pvg_status in ('verified', 'pending', 'expired', 'under_review', 'not_applicable')),
  add column if not exists dbs_pvg_check_date date,
  add column if not exists dbs_pvg_expiry_date date;

create index if not exists laurem_staff_profiles_manager_idx on public.laurem_staff_profiles(manager_id);
create index if not exists laurem_staff_profiles_search_idx on public.laurem_staff_profiles(employment_status, location, job_title);
