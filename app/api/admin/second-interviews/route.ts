import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { makeToken, hashToken } from '@/lib/token';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: app } = await client.from('recruitment_applications').select('id,full_name,email,role_applied').eq('id', applicationId).maybeSingle();
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    const token = makeToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client.from('recruitment_second_interviews').insert({ application_id: applicationId, token_hash: hashToken(token), status: 'sent', sent_by: session.email, expires_at: expiresAt }).select('id,application_id,status,sent_at,expires_at').single();
    if (error) throw error;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    return NextResponse.json({ secondInterview: data, link: `${appUrl}/second-interview/${token}` }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.second_interview.create_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to create second-interview invitation.' }, { status: 500 });
  }
}
