import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/token';
import { hashActivationToken, hashPassword } from '@/lib/laurem-staff-auth';
import { sendLauremStaffPasswordReset } from '@/lib/laurem-staff-email';

const RESET_TTL_MINUTES = 30;
const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const GENERIC_MESSAGE = 'If an eligible LAUREM Staff Portal account exists for that email, a password reset link will be sent shortly.';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createResetToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashActivationToken(token) };
}

async function consumeThrottle(client: ReturnType<typeof db>, key: string, max: number, windowSeconds: number) {
  const { data, error } = await client.rpc('laurem_consume_staff_auth_attempt', {
    p_bucket_key: key,
    p_max_attempts: max,
    p_window_seconds: windowSeconds,
    p_lock_seconds: windowSeconds,
  });
  if (error) throw error;
  return Boolean(data?.allowed);
}

export async function POST(request: NextRequest) {
  const client = db();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  try {
    if (!await consumeThrottle(client, `staff-password-reset-ip:${ip}`, 5, 900)) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
    if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });

    if (!await consumeThrottle(client, `staff-password-reset-email:${email}`, 3, 3600)) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const { data: staff } = await client
      .from('staff_profiles')
      .select('id,laurem_id,employee_number,full_name,preferred_name,email,password_hash,employment_status,activated_at')
      .eq('email', email)
      .maybeSingle();

    if (!staff || !staff.activated_at || !['pending', 'active'].includes(staff.employment_status)) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const { token, hash } = createResetToken();
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000).toISOString();

    await client
      .from('staff_password_reset_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('staff_id', staff.id)
      .is('consumed_at', null);

    const { error: insertError } = await client
      .from('staff_password_reset_tokens')
      .insert({ staff_id: staff.id, token_hash: hash, expires_at: expiresAt });

    if (insertError) throw insertError;

    const delivery = await sendLauremStaffPasswordReset(client, staff, token);
    await client.from('staff_security_events').insert({
      staff_id: staff.id,
      event_type: 'staff.password_reset.requested',
      actor: 'staff_password_reset_request',
      ip_address: ip,
      user_agent: request.headers.get('user-agent'),
      details: { delivery_status: delivery.status, expires_at: expiresAt },
    });

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'staff.password_reset.request_failed', reason: error instanceof Error ? error.message : String(error) }));
    return NextResponse.json({ error: 'Unable to process the password reset request right now.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const client = db();
  try {
    if (!await consumeThrottle(client, 'staff-password-reset-complete', 8, 900)) {
      return NextResponse.json({ error: 'Too many password reset attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || password.length < 10) {
      return NextResponse.json({ error: 'A valid reset link and a password of at least 10 characters are required.' }, { status: 400 });
    }

    const hash = hashActivationToken(token);
    const { data: reset } = await client
      .from('staff_password_reset_tokens')
      .select('id,staff_id,expires_at,consumed_at')
      .eq('token_hash', hash)
      .maybeSingle();

    if (!reset || reset.consumed_at || new Date(reset.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This password reset link is invalid or has expired. Request a new reset link.' }, { status: 410 });
    }

    const { data: staff } = await client
      .from('staff_profiles')
      .select('id,laurem_id,employee_number,email,employment_status,activated_at,session_version')
      .eq('id', reset.staff_id)
      .maybeSingle();

    if (!staff || !staff.activated_at || !['pending', 'active'].includes(staff.employment_status)) {
      return NextResponse.json({ error: 'This Staff Portal account is not currently eligible for password reset.' }, { status: 409 });
    }

    const newVersion = Math.max(Number(staff.session_version) || 1, 1) + 1;
    const { error: updateError } = await client
      .from('staff_profiles')
      .update({
        password_hash: hashPassword(password),
        session_version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.id);

    if (updateError) throw updateError;

    const { data: consumed, error: consumeError } = await client
      .from('staff_password_reset_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', reset.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();

    if (consumeError || !consumed) {
      return NextResponse.json({ error: 'This password reset link has already been used or is no longer valid.' }, { status: 409 });
    }

    await client.from('staff_security_events').insert({
      staff_id: staff.id,
      event_type: 'staff.password_reset.completed',
      actor: 'staff_password_reset',
      details: { session_version: newVersion },
    });

    return NextResponse.json({ ok: true, message: 'Your LAUREM Staff Portal password has been changed. You can now sign in with your LAUREM ID or employee number.' });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'staff.password_reset.complete_failed', reason: error instanceof Error ? error.message : String(error) }));
    return NextResponse.json({ error: 'Unable to update the Staff Portal password.' }, { status: 500 });
  }
}
