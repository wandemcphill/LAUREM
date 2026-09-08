import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { hashToken, makeToken } from '@/lib/token';
import { renderLauremContract } from '@/lib/laurem-contract';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: app } = await client.from('recruitment_applications').select('*').eq('id', applicationId).maybeSingle();
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    const content = renderLauremContract({
      employeeName: app.full_name,
      employeeAddress: app.address,
      jobTitle: app.role_applied,
      startDate: app.start_date,
      minimumWeeklyHours: typeof body?.minimumWeeklyHours === 'number' ? body.minimumWeeklyHours : null,
      hourlyRate: typeof body?.hourlyRate === 'number' ? body.hourlyRate : null,
      workLocations: Array.isArray(body?.workLocations) ? body.workLocations.filter((v): v is string => typeof v === 'string') : [],
      clientOrAssignmentDetails: typeof body?.clientOrAssignmentDetails === 'string' ? body.clientOrAssignmentDetails : null,
      noticePeriodEmployee: typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null,
      noticePeriodEmployer: typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null,
      holidayEntitlement: typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null,
      pensionScheme: typeof body?.pensionScheme === 'string' ? body.pensionScheme : null,
    });
    const { data: contract, error } = await client.from('recruitment_contracts').upsert({ application_id: applicationId, version: 1, job_title: app.role_applied, start_date: app.start_date, contract_end_date: typeof body?.contractEndDate === 'string' ? body.contractEndDate : null, minimum_weekly_hours: typeof body?.minimumWeeklyHours === 'number' ? body.minimumWeeklyHours : null, hourly_rate: typeof body?.hourlyRate === 'number' ? body.hourlyRate : null, work_locations: Array.isArray(body?.workLocations) ? body.workLocations : [], client_or_assignment_details: typeof body?.clientOrAssignmentDetails === 'string' ? body.clientOrAssignmentDetails : null, notice_period_employee: typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null, notice_period_employer: typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null, holiday_entitlement: typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null, pension_scheme: typeof body?.pensionScheme === 'string' ? body.pensionScheme : null, contract_content: content, status: 'draft', created_by: session.email, updated_at: new Date().toISOString() }, { onConflict: 'application_id' }).select('*').single();
    if (error) throw error;
    const token = makeToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await client.from('recruitment_contract_tokens').insert({ contract_id: contract.id, token_hash: hashToken(token), expires_at: expiresAt });
    return NextResponse.json({ contract, acceptanceLink: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/contracts/accept/${token}` }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.contract.generate_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to generate employment contract.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Contract id is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!['draft','issued'].includes(status)) return NextResponse.json({ error: 'Only draft or issued status can be set by recruiter.' }, { status: 400 });
  const { data, error } = await db().from('recruitment_contracts').update({ status, issued_at: status === 'issued' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to update contract.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  return NextResponse.json({ contract: data });
}
