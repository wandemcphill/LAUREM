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
  const activationTokenHash = hashActivationToken(token);
  const { data: candidate } = await client.from('staff_profiles')
    .select('id,laurem_id,employee_number,email,session_version')
    .eq('email', email)
    .eq('activation_token_hash', activationTokenHash)
    .maybeSingle();

  if (!candidate) return NextResponse.json({ error: 'This activation link is invalid or expired.' }, { status: 400 });

  const expectedSessionVersion = Math.max(candidate.session_version || 1, 1);
  const tokenForSession = createStaffSession({
    id: candidate.id,
    laurem_id: candidate.laurem_id || candidate.employee_number,
    email: candidate.email,
    session_version: expectedSessionVersion + 1,
  });
  const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_SECONDS * 1000).toISOString();

  const { data: updated, error } = await client.rpc('laurem_activate_staff_account_with_session', {
    p_email: email,
    p_token_hash: activationTokenHash,
    p_password_hash: hashPassword(password),
    p_session_token_hash: hashActivationToken(tokenForSession),
    p_session_expires_at: expiresAt,
    p_expected_session_version: expectedSessionVersion,
    p_ip_address: requestIp(req),
    p_user_agent: req.headers.get('user-agent'),
  });
  if (error || !updated) {
    const reason = error?.message || '';
    if (reason.includes('ACTIVATION_INVALID') || reason.includes('ACTIVATION_EXPIRED') || reason.includes('ACTIVATION_USED') || reason.includes('ACTIVATION_CHANGED')) {
      return NextResponse.json({ error: 'This activation link is invalid or expired. Please request a new activation link.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to activate staff account.' }, { status: 500 });
  }

  const mailbox = await ensureLauremMailbox(client, updated);
  const response = NextResponse.json({ ok: true, staff: {
    laurem_id: updated.laurem_id || updated.employee_number,
    address: mailbox ? `${mailbox.handle}@${mailbox.namespace}` : null,
  } });
  setStaffSession(response, tokenForSession);
  return response;
}
