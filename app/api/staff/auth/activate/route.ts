import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createStaffSession, hashActivationToken, setStaffSession } from '@/lib/laurem-staff-auth';
import { ensureLauremMailbox } from '@/lib/laurem-messaging';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!token || !email || password.length < 10) {
    return NextResponse.json({ error: 'A valid activation token, email and password of at least 10 characters are required.' }, { status: 400 });
  }

  const client = db();
  const { data: staff } = await client.from('staff_profiles')
    .select('*').eq('email', email).eq('activation_token_hash', hashActivationToken(token)).maybeSingle();
  if (!staff || !staff.activation_expires_at || new Date(staff.activation_expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'This activation link is invalid or expired.' }, { status: 400 });
  }

  const { data: updated, error } = await client.from('staff_profiles').update({
    password_hash: hashPassword(password),
    activation_token_hash: null,
    activation_expires_at: null,
    activated_at: new Date().toISOString(),
    employment_status: 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', staff.id).select('*').single();
  if (error || !updated) return NextResponse.json({ error: 'Unable to activate staff account.' }, { status: 500 });

  const mailbox = await ensureLauremMailbox(client, updated);
  const response = NextResponse.json({ ok: true, staff: {
    laurem_id: updated.laurem_id || updated.employee_number,
    address: `${mailbox.handle}@${mailbox.namespace}`,
  } });
  setStaffSession(response, createStaffSession({
    id: updated.id,
    laurem_id: updated.laurem_id || updated.employee_number,
    email: updated.email,
    session_version: updated.session_version,
  }));
  return response;
}
