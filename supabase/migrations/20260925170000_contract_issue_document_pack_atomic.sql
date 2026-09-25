-- Persist all candidate-specific material employment particulars used by the contract renderer.
alter table public.laurem_recruitment_contracts
  add column if not exists employment_type text,
  add column if not exists continuous_employment_date date,
  add column if not exists normal_working_days text,
  add column if not exists shift_pattern text,
  add column if not exists pay_frequency text,
  add column if not exists pay_method text,
  add column if not exists holiday_pay_calculation text,
  add column if not exists sick_pay text,
  add column if not exists paid_leave text,
  add column if not exists contractual_benefits text,
  add column if not exists non_contractual_benefits text,
  add column if not exists probation text,
  add column if not exists probation_conditions text,
  add column if not exists mandatory_training text,
  add column if not exists mandatory_training_paid_by text,
  add column if not exists pre_registration_role text,
  add column if not exists registration_transition_terms text,
  add column if not exists repayment_method text;

create or replace function public.laurem_issue_recruitment_contract_and_document_pack(
  p_contract_id uuid,
  p_application_id uuid,
  p_contract_token_hash text,
  p_contract_token_expires_at timestamptz,
  p_document_pack_token_hash text,
  p_document_pack_token_expires_at timestamptz,
  p_job_description text,
  p_job_description_sha256 text,
  p_handbook_title text,
  p_handbook_content text,
  p_handbook_sha256 text,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_contract public.laurem_recruitment_contracts%rowtype;
  v_issue jsonb;
  v_pack jsonb;
begin
  if p_contract_id is null or p_application_id is null then
    raise exception 'CONTRACT_IDENTIFIERS_REQUIRED';
  end if;

  select * into v_contract
  from public.laurem_recruitment_contracts
  where id = p_contract_id
    and application_id = p_application_id
  for update;

  if not found then
    raise exception 'CONTRACT_APPLICATION_MISMATCH';
  end if;

  v_issue := public.laurem_issue_recruitment_contract_with_token(
    p_contract_id,
    p_contract_token_hash,
    p_contract_token_expires_at,
    p_actor
  );

  v_pack := public.laurem_issue_candidate_document_pack(
    p_application_id,
    p_document_pack_token_hash,
    p_document_pack_token_expires_at,
    p_job_description,
    p_job_description_sha256,
    p_handbook_title,
    p_handbook_content,
    p_handbook_sha256,
    p_actor
  );

  return jsonb_build_object(
    'contract', v_issue->'contract',
    'contract_token_id', v_issue->'token_id',
    'document_pack', v_pack
  );
end;
$function$;

revoke all on function public.laurem_issue_recruitment_contract_and_document_pack(
  uuid,uuid,text,timestamptz,text,timestamptz,text,text,text,text,text,text
) from public, anon, authenticated;

grant execute on function public.laurem_issue_recruitment_contract_and_document_pack(
  uuid,uuid,text,timestamptz,text,timestamptz,text,text,text,text,text,text
) to service_role;
