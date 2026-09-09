import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createStaffSession, hashActivationToken, setStaffSession, requestIp, STAFF_SESSION_TTL_SECONDS } from '@/lib/laurem-staff-auth';
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
  const { data: updated, error } = await client.rpc('laurem_activate_staff_account', {
    p_email: email,
    p_token_hash: hashActivationToken(token),
    p_password_hash: hashPassword(password),
    p_ip_address: requestIp(req),
    p_user_agent: req.headers.get('user-agent'),
  });
  if (error || !updated) {
    const reason = error?.message || '';
    if (reason.includes('ACTIVATION_INVALID')) return NextResponse.json({ error: 'This activation link is invalid or expired.' }, { status: 400 });
    return NextResponse.json({ error: 'Unable to activate staff account.' }, { status: 500 });
  }

  const mailbox = await ensureLauremMailbox(client, updated);
  const tokenForSession = createStaffSession({
    id: updated.id,
    laurem_id: updated.laurem_id || updated.employee_number,
    email: updated.email,
    session_version: updated.session_version,
  });
  const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_SECONDS * 1000).toISOString();
  const { error: sessionError } = await client.from('staff_portal_sessions').insert({
    staff_id: updated.id,
    token_hash: hashActivationToken(tokenForSession),
    expires_at: expiresAt,
    ip_address: requestIp(req),
    user_agent: req.headers.get('user-agent'),
  });
  if (sessionError) return NextResponse.json({ error: 'Account activated, but the staff session could not be created.' }, { status: 500 });

  const response = NextResponse.json({ ok: true, staff: {
    laurem_id: updated.laurem_id || updated.employee_number,
    address: `${mailbox.handle}@${mailbox.namespace}`,
  } });
  setStaffSession(response, tokenForSession);
  return response;
}
