import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';

const MAX_BODY = 2_000_000;

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-invitation-token') || '';
  if (!token) return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) return NextResponse.json({ error: 'Application payload is too large.' }, { status: 413 });
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  const fullName = typeof payload.full_name === 'string' ? payload.full_name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const role = typeof payload.role_applied === 'string' ? payload.role_applied.trim() : '';
  if (!fullName || !email || !role) return NextResponse.json({ error: 'Full name, email and role are required.' }, { status: 400 });
  if (payload.living_in_uk === 'No' && (!payload.current_country || !payload.relocation_readiness)) {
    return NextResponse.json({ error: 'Current country and relocation readiness are required for international applicants.' }, { status: 400 });
  }

  try {
    const client = db();
    const { data, error } = await client.rpc('create_recruitment_application', {
      p_token_hash: hashToken(token),
      p_payload: { ...payload, full_name: fullName, email, role_applied: role },
    });
    if (error) {
      const message = typeof error.message === 'string' ? error.message : '';
      if (message === 'INVITATION_USED') return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 409 });
      if (message === 'INVITATION_EXPIRED') return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
      if (message === 'INVITATION_NOT_FOUND') return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
      if (message === 'INVITATION_ROLE_MISMATCH') return NextResponse.json({ error: 'This invitation is for a different role.' }, { status: 409 });
      if (message === 'ROLE_REQUIRED') return NextResponse.json({ error: 'The application role is required.' }, { status: 400 });
      if (message === 'CONSENT_REQUIRED') return NextResponse.json({ error: 'You must provide consent before submitting the application.' }, { status: 400 });
      throw error;
    }
    return NextResponse.json({ application: data }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'application.submit_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to submit the application right now.' }, { status: 500 });
  }
}
