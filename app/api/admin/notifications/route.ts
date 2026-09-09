import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const status = params.get('status');
  const eventType = params.get('eventType');
  const limit = Math.min(Math.max(Number(params.get('limit') || 100), 1), 250);

  try {
    const client = db();
    let query = client.from('notification_deliveries')
      .select('id,event_type,entity_id,channel,recipient_key,idempotency_key,status,attempt_count,provider_id,last_error,last_attempt_at,sent_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status) query = query.eq('status', status);
    if (eventType) query = query.eq('event_type', eventType);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ deliveries: data || [] });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.notifications.list_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to load notification delivery history.' }, { status: 500 });
  }
}
