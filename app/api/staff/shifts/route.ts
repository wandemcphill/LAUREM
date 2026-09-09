import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const client = db();
  const now = new Date().toISOString();
  const { data, error } = await client.from('staff_assignments')
    .select('id,client_name,location,scheduled_start,scheduled_end,status,notes')
    .eq('staff_id', session.staff_id)
    .gte('scheduled_end', now)
    .neq('status', 'cancelled')
    .order('scheduled_start', { ascending: true });
  if (error) return NextResponse.json({ error: 'Unable to load shifts.' }, { status: 500 });
  return NextResponse.json({ shifts: data || [] });
}
