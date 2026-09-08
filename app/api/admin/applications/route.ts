import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const { data, error } = await db().from('recruitment_applications').select('id,full_name,email,phone,role_applied,country_of_residence,living_in_uk,status,created_at,updated_at').order('created_at', { ascending: false }).limit(250);
    if (error) throw error;
    return NextResponse.json({ applications: data || [], recruiter: session.email });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.applications.list_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to load applications.' }, { status: 500 });
  }
}
