import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';
import { getLauremNurseSecondInterviewQuestions, type NursePathway } from '@/lib/laurem-nurse-interviews';

const MAX_BODY = 512_000;

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-second-interview-token') || '';
  if (!token) return NextResponse.json({ error: 'Second-interview token is required.' }, { status: 400 });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) {
    return NextResponse.json({ error: 'Interview payload is too large.' }, { status: 413 });
  }
  let body: { answers?: Record<string, string> };
  try {
    body = JSON.parse(raw) as { answers?: Record<string, string> };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const answers = body.answers || {};

  try {
    const client = db();
    const { data: invite, error } = await client
      .from('recruitment_second_interviews')
      .select('id,status,expires_at,application_id')
      .eq('token_hash', hashToken(token))
      .maybeSingle();
    if (error) throw error;
    if (!invite) return NextResponse.json({ error: 'Second-interview invitation not found.' }, { status: 404 });
    if (invite.status === 'completed') return NextResponse.json({ error: 'This second-interview link has already been completed.' }, { status: 409 });
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This second-interview link has expired.' }, { status: 410 });

    if (!invite.application_id) return NextResponse.json({ error: 'This second-interview invitation is not linked to an application.' }, { status: 409 });
    const { data: application, error: applicationError } = await client
      .from('recruitment_applications')
      .select('id,role_applied,living_in_uk')
      .eq('id', invite.application_id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application || !/nurse/i.test(application.role_applied || '')) {
      return NextResponse.json({ error: 'This second-interview invitation is not linked to a valid nursing application.' }, { status: 409 });
    }

    const pathway: NursePathway = application.living_in_uk === 'No' ? 'international' : 'uk';
    const questions = getLauremNurseSecondInterviewQuestions(pathway);
    for (const question of questions) {
      if (typeof answers[question.id] !== 'string' || !answers[question.id].trim()) return NextResponse.json({ error: `Please answer question ${question.id}.` }, { status: 400 });
      if (answers[question.id].length > 6000) return NextResponse.json({ error: 'One or more answers are too long.' }, { status: 400 });
    }

    const { data: completed, error: updateError } = await client
      .from('recruitment_second_interviews')
      .update({ status: 'completed', answers, completed_at: new Date().toISOString() })
      .eq('id', invite.id)
      .eq('status', 'sent')
      .select('id,status')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!completed) return NextResponse.json({ error: 'This second-interview link has already been completed.' }, { status: 409 });

    return NextResponse.json({ ok: true, status: 'completed' }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'second_interview.submit_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to submit second interview.' }, { status: 500 });
  }
}
