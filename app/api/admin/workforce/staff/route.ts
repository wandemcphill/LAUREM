import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { createLauremStaffNotification } from '@/lib/laurem-staff-notifications';
import { LAUREM_STAFF_EMPLOYMENT_TRANSITIONS, isLauremStaffEmploymentStatus } from '@/lib/laurem-lifecycle-policy';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const status = new URL(request.url).searchParams.get('status');
  let query = db().from('staff_profiles')
    .select('id,application_id,employee_number,full_name,email,phone,job_title,employment_status,start_date,end_date,location,nmc_number,right_to_work_verified,dbs_verified,contract_id,created_at,updated_at')
    .order('full_name', { ascending: true }).limit(500);
  if (status && ['pending','active','suspended','leaver'].includes(status)) query = query.eq('employment_status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load staff.' }, { status: 500 });
  return NextResponse.json({ staff: data || [] });
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Staff id is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nextStatus = typeof body?.employmentStatus === 'string' ? body.employmentStatus : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  const endDate = typeof body?.endDate === 'string' ? body.endDate : null;
  if (!isLauremStaffEmploymentStatus(nextStatus)) return NextResponse.json({ error: 'Invalid employment status.' }, { status: 400 });
  if (nextStatus === 'leaver' && (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) return NextResponse.json({ error: 'A valid end date is required when marking staff as a leaver.' }, { status: 400 });

  const client = db();
  const { data: current, error: currentError } = await client.from('staff_profiles').select('id,employment_status,full_name,session_version').eq('id', id).maybeSingle();
  if (currentError) return NextResponse.json({ error: 'Unable to load staff record.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  if (current.employment_status === nextStatus) return NextResponse.json({ error: 'Staff member is already in that status.' }, { status: 400 });
  if (!isLauremStaffEmploymentStatus(current.employment_status) || !LAUREM_STAFF_EMPLOYMENT_TRANSITIONS[current.employment_status].includes(nextStatus)) return NextResponse.json({ error: `Transition from ${current.employment_status} to ${nextStatus} is not allowed.` }, { status: 409 });

  const patch: Record<string, unknown> = {
    employment_status: nextStatus,
    end_date: nextStatus === 'leaver' ? endDate : null,
    updated_at: new Date().toISOString(),
  };
  if (typeof current.session_version === 'number') patch.session_version = current.session_version + 1;
  const { data, error } = await client.from('staff_profiles').update(patch).eq('id', id)
    .select('id,employee_number,full_name,email,job_title,employment_status,start_date,end_date,location,updated_at').single();
  if (error) return NextResponse.json({ error: 'Unable to update staff status.' }, { status: 500 });

  await client.from('workforce_audit_events').insert({
    staff_id: id,
    event_type: 'staff.status_changed',
    actor: session.email,
    details: { from: current.employment_status, to: nextStatus, endDate, note: note || null },
  });
  const statusLabel = nextStatus.replaceAll('_', ' ');
  await createLauremStaffNotification(client, {
    staffId: id,
    category: 'employment',
    title: `Employment status updated: ${statusLabel}`,
    body: `Your LAUREM employment status has changed from ${current.employment_status.replaceAll('_', ' ')} to ${statusLabel}.`,
    actionUrl: '/staff/profile',
  });
  return NextResponse.json({ staff: data });
}
