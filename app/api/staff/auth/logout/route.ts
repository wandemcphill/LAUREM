import { NextRequest, NextResponse } from 'next/server';
import { clearStaffSession, getStaffSession } from '@/lib/laurem-staff-auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req);
  if (session) {
    const client = db();
    await client.from('staff_profiles').update({ session_version: session.session_version + 1, updated_at: new Date().toISOString() }).eq('id', session.staff_id);
  }
  const response = NextResponse.json({ ok: true });
  clearStaffSession(response);
  return response;
}
