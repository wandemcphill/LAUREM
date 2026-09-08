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
      .select('*')
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
  let body: { status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const status = body.status?.trim() || '';
  if (!allowedStatus.has(status)) return NextResponse.json({ error: 'Invalid recruitment status.' }, { status: 400 });
  try {
    const { data, error } = await db()
      .from('recruitment_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,full_name,email,role_applied,status,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    console.info(JSON.stringify({ level: 'info', event: 'admin.application.status_changed', actor: session.email, applicationId: id, status }));
    return NextResponse.json({ application: data });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.application.status_change_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to update application status.' }, { status: 500 });
  }
}
