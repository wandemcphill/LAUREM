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
  const { data: contract, error: contractError } = await client.from('recruitment_contracts').select('*').eq('id', tokenRow.contract_id).maybeSingle();
  if (contractError) throw contractError;
  if (!contract) return { error: NextResponse.json({ error: 'Contract not found.' }, { status: 404 }) } as const;
  return { client, tokenRow, contract } as const;
}

export async function GET(request: NextRequest) {
  try {
    const loaded = await loadContract(request);
    if ('error' in loaded) return loaded.error;
    if (loaded.contract.status === 'issued') {
      await loaded.client.from('recruitment_contracts').update({ status: 'viewed', viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', loaded.contract.id);
    }
    return NextResponse.json({ contract: loaded.contract });
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
    if (loaded.tokenRow.used_at) return NextResponse.json({ error: 'This contract link has already been used.' }, { status: 409 });
    if (!['issued', 'viewed'].includes(loaded.contract.status)) return NextResponse.json({ error: 'This contract is not available for acceptance.' }, { status: 409 });
    if (body?.accepted) {
      const name = typeof body.acceptedByName === 'string' ? body.acceptedByName.trim() : '';
      if (!name) return NextResponse.json({ error: 'Your full name is required to accept the contract.' }, { status: 400 });
      const { error } = await loaded.client.from('recruitment_contracts').update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by_name: name, accepted_ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, acceptance_user_agent: request.headers.get('user-agent') || null, viewed_at: loaded.contract.viewed_at || new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', loaded.contract.id);
      if (error) throw error;
      await loaded.client.from('recruitment_contract_tokens').update({ used_at: new Date().toISOString() }).eq('id', loaded.tokenRow.id);
      return NextResponse.json({ ok: true, status: 'accepted' });
    }
    const reason = typeof body?.declineReason === 'string' ? body.declineReason.trim() : '';
    const { error } = await loaded.client.from('recruitment_contracts').update({ status: 'declined', declined_at: new Date().toISOString(), decline_reason: reason || null, viewed_at: loaded.contract.viewed_at || new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', loaded.contract.id);
    if (error) throw error;
    await loaded.client.from('recruitment_contract_tokens').update({ used_at: new Date().toISOString() }).eq('id', loaded.tokenRow.id);
    return NextResponse.json({ ok: true, status: 'declined' });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'contract.acceptance_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to process contract acceptance.' }, { status: 500 });
  }
}
