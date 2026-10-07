-- LAUREM: replace hosted invoice checkout with bank-transfer payment instructions.
-- Payment references are automatically set to the staff member's LAUREM ID.
-- This migration is idempotent so it can be applied to environments that already have the live patch.

alter table public.laurem_staff_visa_invoices
  add column if not exists payment_reference text;

do $$
declare
  definition text;
begin
  select pg_get_functiondef(p.oid)
    into definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'laurem_request_staff_visa_sponsorship'
    and pg_get_function_identity_arguments(p.oid) = 'p_staff_id uuid, p_requested_pathway text';

  if definition is null then
    raise exception 'laurem_request_staff_visa_sponsorship(uuid,text) not found';
  end if;

  if position('v_payment_reference text;' in definition) = 0 then
    if position('v_payment_url text;' in definition) = 0 then
      raise exception 'Payment variable declaration not found in LAUREM sponsorship function';
    end if;

    definition := replace(
      definition,
      '  v_payment_url text;',
      '  v_payment_reference text;'
    );

    if position('v_payment_reference := nullif(trim(v_staff.laurem_id), '''');' in definition) = 0 then
      definition := replace(
        definition,
        '  if v_staff.employment_status not in (''pending'',''active'') then raise exception ''STAFF_NOT_ELIGIBLE''; end if;',
        '  if v_staff.employment_status not in (''pending'',''active'') then raise exception ''STAFF_NOT_ELIGIBLE''; end if;
  v_payment_reference := nullif(trim(v_staff.laurem_id), '''');
  if v_payment_reference is null then raise exception ''STAFF_LAUREM_ID_MISSING''; end if;'
      );
    end if;

    definition := replace(
      definition,
      '    v_payment_url := ''https://www.payssion.com/checkout/live_d5a43be9bff6d1a2'';
',
      ''
    );
    definition := replace(
      definition,
      '    v_payment_url := ''https://buy.stripe.com/4gMcN63sc39823A6OYbAs0m'';
',
      ''
    );

    definition := replace(
      definition,
      '    payment_url,
    created_by,',
      '    payment_reference,
    created_by,'
    );

    definition := replace(
      definition,
      '    v_payment_url,
    ''LAUREM platform'',',
      '    v_payment_reference,
    ''LAUREM platform'','
    );

    if position('payment_reference,' in definition) = 0
       or position('v_payment_reference,' in definition) = 0 then
      raise exception 'Could not wire LAUREM payment reference into invoice creation';
    end if;

    execute definition;
  end if;
end $$;

update public.laurem_staff_visa_invoices i
set
  payment_url = null,
  payment_reference = nullif(trim(p.laurem_id), ''),
  updated_at = clock_timestamp()
from public.laurem_staff_profiles p
where p.id = i.staff_id;
