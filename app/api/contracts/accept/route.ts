import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-contract-token') || '';
  if (!token) return NextResponse.json({ error: 'Contract token is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as { accepted?: boolean; acceptedByName?: string; declineReason?: string } | null;
  try {
    const client = db();
    const { data: tokenRow, error: tokenError } = await client.from('recruitment_contract_tokens').select('id,contract_id,expires_at,used_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) return NextResponse.json({ error: 'Contract link not found.' }, { status: 404 });
    if (tokenRow.used_at) return NextResponse.json({ error: 'This contract link has already been used.' }, { status: 409 });
    if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This contract link has expired.' }, { status: 410 });
    const { data: contract } = await client.from('recruitment_contracts').select('id,status').eq('id', tokenRow.contract_id).maybeSingle();
    if (!contract || !['issued','viewed'].includes(contract.status)) return NextResponse.json({ error: 'This contract is not available for acceptance.' }, { status: 409 });
    if (body?.accepted) {
      const name = typeof body.acceptedByName === 'string' ? body.acceptedByName.trim() : '';
      if (!name) return NextResponse.json({ error: 'Your full name is required to accept the contract.' }, { status: 400 });
      const { error } = await client.from('recruitment_contracts').update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by_name: name, accepted_ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, acceptance_user_agent: request.headers.get('user-agent') || null, viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', contract.id);
      if (error) throw error;
      await client.from('recruitment_contract_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id);
      return NextResponse.json({ ok: true, status: 'accepted' });
    }
    const reason = typeof body?.declineReason === 'string' ? body.declineReason.trim() : '';
    const { error } = await client.from('recruitment_contracts').update({ status: 'declined', declined_at: new Date().toISOString(), decline_reason: reason || null, viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', contract.id);
    if (error) throw error;
    await client.from('recruitment_contract_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id);
    return NextResponse.json({ ok: true, status: 'declined' });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'contract.acceptance_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to process contract acceptance.' }, { status: 500 });
  }
}
