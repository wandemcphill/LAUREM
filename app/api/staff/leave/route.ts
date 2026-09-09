import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

function inclusiveDays(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Number(((b - a) / 86400000 + 1).toFixed(2));
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data, error } = await db().from('staff_leave_requests')
    .select('id,leave_type,start_date,end_date,total_days,reason,status,reviewed_by,reviewed_at,review_note,created_at,updated_at')
    .eq('staff_id', session.staff_id)
    .order('start_date', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Unable to load leave requests.' }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const input = body ?? {};
  const leaveType = typeof input.leaveType === 'string' ? input.leaveType : '';
  const startDate = typeof input.startDate === 'string' ? input.startDate : '';
  const endDate = typeof input.endDate === 'string' ? input.endDate : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!['annual', 'sick', 'family', 'unpaid', 'other'].includes(leaveType)) return NextResponse.json({ error: 'Invalid leave type.' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return NextResponse.json({ error: 'Valid start and end dates are required.' }, { status: 400 });
  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays === null) return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 400 });
  const { data, error } = await db().from('staff_leave_requests').insert({ staff_id: session.staff_id, leave_type: leaveType, start_date: startDate, end_date: endDate, total_days: totalDays, reason: reason || null, status: 'pending' }).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to submit leave request.' }, { status: 500 });
  return NextResponse.json({ request: data }, { status: 201 });
}
