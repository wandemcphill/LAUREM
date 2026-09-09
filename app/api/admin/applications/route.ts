import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

const allowedStatus = new Set([
  'Enquiry', 'Invited', 'Application', 'Screening', 'Interview',
  'Second Interview', 'Documents', 'Sponsorship', 'Offer', 'Onboarding',
  'Hired', 'Rejected', 'Withdrawn',
]);

function adminOrUnauthorized(request: NextRequest) {
  const session = readAdminSession(request);
  return session || null;
}

export async function GET(request: NextRequest) {
  const session = adminOrUnauthorized(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const { data, error } = await db()
      .from('recruitment_applications')
      .select('id,full_name,preferred_name,email,phone,nationality,country_of_residence,role_applied,employment_type,start_date,living_in_uk,current_country,requires_sponsorship,status,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) throw error;
    return NextResponse.json({ applications: data || [], recruiter: session.email });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.applications.list_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to load applications.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = adminOrUnauthorized(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  let body: { status?: string; note?: string; override?: boolean; overrideReason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const status = body.status?.trim() || '';
  const note = typeof body.note === 'string' ? body.note.trim() : null;
  const override = body.override === true;
  const overrideReason = typeof body.overrideReason === 'string' ? body.overrideReason.trim() : null;
  if (!allowedStatus.has(status)) return NextResponse.json({ error: 'Invalid recruitment status.' }, { status: 400 });
  if (override && !overrideReason) return NextResponse.json({ error: 'An override reason is required.' }, { status: 400 });

  try {
    const client = db();
    const { data, error } = await client.rpc('laurem_transition_application_status', {
      p_application_id: id,
      p_to_status: status,
      p_actor: session.email,
      p_note: note,
      p_override: override,
      p_override_reason: overrideReason,
    });
    if (error || !data) {
      const message = error?.message || '';
      if (message.includes('APPLICATION_NOT_FOUND')) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
      if (message.includes('STATUS_TRANSITION_BLOCKED')) return NextResponse.json({ error: error?.details || 'The requested transition is blocked by the current lifecycle controls.' }, { status: 409 });
      if (message.includes('OVERRIDE_REASON_REQUIRED')) return NextResponse.json({ error: 'An override reason is required.' }, { status: 400 });
      if (message.includes('INVALID_RECRUITMENT_STATUS')) return NextResponse.json({ error: 'Invalid recruitment status.' }, { status: 400 });
      return NextResponse.json({ error: 'Unable to update application status.' }, { status: 500 });
    }
    console.info(JSON.stringify({ level: 'info', event: 'admin.application.status_changed', actor: session.email, applicationId: id, status, override }));
    return NextResponse.json({ application: data, overridden: override });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.application.status_change_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to update application status.' }, { status: 500 });
  }
}
