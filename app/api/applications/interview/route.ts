import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';
import { getLauremNurseFirstInterviewQuestions, type NursePathway } from '@/lib/laurem-nurse-interviews';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-invitation-token') || '';
  if (!token) return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 });
  let body: { pathway?: NursePathway; answers?: Record<string, string> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  const pathway = body.pathway === 'international' ? 'international' : 'uk';
  const answers = body.answers || {};
  const questions = getLauremNurseFirstInterviewQuestions(pathway);
  for (const question of questions) {
    if (typeof answers[question.id] !== 'string' || !answers[question.id].trim()) {
      return NextResponse.json({ error: `Please answer question ${question.id}.` }, { status: 400 });
    }
    if (answers[question.id].length > 6000) return NextResponse.json({ error: 'One or more answers are too long.' }, { status: 400 });
  }

  try {
    const client = db();
    const invite = await client.from('recruitment_invites').select('id,role,used_at,expires_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (invite.error) throw invite.error;
    if (!invite.data) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    if (invite.data.used_at) return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 409 });
    if (invite.data.expires_at && new Date(invite.data.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    if (invite.data.role && !/nurse/i.test(invite.data.role)) return NextResponse.json({ error: 'This invitation is not for a nursing application.' }, { status: 400 });

    const { error } = await client.from('recruitment_nurse_interview_responses').insert({ invite_id: invite.data.id, pathway, answers });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'nurse_interview.submit_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to submit the nursing interview right now.' }, { status: 500 });
  }
}
