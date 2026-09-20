import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data: staff } = await db().from('staff_profiles')
    .select('id,laurem_id,employee_number,full_name,email,phone,job_title,employment_status,start_date,location,portal_handle,portal_address')
    .eq('id', session.staff_id).maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Staff profile not found.' }, { status: 404 });
  return NextResponse.json({ staff });
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  if (!phone) return NextResponse.json({ error: 'A phone number is required.' }, { status: 400 });

  const client = db();
  const { data, error } = await client.from('staff_profiles')
    .update({ phone, updated_at: new Date().toISOString() })
    .eq('id', session.staff_id)
    .select('id,laurem_id,employee_number,full_name,email,phone,job_title,employment_status,start_date,location,portal_handle,portal_address')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Unable to update your profile.' }, { status: 500 });
  await client.from('workforce_audit_events').insert({
    staff_id: session.staff_id,
    entity_type: 'staff_profile',
    entity_id: session.staff_id,
    event_type: 'staff.self_service_profile_updated',
    actor: session.email,
    details: { fields: ['phone'] },
  });

  return NextResponse.json({ staff: data });
}
