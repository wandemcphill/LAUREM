-- Sponsor-side Visa Help application tracking.
create extension if not exists pgcrypto;

create table if not exists public.laurem_staff_visa_help_application_tracking (
  id uuid primary key default gen_random_uuid(),
  visa_help_case_id uuid not null unique references public.laurem_staff_visa_help_cases(id) on delete cascade,
  staff_id uuid not null references public.laurem_staff_profiles(id) on delete cascade,

  cos_status text not null default 'not_started'
    check (cos_status in ('not_started','requested','issued')),
  cos_reference text,
  cos_requested_at timestamptz,
  cos_issued_at timestamptz,

  application_status text not null default 'not_started'
    check (application_status in ('not_started','draft','submitted')),
  application_reference text,
  application_submitted_at timestamptz,

  identity_status text not null default 'not_started'
    check (identity_status in ('not_started','scheduled','completed')),
  identity_method text,
  identity_appointment_at timestamptz,
  identity_completed_at timestamptz,

  decision_status text not null default 'pending'
    check (decision_status in ('pending','granted','refused','withdrawn')),
  decision_reference text,
  decision_date timestamptz,
  decision_notes text check (decision_notes is null or char_length(decision_notes) <= 5000),

  right_to_work_status text not null default 'pending'
    check (right_to_work_status in ('pending','action_required','confirmed')),
  right_to_work_checked_at timestamptz,
  right_to_work_checked_by text,

  sponsor_notes text check (sponsor_notes is null or char_length(sponsor_notes) <= 5000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists laurem_staff_visa_help_application_tracking_staff_idx
  on public.laurem_staff_visa_help_application_tracking(staff_id, updated_at desc);

create index if not exists laurem_staff_visa_help_application_tracking_status_idx
  on public.laurem_staff_visa_help_application_tracking(application_status, identity_status, decision_status, right_to_work_status);

alter table public.laurem_staff_visa_help_application_tracking enable row level security;
revoke all on public.laurem_staff_visa_help_application_tracking from anon, authenticated;
