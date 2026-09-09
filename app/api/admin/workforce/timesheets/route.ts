import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const status = new URL(request.url).searchParams.get('status');
  let query = db().from('staff_timesheets').select('id,staff_id,assignment_id,work_date,clock_in,clock_out,break_minutes,total_hours,status,notes,approved_by,approved_at,created_at,updated_at,staff_profiles(full_name,email,job_title,employee_number)').order('work_date', { ascending: false }).limit(200);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load timesheets.' }, { status: 500 });
  return NextResponse.json({ timesheets: data || [] });
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nextStatus = typeof body?.status === 'string' ? body.status : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (!id) return NextResponse.json({ error: 'Timesheet id is required.' }, { status: 400 });
  if (!['approved', 'rejected', 'paid'].includes(nextStatus)) return NextResponse.json({ error: 'Invalid timesheet status.' }, { status: 400 });
  const now = new Date().toISOString();
  const { data: current, error: readError } = await db().from('staff_timesheets').select('id,status').eq('id', id).maybeSingle();
  if (readError) return NextResponse.json({ error: 'Unable to load timesheet.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Timesheet not found.' }, { status: 404 });
  if (nextStatus === 'paid' && current.status !== 'approved') return NextResponse.json({ error: 'Only an approved timesheet can be marked paid.' }, { status: 409 });
  const { data, error } = await db().from('staff_timesheets').update({ status: nextStatus, approved_by: session.email, approved_at: now, notes: note || undefined, updated_at: now }).eq('id', id).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to update timesheet.' }, { status: 500 });
  return NextResponse.json({ timesheet: data });
}
