import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const status = new URL(request.url).searchParams.get('status');
  let query = db().from('staff_leave_requests').select('id,staff_id,leave_type,start_date,end_date,total_days,reason,status,reviewed_by,reviewed_at,review_note,created_at,updated_at,staff_profiles(full_name,email,job_title,employee_number)').order('start_date', { ascending: false }).limit(200);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load leave requests.' }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nextStatus = typeof body?.status === 'string' ? body.status : '';
  const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim() : '';
  if (!id) return NextResponse.json({ error: 'Leave request id is required.' }, { status: 400 });
  if (!['approved', 'rejected', 'cancelled'].includes(nextStatus)) return NextResponse.json({ error: 'Invalid leave status.' }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await db().from('staff_leave_requests').update({ status: nextStatus, reviewed_by: session.email, reviewed_at: now, review_note: reviewNote || null, updated_at: now }).eq('id', id).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to update leave request.' }, { status: 500 });
  return NextResponse.json({ request: data });
}
