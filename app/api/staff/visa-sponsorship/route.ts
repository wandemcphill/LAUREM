import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';
import { determineLauremVisaPathway, visaPathwayLabel } from '@/lib/laurem-visa-sponsorship';
import { buildLauremVisaReadiness } from '@/lib/laurem-visa-readiness';

async function loadStaffVisa(client: ReturnType<typeof db>, staffId: string) {
  const { data: staff, error: staffError } = await client.from('laurem_staff_profiles')
    .select('id,application_id,full_name,email,job_title,employment_status,start_date,nmc_number')
    .eq('id', staffId)
    .maybeSingle();
  if (staffError) throw staffError;
  if (!staff) return null;

  const { data: application, error: appError } = await client.from('laurem_recruitment_applications')
    .select('id,full_name,preferred_name,email,phone,date_of_birth,nationality,country_of_residence,address,role_applied,employment_type,start_date,qualifications,training,professional_experience,employment_history,living_in_uk,current_country,work_permission,requires_sponsorship,supporting_documents,application_data')
    .eq('id', staff.application_id)
    .maybeSingle();
  if (appError) throw appError;
  if (!application) throw new Error('RECRUITMENT_APPLICATION_NOT_FOUND');

  const recommendation = determineLauremVisaPathway({
    livingInUk: application.living_in_uk,
    currentCountry: application.current_country || application.country_of_residence,
  });

  const { data: visaCase, error: caseError } = await client.from('laurem_staff_visa_cases')
    .select('*')
    .eq('staff_id', staffId)
    .not('status','in','(declined,withdrawn)')
    .order('requested_at',{ascending:false})
    .limit(1)
    .maybeSingle();
  if (caseError) throw caseError;

  let invoice = null;
  let events: any[] = [];
  if (visaCase) {
    const invoiceResult = await client.from('laurem_staff_visa_invoices')
      .select('*')
      .eq('visa_case_id', visaCase.id)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (invoiceResult.error) throw invoiceResult.error;
    invoice = invoiceResult.data;

    const eventsResult = await client.from('laurem_staff_visa_case_events')
      .select('id,event_type,actor_type,actor,metadata,created_at')
      .eq('visa_case_id', visaCase.id)
      .order('created_at',{ascending:false})
      .limit(50);
    if (eventsResult.error) throw eventsResult.error;
    events = eventsResult.data || [];
  }

  const { data: visaDocuments, error: documentError } = await client.from('laurem_staff_documents')
    .select('id,title,description,original_filename,mime_type,file_size_bytes,status,category,issued_at,signature_status')
    .eq('staff_id', staffId)
    .eq('category','visa_sponsorship')
    .eq('status','issued')
    .order('issued_at',{ascending:false});
  if (documentError) throw documentError;

  const readiness = visaCase ? buildLauremVisaReadiness({
    pathway: visaCase.pathway,
    staff: staff as Record<string, unknown>,
    application: application as Record<string, unknown>,
    additionalInformation: (visaCase.additional_information || {}) as Record<string, unknown>,
    invoiceStatus: invoice?.status || null,
  }) : null;

  return {
    staff,
    application,
    recommendation: {
      ...recommendation,
      label: visaPathwayLabel(recommendation.pathway),
    },
    case: visaCase,
    invoice,
    events,
    readiness,
    visaDocuments: visaDocuments || [],
  };
}

export async function GET(request: NextRequest) {
  const session = await getStaffSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const data = await loadStaffVisa(db(), session.staff_id);
    if (!data) return NextResponse.json({ error: 'Staff profile not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error(JSON.stringify({ level:'error', event:'staff.visa.load_failed', reason:error instanceof Error ? error.message : String(error) }));
    return NextResponse.json({ error: 'Unable to load your visa sponsorship workspace.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getStaffSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const pathway = typeof body?.pathway === 'string' ? body.pathway : null;
  if (pathway !== null && !['visa_switch','international_sponsorship'].includes(pathway)) {
    return NextResponse.json({ error: 'Invalid visa support route.' }, { status: 400 });
  }

  try {
    const { data, error } = await db().rpc('laurem_request_staff_visa_sponsorship', {
      p_staff_id: session.staff_id,
      p_requested_pathway: pathway,
    });
    if (error) throw error;
    return NextResponse.json(data, { status: data?.already_exists ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const known: Record<string, number> = {
      STAFF_NOT_FOUND: 404,
      STAFF_NOT_ELIGIBLE: 409,
      APPLICATION_NOT_FOUND: 409,
    };
    const key = Object.keys(known).find((item) => message.includes(item));
    return NextResponse.json({ error: key ? message : 'Unable to create your visa sponsorship request.' }, { status: key ? known[key] : 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getStaffSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const currentVisaType = typeof body?.currentVisaType === 'string' ? body.currentVisaType.trim().slice(0,120) : '';
  const currentVisaExpiryDate = typeof body?.currentVisaExpiryDate === 'string' ? body.currentVisaExpiryDate : '';
  const passportNumber = typeof body?.passportNumber === 'string' ? body.passportNumber.trim().slice(0,80) : '';
  const passportExpiryDate = typeof body?.passportExpiryDate === 'string' ? body.passportExpiryDate : '';
  const passportCountry = typeof body?.passportCountry === 'string' ? body.passportCountry.trim().slice(0,120) : '';

  try {
    const client = db();
    const { data: currentCase, error: caseError } = await client.from('laurem_staff_visa_cases')
      .select('id,staff_id,application_id,pathway,additional_information,status')
      .eq('staff_id', session.staff_id)
      .not('status','in','(declined,withdrawn)')
      .order('requested_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (caseError) throw caseError;
    if (!currentCase) return NextResponse.json({ error: 'Create your visa support request first.' }, { status: 404 });

    const additional = {
      ...(currentCase.additional_information || {}),
      current_visa_type: currentVisaType || null,
      current_visa_expiry_date: currentVisaExpiryDate || null,
      passport_number: passportNumber || null,
      passport_expiry_date: passportExpiryDate || null,
      passport_country: passportCountry || null,
      last_updated_by: 'staff',
      last_updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('laurem_staff_visa_cases')
      .update({ additional_information: additional, updated_at: new Date().toISOString() })
      .eq('id', currentCase.id)
      .eq('staff_id', session.staff_id)
      .select('*')
      .single();
    if (error || !data) throw error || new Error('Unable to update visa information.');

    await client.from('laurem_staff_visa_case_events').insert({
      visa_case_id: currentCase.id,
      staff_id: session.staff_id,
      event_type: 'candidate_information_updated',
      actor_type: 'staff',
      actor: session.email,
      metadata: { action: 'candidate_information_updated' },
    });

    const { data: currentInvoice, error: invoiceError } = await client.from('laurem_staff_visa_invoices')
      .select('status')
      .eq('visa_case_id', currentCase.id)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (invoiceError) throw invoiceError;

    const readiness = buildLauremVisaReadiness({
      pathway: currentCase.pathway,
      staff: { id: session.staff_id },
      application: { id: currentCase.application_id },
      additionalInformation: additional,
      invoiceStatus: currentInvoice?.status || null,
    });
    return NextResponse.json({ case: data, readiness });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update visa information.' }, { status: 409 });
  }
}
