import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: app } = await client.from('recruitment_applications').select('id,full_name,email,phone,role_applied,start_date,nmc_number,application_data').eq('id', applicationId).maybeSingle();
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    const { data: existing } = await client.from('staff_profiles').select('id,employee_number').eq('application_id', applicationId).maybeSingle();
    if (existing) return NextResponse.json({ staff: existing, alreadyOnboarded: true });
    const employeeNumber = `LAU-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const applicationData = (app.application_data && typeof app.application_data === 'object') ? app.application_data as Record<string, unknown> : {};
    const nmc = typeof applicationData.nmc_number === 'string' ? applicationData.nmc_number : null;
    const location = typeof body?.location === 'string' ? body.location : null;
    const { data: staff, error } = await client.from('staff_profiles').insert({ application_id: applicationId, employee_number: employeeNumber, full_name: app.full_name, email: app.email, phone: app.phone, job_title: app.role_applied, employment_status: 'active', start_date: app.start_date, location, nmc_number: nmc || app.nmc_number || null, contract_id: typeof body?.contractId === 'string' ? body.contractId : null }).select('*').single();
    if (error) throw error;
    await client.from('recruitment_applications').update({ status: 'Hired', updated_at: new Date().toISOString() }).eq('id', applicationId);
    await client.from('recruitment_status_history').insert({ application_id: applicationId, from_status: 'Onboarding', to_status: 'Hired', changed_by: session.email, note: `Created staff profile ${employeeNumber}` });
    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.onboarding.create_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to complete onboarding.' }, { status: 500 });
  }
}
