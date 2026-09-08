import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { hashToken, makeToken } from '@/lib/token';
import { lauremCompany } from '@/lib/laurem-company-config';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  let body: { candidateName?: string; candidateEmail?: string; role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const candidateName = body.candidateName?.trim() || '';
  const candidateEmail = body.candidateEmail?.trim() || '';
  const role = body.role?.trim() || 'Registered Nurse';
  if (!candidateName || !candidateEmail) return NextResponse.json({ error: 'Candidate name and email are required.' }, { status: 400 });
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await db().from('recruitment_invites').insert({ candidate_name: candidateName, candidate_email: candidateEmail, role, token_hash: hashToken(token), expires_at: expiresAt }).select('id,candidate_name,candidate_email,role,expires_at').single();
    if (error) throw error;
    return NextResponse.json({ invite: data, link: `${lauremCompany.website.replace(/\/$/, '')}/apply/${token}` }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.invite.create_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to create invitation.' }, { status: 500 });
  }
}
