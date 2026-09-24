-- Repair live LAUREM hire-path RPC drift.
-- 1. Qualify pgcrypto digest() because these security-definer functions run with search_path=public.
-- 2. Restore the signed candidate-document attachment RPC required by the admin Hired route.

create or replace function public.laurem_attach_accepted_contract_document(
  p_staff_id uuid,
  p_application_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_staff public.laurem_staff_profiles%rowtype;
  v_contract public.laurem_recruitment_contracts%rowtype;
  v_doc public.laurem_staff_documents%rowtype;
  v_now timestamptz := clock_timestamp();
  v_source_key text;
begin
  select * into v_staff
  from public.laurem_staff_profiles
  where id = p_staff_id and application_id = p_application_id
  for update;
  if not found then raise exception 'STAFF_NOT_FOUND'; end if;

  select * into v_contract
  from public.laurem_recruitment_contracts
  where application_id = p_application_id and status = 'accepted' and accepted_at is not null
  order by accepted_at desc
  limit 1;
  if not found then raise exception 'ACCEPTED_CONTRACT_REQUIRED'; end if;

  v_source_key := v_contract.id::text;

  select * into v_doc
  from public.laurem_staff_documents
  where staff_id = p_staff_id and source_type = 'contract' and source_key = v_source_key
  for update;

  if found then
    return jsonb_build_object('document', to_jsonb(v_doc), 'already_exists', true);
  end if;

  insert into public.laurem_staff_documents(
    staff_id, category, title, description, mime_type, content_text, document_sha256,
    source_type, source_key, status, requires_signature, signature_status,
    signature_method, signature_name, signature_attestation, signed_at, signed_ip,
    signed_user_agent, issuer_name, issuer_title, employer_name, issued_by_actor, issued_at
  )
  values (
    p_staff_id,
    'contract',
    'Employment Contract',
    'Final employment contract accepted electronically before staff portal activation.',
    'text/plain',
    v_contract.contract_content,
    encode(extensions.digest(convert_to(v_contract.contract_content, 'utf8'), 'sha256'), 'hex'),
    'contract',
    v_source_key,
    'issued',
    false,
    'signed',
    coalesce(v_contract.acceptance_method, 'candidate_online_acceptance'),
    v_contract.accepted_by_name,
    coalesce(v_contract.acceptance_attestation, 'Electronic acceptance recorded by the LAUREM platform.'),
    v_contract.accepted_at,
    v_contract.accepted_ip,
    v_contract.acceptance_user_agent,
    'Dezou Maurice',
    'Manager',
    'Laurem Caregroup Ltd',
    coalesce(nullif(btrim(p_actor), ''), 'LAUREM platform'),
    coalesce(v_contract.issued_at, v_now)
  )
  returning * into v_doc;

  insert into public.laurem_staff_document_events(
    document_id, staff_id, event_type, actor_type, actor, metadata
  )
  values (
    v_doc.id,
    p_staff_id,
    'created',
    'system',
    coalesce(nullif(btrim(p_actor), ''), 'LAUREM platform'),
    jsonb_build_object(
      'source_type', 'contract',
      'contract_id', v_contract.id,
      'document_sha256', v_doc.document_sha256
    )
  );

  return jsonb_build_object('document', to_jsonb(v_doc), 'already_exists', false);
end;
$func$;

revoke all on function public.laurem_attach_accepted_contract_document(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.laurem_attach_accepted_contract_document(uuid, uuid, text)
  to service_role;

create or replace function public.laurem_attach_signed_candidate_documents_to_staff(
  p_staff_id uuid,
  p_application_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  staff_row public.laurem_staff_profiles%rowtype;
  pack_row public.laurem_candidate_document_packs%rowtype;
  candidate_doc public.laurem_candidate_documents%rowtype;
  existing_doc public.laurem_staff_documents%rowtype;
  result jsonb := '{}'::jsonb;
begin
  select * into staff_row
  from public.laurem_staff_profiles
  where id = p_staff_id
    and application_id = p_application_id
  for update;

  if not found then
    raise exception 'STAFF_NOT_FOUND';
  end if;

  select * into pack_row
  from public.laurem_candidate_document_packs
  where application_id = p_application_id
    and status = 'completed'
  order by completed_at desc nulls last, created_at desc
  limit 1;

  if not found then
    raise exception 'SIGNED_CANDIDATE_DOCUMENT_PACK_REQUIRED';
  end if;

  for candidate_doc in
    select *
    from public.laurem_candidate_documents
    where pack_id = pack_row.id
      and signature_status = 'signed'
    order by document_type
  loop
    select * into existing_doc
    from public.laurem_staff_documents
    where staff_id = p_staff_id
      and category = case
        when candidate_doc.document_type = 'job_description' then 'job_description'
        else 'handbook'
      end
      and status = 'issued'
    order by issued_at desc
    limit 1
    for update;

    if found then
      update public.laurem_staff_documents
      set title = candidate_doc.title,
          description = 'Signed before staff portal activation as part of the LAUREM employment document journey.',
          mime_type = 'text/plain',
          content_text = candidate_doc.content_text,
          storage_path = null,
          document_sha256 = candidate_doc.document_sha256,
          source_type = case
            when candidate_doc.document_type = 'job_description' then 'job_description'
            else 'onboarding'
          end,
          source_key = case
            when candidate_doc.document_type = 'job_description'
              then coalesce(nullif(existing_doc.source_key, ''), lower(btrim(coalesce(staff_row.job_title, 'Job'))))
            else 'candidate-document:' || candidate_doc.id::text
          end,
          status = 'issued',
          requires_signature = false,
          signature_status = 'signed',
          signature_method = candidate_doc.signature_method,
          signature_name = candidate_doc.signature_name,
          signature_data = candidate_doc.signature_data,
          signature_attestation = candidate_doc.signature_attestation,
          signed_at = candidate_doc.signed_at,
          signed_ip = candidate_doc.signed_ip,
          signed_user_agent = candidate_doc.signed_user_agent,
          issuer_name = 'Dezou Maurice',
          issuer_title = 'Manager',
          employer_name = 'Laurem Caregroup Ltd',
          issued_by_actor = coalesce(nullif(btrim(p_actor), ''), 'LAUREM platform'),
          issued_at = coalesce(existing_doc.issued_at, candidate_doc.signed_at, now()),
          superseded_at = null,
          superseded_by = null,
          updated_at = now()
      where id = existing_doc.id
      returning * into existing_doc;
    else
      insert into public.laurem_staff_documents(
        staff_id, category, title, description, mime_type, content_text, storage_path,
        document_sha256, source_type, source_key, status, requires_signature,
        signature_status, signature_method, signature_name, signature_data,
        signature_attestation, signed_at, signed_ip, signed_user_agent,
        issuer_name, issuer_title, employer_name, issued_by_actor, issued_at
      )
      values(
        p_staff_id,
        case when candidate_doc.document_type = 'job_description' then 'job_description' else 'handbook' end,
        candidate_doc.title,
        'Signed before staff portal activation as part of the LAUREM employment document journey.',
        'text/plain',
        candidate_doc.content_text,
        null,
        candidate_doc.document_sha256,
        case when candidate_doc.document_type = 'job_description' then 'job_description' else 'onboarding' end,
        case
          when candidate_doc.document_type = 'job_description'
            then lower(btrim(coalesce(staff_row.job_title, 'Job')))
          else 'candidate-document:' || candidate_doc.id::text
        end,
        'issued',
        false,
        'signed',
        candidate_doc.signature_method,
        candidate_doc.signature_name,
        candidate_doc.signature_data,
        candidate_doc.signature_attestation,
        candidate_doc.signed_at,
        candidate_doc.signed_ip,
        candidate_doc.signed_user_agent,
        'Dezou Maurice',
        'Manager',
        'Laurem Caregroup Ltd',
        coalesce(nullif(btrim(p_actor), ''), 'LAUREM platform'),
        coalesce(candidate_doc.signed_at, now())
      )
      returning * into existing_doc;
    end if;

    insert into public.laurem_staff_document_events(
      document_id, staff_id, event_type, actor_type, actor, metadata
    )
    values(
      existing_doc.id,
      p_staff_id,
      'signed',
      'system',
      coalesce(nullif(btrim(p_actor), ''), 'LAUREM platform'),
      jsonb_build_object(
        'source_type', 'candidate_document',
        'candidate_document_id', candidate_doc.id,
        'document_type', candidate_doc.document_type,
        'document_sha256', candidate_doc.document_sha256,
        'signature_status', 'signed'
      )
    );

    result := result || jsonb_build_object(
      candidate_doc.document_type,
      to_jsonb(existing_doc)
    );
  end loop;

  return result;
end;
$func$;

revoke all on function public.laurem_attach_signed_candidate_documents_to_staff(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.laurem_attach_signed_candidate_documents_to_staff(uuid, uuid, text)
  to service_role;
