import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';
import { getLauremNurseSecondInterviewQuestions } from '@/lib/laurem-nurse-interviews';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-second-interview-token') || '';
  if (!token) return NextResponse.json({ error: 'Second-interview token is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as { answers?: Record<string, string> } | null;
  const answers = body?.answers || {};
  const questions = getLauremNurseSecondInterviewQuestions('uk');
  for (const question of questions) {
    if (typeof answers[question.id] !== 'string' || !answers[question.id].trim()) return NextResponse.json({ error: `Please answer question ${question.id}.` }, { status: 400 });
    if (answers[question.id].length > 6000) return NextResponse.json({ error: 'One or more answers are too long.' }, { status: 400 });
  }
  try {
    const client = db();
    const { data: invite, error } = await client.from('recruitment_second_interviews').select('id,status,expires_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (error) throw error;
    if (!invite) return NextResponse.json({ error: 'Second-interview invitation not found.' }, { status: 404 });
    if (invite.status === 'completed') return NextResponse.json({ error: 'This second-interview link has already been completed.' }, { status: 409 });
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This second-interview link has expired.' }, { status: 410 });
    const { error: updateError } = await client.from('recruitment_second_interviews').update({ status: 'completed', answers, completed_at: new Date().toISOString() }).eq('id', invite.id).eq('status', 'sent');
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, status: 'completed' }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'second_interview.submit_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to submit second interview.' }, { status: 500 });
  }
}
