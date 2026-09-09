import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { ensureLauremOnboardingReadiness, getLauremOnboardingReadiness } from '@/lib/laurem-onboarding-readiness';

const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'waived', 'expired', 'superseded']);

function readinessKeyForEvidenceType(evidenceType: string) {
  const key = evidenceType.trim().toLowerCase().replace(/\s+/g, '_');
  const aliases: Record<string, string> = {
    identity: 'identity_verified',
    identity_document: 'identity_verified',
    passport: 'identity_verified',
    qualification: 'qualification_evidence_verified',
    qualification_evidence: 'qualification_evidence_verified',
    training: 'qualification_evidence_verified',
    reference: 'references_verified',
    references: 'references_verified',
    right_to_work: 'right_to_work_verified',
    work_permission: 'international_work_permission_verified',
    international_work_permission: 'international_work_permission_verified',
    nmc_registration: 'professional_registration_verified',
    professional_registration: 'professional_registration_verified',
  };
  return aliases[key] || null;
}

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const applicationId = new URL(request.url).searchParams.get('applicationId') || '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });

  try {
    const client = db();
    const { data: application, error: appError } = await client
      .from('recruitment_applications')
      .select('id,role_applied,living_in_uk')
      .eq('id', applicationId)
      .maybeSingle();
    if (appError) throw appError;
    if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    const { data: reviews, error } = await client
      .from('recruitment_evidence_reviews')
      .select('id,application_id,evidence_type,document_id,status,reviewed_by,reviewed_at,review_note,metadata,created_at,updated_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ evidence: reviews || [], readiness: await getLauremOnboardingReadiness(client, application) });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.evidence.list_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to load recruitment evidence.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  const evidenceType = typeof body?.evidenceType === 'string' ? body.evidenceType.trim() : '';
  const documentId = typeof body?.documentId === 'string' ? body.documentId : null;
  const status = typeof body?.status === 'string' ? body.status : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (!applicationId || !evidenceType || !allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'applicationId, evidenceType and a valid status are required.' }, { status: 400 });
  }
  if (['rejected', 'waived'].includes(status) && !note) {
    return NextResponse.json({ error: 'A review note is required for rejected or waived evidence.' }, { status: 400 });
  }

  try {
    const client = db();
    const { data: application, error: appError } = await client
      .from('recruitment_applications')
      .select('id,role_applied,living_in_uk')
      .eq('id', applicationId)
      .maybeSingle();
    if (appError) throw appError;
    if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    if (documentId) {
      const { data: document, error: documentError } = await client
        .from('recruitment_documents')
        .select('id,application_id')
        .eq('id', documentId)
        .maybeSingle();
      if (documentError) throw documentError;
      if (!document || document.application_id !== applicationId) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const { data: review, error: reviewError } = await client.rpc('laurem_record_evidence_review', {
      p_application_id: applicationId,
      p_evidence_type: evidenceType,
      p_document_id: documentId,
      p_status: status,
      p_actor: session.email,
      p_note: note || null,
      p_metadata: {},
    });
    if (reviewError) throw reviewError;

    const readinessKey = readinessKeyForEvidenceType(evidenceType);
    if (readinessKey) {
      await ensureLauremOnboardingReadiness(client, application);
      const { error: checklistError } = await client.from('recruitment_onboarding_checklist')
        .update({
          status: status === 'approved' ? 'completed' : status === 'waived' ? 'waived' : 'pending',
          completed_at: status === 'approved' || status === 'waived' ? new Date().toISOString() : null,
          completed_by: status === 'approved' || status === 'waived' ? session.email : null,
          notes: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('application_id', applicationId)
        .eq('item_key', readinessKey);
      if (checklistError) throw checklistError;
    }

    if (documentId && ['approved', 'rejected', 'pending'].includes(status)) {
      const { error: documentUpdateError } = await client.from('recruitment_documents').update({
        status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
        reviewed_by: session.email,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      }).eq('id', documentId).eq('application_id', applicationId);
      if (documentUpdateError) throw documentUpdateError;
    }

    return NextResponse.json({ evidence: review, readiness: await getLauremOnboardingReadiness(client, application) }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.evidence.review_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to record evidence review.' }, { status: 500 });
  }
}
