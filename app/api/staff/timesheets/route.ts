import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

function hoursBetween(clockIn: string, clockOut: string, breakMinutes: number) {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const minutes = Math.max(0, Math.round((end - start) / 60000) - breakMinutes);
  return Number((minutes / 60).toFixed(2));
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data, error } = await db().from('staff_timesheets')
    .select('id,assignment_id,work_date,clock_in,clock_out,break_minutes,total_hours,status,notes,approved_by,approved_at,created_at,updated_at')
    .eq('staff_id', session.staff_id)
    .order('work_date', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Unable to load timesheets.' }, { status: 500 });
  return NextResponse.json({ timesheets: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const workDate = typeof body?.workDate === 'string' ? body.workDate : '';
  const clockIn = typeof body?.clockIn === 'string' ? body.clockIn : '';
  const clockOut = typeof body?.clockOut === 'string' ? body.clockOut : '';
  const breakMinutes = Number.isInteger(body?.breakMinutes) ? Number(body.breakMinutes) : 0;
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !clockIn || !clockOut || breakMinutes < 0 || breakMinutes > 480) {
    return NextResponse.json({ error: 'Work date, clock-in, clock-out and a valid break duration are required.' }, { status: 400 });
  }
  const totalHours = hoursBetween(clockIn, clockOut, breakMinutes);
  if (totalHours === null) return NextResponse.json({ error: 'Clock-out must be later than clock-in.' }, { status: 400 });

  const assignmentId = typeof body?.assignmentId === 'string' ? body.assignmentId : null;
  const client = db();
  if (assignmentId) {
    const { data: assignment } = await client.from('staff_assignments').select('id').eq('id', assignmentId).eq('staff_id', session.staff_id).maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  const { data: created, error } = await client.from('staff_timesheets').insert({
    staff_id: session.staff_id,
    assignment_id: assignmentId,
    work_date: workDate,
    clock_in: new Date(clockIn).toISOString(),
    clock_out: new Date(clockOut).toISOString(),
    break_minutes: breakMinutes,
    total_hours: totalHours,
    status: 'submitted',
    notes: notes || null,
  }).select('id,assignment_id,work_date,clock_in,clock_out,break_minutes,total_hours,status,notes,created_at,updated_at').single();
  if (error || !created) return NextResponse.json({ error: 'Unable to submit timesheet.' }, { status: 500 });
  return NextResponse.json({ timesheet: created }, { status: 201 });
}
