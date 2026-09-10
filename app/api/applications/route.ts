import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';
import { normalizeLauremRole } from '@/lib/laurem-role-policy';
import { selectRound1Questions } from '@/lib/laurem-interview-engine';
import { ROUND1_PASS_PERCENT, ROUND1_QUESTIONS_PER_ATTEMPT } from '@/lib/laurem-interview-banks';
import { lauremCompany } from '@/lib/laurem-company-config';
import { sendLauremEmail } from '@/lib/laurem-email';

const MAX_BODY = 2_000_000;
function appUrl(){return(process.env.NEXT_PUBLIC_APP_URL||'https://recruitment.lauremcare.com').replace(/\/$/,'');}
function escapeHtml(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

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
  const pathway = payload.pathway === 'uk' || payload.pathway === 'international' ? payload.pathway : '';
  if (!fullName || !email || !role) return NextResponse.json({ error: 'Full name, email and role are required.' }, { status: 400 });
  if (!pathway) return NextResponse.json({ error: 'Please choose your application pathway.' }, { status: 400 });
  if (pathway === 'international' && (!payload.current_country || !payload.relocation_readiness)) return NextResponse.json({ error: 'Current country and relocation readiness are required for international applicants.' }, { status: 400 });

  try {
    const client = db();
    const { data, error } = await client.rpc('create_recruitment_application', {
      p_token_hash: hashToken(token),
      p_payload: { ...payload, full_name: fullName, email, role_applied: role, pathway, living_in_uk: pathway === 'uk' ? 'Yes' : 'No' },
    });
    if (error) {
      const message = typeof error.message === 'string' ? error.message : '';
      if (message === 'INVITATION_USED') return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 409 });
      if (message === 'INVITATION_EXPIRED') return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
      if (message === 'INVITATION_NOT_FOUND') return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
      if (message === 'INVITATION_ROLE_MISMATCH') return NextResponse.json({ error: 'This invitation is for a different role.' }, { status: 409 });
      if (message === 'CARE_ROLE_IN_COUNTRY_ONLY') return NextResponse.json({ error: 'This care role can only be sponsored through an eligible in-country visa switch route. Applicants must already be in the UK.' }, { status: 409 });
      if (message === 'ROLE_REQUIRED') return NextResponse.json({ error: 'The application role is required.' }, { status: 400 });
      if (message === 'PATHWAY_REQUIRED') return NextResponse.json({ error: 'Please choose your application pathway.' }, { status: 400 });
      if (message === 'CONSENT_REQUIRED') return NextResponse.json({ error: 'You must provide consent before submitting the application.' }, { status: 400 });
      throw error;
    }

    const application = Array.isArray(data) ? data[0] : data;
    const canonicalRole = normalizeLauremRole(application?.role_applied || role);
    if (!application?.id || !canonicalRole) throw new Error('Application created without a valid role.');

    const selected = selectRound1Questions(canonicalRole);
    const snapshot = selected.map(q => ({ id:q.id, category:q.category, text:q.text, options:q.options, correctIndex:q.correctIndex }));
    const { error: attemptError } = await client.from('interview_attempts').insert({
      application_id: application.id,
      invite_id: application.invite_id,
      round: 1,
      role: canonicalRole,
      pathway,
      question_ids: selected.map(q=>q.id),
      question_snapshot: snapshot,
      status: 'in_progress',
      total_questions: ROUND1_QUESTIONS_PER_ATTEMPT,
      pass_percent: ROUND1_PASS_PERCENT,
    });
    if (attemptError && !String(attemptError.message).toLowerCase().includes('duplicate')) throw attemptError;
    await client.from('recruitment_applications').update({ status:'Interview', updated_at:new Date().toISOString() }).eq('id',application.id).eq('status','Application');

    const link=`${appUrl()}/interview/${token}`;
    const safeName=escapeHtml(fullName); const safeRole=escapeHtml(canonicalRole); const safeLink=escapeHtml(link);
    await sendLauremEmail(client,{eventType:'round1_assessment_invitation',entityId:application.id,idempotencyKey:`round1-assessment:${application.id}`,payload:{from:lauremCompany.candidateCommunications.senderAddress,to:[email],reply_to:lauremCompany.candidateCommunications.replyToAddress,subject:`Your first assessment with ${lauremCompany.tradingName}`,text:`Dear ${fullName},\n\nThank you for completing your ${canonicalRole} application with ${lauremCompany.tradingName}. The next stage is a short online assessment with ${ROUND1_QUESTIONS_PER_ATTEMPT} questions selected for your role. There is no timer.\n\nStart here:\n${link}\n\nKind regards,\n${lauremCompany.tradingName} Recruitment`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">${escapeHtml(lauremCompany.tradingName.toUpperCase())} RECRUITMENT</p><h1 style="font-size:28px">Your first assessment is ready</h1><p>Dear ${safeName},</p><p>Thank you for completing your <strong>${safeRole}</strong> application.</p><p>The next stage is a short role-based assessment with <strong>${ROUND1_QUESTIONS_PER_ATTEMPT} questions</strong> selected for you. There is no timer, and you can take your time.</p><p><a href="${safeLink}" style="display:inline-block;background:#173a31;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Start the assessment</a></p><p>Kind regards,<br>${escapeHtml(lauremCompany.tradingName)} Recruitment</p></div>`}});

    return NextResponse.json({ application, interviewUrl:link, assessment:{questions:ROUND1_QUESTIONS_PER_ATTEMPT,passPercent:ROUND1_PASS_PERCENT} }, { status:201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'application.submit_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to submit the application right now.' }, { status: 500 });
  }
}
