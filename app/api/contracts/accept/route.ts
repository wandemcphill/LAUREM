import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';

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
  const body = await request.json().catch(() => null) as { accepted?: boolean; acceptedByName?: string; declineReason?: string } | null;
  try {
    const loaded = await loadContract(request);
    if ('error' in loaded) return loaded.error;
    const action = body?.accepted ? 'accept' : 'decline';
    const { data, error } = await loaded.client.rpc('consume_recruitment_contract_token', {
      p_token_hash: hashToken(token),
      p_action: action,
      p_accepted_by_name: typeof body?.acceptedByName === 'string' ? body.acceptedByName.trim() : null,
      p_decline_reason: typeof body?.declineReason === 'string' ? body.declineReason.trim() : null,
      p_ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      p_user_agent: request.headers.get('user-agent') || null,
    });
    if (error) throw error;
    const result = (Array.isArray(data) ? data[0] : data) as { ok?: boolean; code?: string; status?: string } | null;
    if (!result?.ok) return rpcErrorResponse(result?.code || 'UNKNOWN');
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'contract.acceptance_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to process contract acceptance.' }, { status: 500 });
  }
}
