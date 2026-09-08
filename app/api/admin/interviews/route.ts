import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  const scheduledAt = typeof body?.scheduledAt === 'string' ? body.scheduledAt : '';
  const durationMinutes = Number(body?.durationMinutes || 60);
  if (!applicationId || !scheduledAt) return NextResponse.json({ error: 'Application and interview date/time are required.' }, { status: 400 });
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) return NextResponse.json({ error: 'Interview duration must be between 15 and 240 minutes.' }, { status: 400 });
  try {
    const client = db();
    const { data: application } = await client.from('recruitment_applications').select('id,full_name,email').eq('id', applicationId).maybeSingle();
    if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    const { data, error } = await client.from('recruitment_interviews').insert({ application_id: applicationId, scheduled_at: scheduledAt, duration_minutes: durationMinutes, location: typeof body?.location === 'string' ? body.location : 'Online', meeting_link: typeof body?.meetingLink === 'string' ? body.meetingLink : null, interviewer: typeof body?.interviewer === 'string' ? body.interviewer : session.email, candidate_instructions: typeof body?.candidateInstructions === 'string' ? body.candidateInstructions : null, status: 'Scheduled' }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ interview: data }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.interview.schedule_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to schedule interview.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Interview id is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = typeof body?.status === 'string' ? body.status : undefined;
  const allowed = new Set(['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-show']);
  if (status && !allowed.has(status)) return NextResponse.json({ error: 'Invalid interview status.' }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (typeof body?.scheduledAt === 'string') patch.scheduled_at = body.scheduledAt;
  if (typeof body?.meetingLink === 'string') patch.meeting_link = body.meetingLink;
  if (typeof body?.interviewer === 'string') patch.interviewer = body.interviewer;
  if (typeof body?.cancellationReason === 'string') patch.cancellation_reason = body.cancellationReason;
  try {
    const { data, error } = await db().from('recruitment_interviews').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Interview not found.' }, { status: 404 });
    return NextResponse.json({ interview: data });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.interview.update_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to update interview.' }, { status: 500 });
  }
}
