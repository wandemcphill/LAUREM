import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createStaffSession, setStaffSession } from '@/lib/laurem-staff-auth';

const IDENTIFIER = /^[A-Z0-9-]{3,64}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.laurem_id === 'string' ? body.laurem_id.trim().toUpperCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!id || !password) return NextResponse.json({ error: 'LAUREM ID and password are required.' }, { status: 400 });
  if (!IDENTIFIER.test(id)) return NextResponse.json({ error: 'Invalid LAUREM ID or password.' }, { status: 401 });

  const { data: staff } = await db().from('staff_profiles')
    .select('id,laurem_id,employee_number,email,full_name,password_hash,employment_status,session_version')
    .or(`laurem_id.eq.${id},employee_number.eq.${id}`).maybeSingle();
  if (!staff || !staff.password_hash || !['pending', 'active'].includes(staff.employment_status) || !verifyPassword(password, staff.password_hash)) {
    return NextResponse.json({ error: 'Invalid LAUREM ID or password.' }, { status: 401 });
  }

  const now = new Date().toISOString();
  await db().from('staff_profiles').update({ last_login_at: now, updated_at: now }).eq('id', staff.id);
  const response = NextResponse.json({ ok: true, staff: { laurem_id: staff.laurem_id || staff.employee_number, full_name: staff.full_name } });
  setStaffSession(response, createStaffSession({
    id: staff.id,
    laurem_id: staff.laurem_id || staff.employee_number,
    email: staff.email,
    session_version: staff.session_version,
  }));
  return response;
}
