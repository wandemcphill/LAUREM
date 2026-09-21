import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';

const PUBLIC_CONTRACT_FIELDS = [
  'id',
  'version',
  'job_title',
  'start_date',
  'contract_end_date',
  'contract_content',
  'contract_type',
  'status',
  'issued_at',
  'viewed_at',
].join(',');

type PublicContract = {
  id: string;
  version: number;
  job_title: string;
  start_date: string | null;
  contract_end_date: string | null;
  contract_content: string;
  contract_type: string | null;
  status: string;
  issued_at: string | null;
  viewed_at: string | null;
};

function toPublicContract(contract: Record<string, unknown>): PublicContract {
  return {
    id: String(contract.id),
    version: Number(contract.version || 1),
    job_title: String(contract.job_title || ''),
    start_date: typeof contract.start_date === 'string' ? contract.start_date : null,
    contract_end_date: typeof contract.contract_end_date === 'string' ? contract.contract_end_date : null,
    contract_content: String(contract.contract_content || ''),
    contract_type: typeof contract.contract_type === 'string' ? contract.contract_type : null,
    status: String(contract.status || ''),
    issued_at: typeof contract.issued_at === 'string' ? contract.issued_at : null,
    viewed_at: typeof contract.viewed_at === 'string' ? contract.viewed_at : null,
  };
}

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

async function loadContract(request: NextRequest) {
  const token = request.headers.get('x-contract-token') || new URL(request.url).searchParams.get('token') || '';
  if (!token) return { error: noStore(NextResponse.json({ error: 'Contract token is required.' }, { status: 400 })) } as const;
  const client = db();
  const { data: tokenRow, error } = await client
    .from('recruitment_contract_tokens')
    .select('id,contract_id,expires_at,used_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error) throw error;
  if (!tokenRow) return { error: noStore(NextResponse.json({ error: 'Contract link not found.' }, { status: 404 })) } as const;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return { error: noStore(NextResponse.json({ error: 'This contract link has expired.' }, { status: 410 })) } as const;
  }
  if (tokenRow.used_at) {
    return { error: noStore(NextResponse.json({ error: 'This contract link has already been used.' }, { status: 409 })) } as const;
  }

  const { data: contract, error: contractError } = await client
    .from('recruitment_contracts')
    .select(PUBLIC_CONTRACT_FIELDS)
    .eq('id', tokenRow.contract_id)
    .maybeSingle();

  if (contractError) throw contractError;
  if (!contract) return { error: noStore(NextResponse.json({ error: 'Contract not found.' }, { status: 404 })) } as const;

  if (!['issued', 'viewed'].includes(String(contract.status))) {
    return {
      error: noStore(NextResponse.json(
        { error: 'This contract is not yet available for candidate review.' },
        { status: 409 },
      )),
    } as const;
  }

  return {
    client,
    tokenRow,
    contract,
  } as const;
}

function rpcErrorResponse(code: string) {
  switch (code) {
    case 'TOKEN_NOT_FOUND': return noStore(NextResponse.json({ error: 'Contract link not found.' }, { status: 404 }));
    case 'TOKEN_EXPIRED': return noStore(NextResponse.json({ error: 'This contract link has expired.' }, { status: 410 }));
    case 'TOKEN_USED': return noStore(NextResponse.json({ error: 'This contract link has already been used.' }, { status: 409 }));
    case 'CONTRACT_NOT_FOUND': return noStore(NextResponse.json({ error: 'Contract not found.' }, { status: 404 }));
    case 'CONTRACT_UNAVAILABLE': return noStore(NextResponse.json({ error: 'This contract is not available for acceptance.' }, { status: 409 }));
    case 'NAME_REQUIRED': return noStore(NextResponse.json({ error: 'Your full name is required to accept the contract.' }, { status: 400 }));
    case 'ATTESTATION_REQUIRED': return noStore(NextResponse.json({ error: 'Electronic-signature attestation is required.' }, { status: 400 }));
    case 'ATTESTATION_INVALID': return noStore(NextResponse.json({ error: 'Invalid electronic-signature attestation.' }, { status: 400 }));
    case 'INVALID_IP': return noStore(NextResponse.json({ error: 'Unable to record the signing environment.' }, { status: 400 }));
    case 'INVALID_ACTION': return noStore(NextResponse.json({ error: 'Invalid contract action.' }, { status: 400 }));
    case 'TOKEN_CONSUMPTION_RACE': return noStore(NextResponse.json({ error: 'This contract link has already been processed.' }, { status: 409 }));
    default: return noStore(NextResponse.json({ error: 'Unable to process the contract request.' }, { status: 409 }));
  }
}

export async function GET(request: NextRequest) {
  try {
    const loaded = await loadContract(request);
    if ('error' in loaded) return loaded.error;

    let contract = loaded.contract;
    if (contract.status === 'issued') {
      const { data: viewed, error } = await loaded.client
        .from('recruitment_contracts')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id)
        .eq('status', 'issued')
        .select(PUBLIC_CONTRACT_FIELDS)
        .maybeSingle();

      if (error) throw error;
      contract = viewed || contract;
    }

    return noStore(NextResponse.json({ contract: toPublicContract(contract as Record<string, unknown>) }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'contract.load_failed',
      reason: error instanceof Error ? error.message : 'unknown',
    }));
    return noStore(NextResponse.json({ error: 'Unable to load employment contract.' }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-contract-token') || '';
  if (!token) return noStore(NextResponse.json({ error: 'Contract token is required.' }, { status: 400 }));
  const body = await request.json().catch(() => null) as {
    accepted?: boolean;
    acceptedByName?: string;
    declineReason?: string;
    signatureData?: string;
    attestation?: string;
  } | null;

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
    const result = (Array.isArray(data) ? data[0] : data) as {
      ok?: boolean;
      code?: string;
      status?: string;
    } | null;

    if (!result?.ok) return rpcErrorResponse(result?.code || 'UNKNOWN');
    return noStore(NextResponse.json({ ok: true, status: result.status }));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'contract.acceptance_failed',
      reason: error instanceof Error ? error.message : 'unknown',
    }));
    return noStore(NextResponse.json({ error: 'Unable to process contract acceptance.' }, { status: 500 }));
  }
}
