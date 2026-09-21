import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken, makeToken } from '@/lib/token';
import { lauremCompany } from '@/lib/laurem-company-config';
import { sendLauremEmail } from '@/lib/laurem-email';
import { getLauremRecruitmentDocumentPack } from '@/lib/laurem-recruitment-documents';

async function loadContract(request: NextRequest) {
  const token = request.headers.get('x-contract-token') || new URL(request.url).searchParams.get('token') || '';
  if (!token) return { error: NextResponse.json({ error: 'Contract token is required.' }, { status: 400 }) } as const;
  const client = db();
  const { data: tokenRow, error } = await client.from('recruitment_contract_tokens').select('id,contract_id,expires_at,used_at').eq('token_hash', hashToken(token)).maybeSingle();
  if (error) throw error;
  if (!tokenRow) return { error: NextResponse.json({ error: 'Contract link not found.' }, { status: 404 }) } as const;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() <= Date.now()) return { error: NextResponse.json({ error: 'This contract link has expired.' }, { status: 410 }) } as const;
  if (tokenRow.used_at) return { error: NextResponse.json({ error: 'This contract link has already been used.' }, { status: 409 }) } as const;
  const { data: contract, error: contractError } = await client.from('recruitment_contracts').select('*').eq('id', tokenRow.contract_id).maybeSingle();
  if (contractError) throw contractError;
  if (!contract) return { error: NextResponse.json({ error: 'Contract not found.' }, { status: 404 }) } as const;
  if (!['issued', 'viewed'].includes(String(contract.status))) {
    return { error: NextResponse.json({ error: 'This contract is not yet available for candidate review.' }, { status: 409 }) } as const;
  }
  return { client, tokenRow, contract } as const;
}

function rpcErrorResponse(code: string) {
  switch (code) {
    case 'TOKEN_NOT_FOUND': return NextResponse.json({ error: 'Contract link not found.' }, { status: 404 });
    case 'TOKEN_EXPIRED': return NextResponse.json({ error: 'This contract link has expired.' }, { status: 410 });
    case 'TOKEN_USED': return NextResponse.json({ error: 'This contract link has already been used.' }, { status: 409 });
    case 'CONTRACT_NOT_FOUND': return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    case 'CONTRACT_UNAVAILABLE': return NextResponse.json({ error: 'This contract is not available for acceptance.' }, { status: 409 });
    case 'NAME_REQUIRED': return NextResponse.json({ error: 'Your full name is required to accept the contract.' }, { status: 400 });
    case 'ATTESTATION_REQUIRED': return NextResponse.json({ error: 'Electronic-signature attestation is required.' }, { status: 400 });
    case 'ATTESTATION_INVALID': return NextResponse.json({ error: 'Invalid electronic-signature attestation.' }, { status: 400 });
    case 'INVALID_IP': return NextResponse.json({ error: 'Unable to record the signing environment.' }, { status: 400 });
    case 'INVALID_ACTION': return NextResponse.json({ error: 'Invalid contract action.' }, { status: 400 });
    case 'TOKEN_CONSUMPTION_RACE': return NextResponse.json({ error: 'This contract link has already been processed.' }, { status: 409 });
    default: return NextResponse.json({ error: 'Unable to process the contract request.' }, { status: 409 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const loaded = await loadContract(request);
    if ('error' in loaded) return loaded.error;
    let contract = loaded.contract;
    if (contract.status === 'issued') {
      const { data: viewed, error } = await loaded.client.from('recruitment_contracts').update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', contract.id).eq('status', 'issued').select('*').maybeSingle();
      if (error) throw error;
      contract = viewed || contract;
    }
    return NextResponse.json({ contract });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'contract.load_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to load employment contract.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-contract-token') || '';
  if (!token) return NextResponse.json({ error: 'Contract token is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as { accepted?: boolean; acceptedByName?: string; declineReason?: string; signatureData?: string; attestation?: string } | null;
  try {
    const loaded = await loadContract(request);
    if ('error' in loaded) return loaded.error;
    const action = body?.accepted ? 'accept' : 'decline';
    const { data, error } = await loaded.client.rpc('laurem_consume_recruitment_contract_token_v2', {
      p_token_hash: hashToken(token),
      p_action: action,
      p_accepted_by_name: typeof body?.acceptedByName === 'string' ? body.acceptedByName.trim() : null,
      p_decline_reason: typeof body?.declineReason === 'string' ? body.declineReason.trim() : null,
      p_ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      p_user_agent: request.headers.get('user-agent') || null,
      p_signature_data: typeof body?.signatureData === 'string' ? body.signatureData.trim() : null,
      p_attestation: typeof body?.attestation === 'string' ? body.attestation.trim() : null,
    });
    if (error) throw error;
    const result = (Array.isArray(data) ? data[0] : data) as { ok?: boolean; code?: string; status?: string } | null;
    if (!result?.ok) return rpcErrorResponse(result?.code || 'UNKNOWN');

    const { data: application, error: applicationError } = await loaded.client
      .from('recruitment_applications')
      .select('id,full_name,email,role_applied,living_in_uk,status')
      .eq('id', loaded.contract.application_id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) throw new Error('APPLICATION_NOT_FOUND');

    const transition = await loaded.client.rpc('laurem_transition_application_status', {
      p_application_id: application.id,
      p_to_status: 'Documents',
      p_actor: 'candidate.contract.acceptance',
      p_note: 'Employment contract accepted electronically. Candidate document pack is now due.',
      p_override: false,
      p_override_reason: null,
    });
    if (transition.error && !String(transition.error.message || '').includes('STATUS_TRANSITION_BLOCKED')) {
      throw transition.error;
    }

    const rawDocumentToken = makeToken();
    const documentPackExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const documents = getLauremRecruitmentDocumentPack({
      role: application.role_applied,
      staffName: application.full_name,
      livingInUk: application.living_in_uk,
    });
    const jobHash = createHash('sha256').update(documents.jobDescription, 'utf8').digest('hex');
    const handbookHash = createHash('sha256').update(documents.handbookContent, 'utf8').digest('hex');

    const packResult = await loaded.client.rpc('laurem_issue_candidate_document_pack', {
      p_application_id: application.id,
      p_token_hash: hashToken(rawDocumentToken),
      p_expires_at: documentPackExpiresAt,
      p_job_description: documents.jobDescription,
      p_job_description_sha256: jobHash,
      p_handbook_title: documents.handbookTitle,
      p_handbook_content: documents.handbookContent,
      p_handbook_sha256: handbookHash,
      p_actor: 'candidate.contract.acceptance',
    });
    if (packResult.error) throw packResult.error;

    const documentPackUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://recruitment.lauremcare.com').replace(/\\/$/, '') + '/candidate-documents/' + rawDocumentToken;
    await sendLauremEmail(loaded.client, {
      eventType: 'candidate_document_pack_issued',
      entityId: application.id,
      idempotencyKey: 'candidate-document-pack:' + application.id + ':' + String((packResult.data && packResult.data.pack && packResult.data.pack.id) || 'pack'),
      payload: {
        from: lauremCompany.candidateCommunications.senderAddress,
        to: [application.email],
        reply_to: lauremCompany.candidateCommunications.replyToAddress,
        subject: 'Your LAUREM employment documents are ready',
        text: 'Dear ' + application.full_name + ',\n\nYour employment contract has been accepted. Your Job Description and Handbook are now ready to review and sign online.\n\nContinue here:\n' + documentPackUrl + '\n\nKind regards,\n' + lauremCompany.tradingName + ' Recruitment',
        html: '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">' + lauremCompany.tradingName.toUpperCase() + ' RECRUITMENT</p><h1 style="font-size:28px">Your employment documents are ready</h1><p>Dear ' + application.full_name + ',</p><p>Your employment contract has been accepted.</p><p>Next, please review and sign your <strong>Job Description</strong> and <strong>Handbook</strong> online.</p><p><a href="' + documentPackUrl + '" style="display:inline-block;background:#173a31;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Review employment documents</a></p><p>Kind regards,<br>' + lauremCompany.tradingName + ' Recruitment</p></div>',
      },
    });

    return NextResponse.json({ ok: true, status: result.status, documentPackUrl });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'contract.acceptance_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to process contract acceptance.' }, { status: 500 });
  }
}
