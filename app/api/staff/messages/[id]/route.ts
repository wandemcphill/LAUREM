import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';
import { participantConversationIds } from '@/lib/laurem-messaging';
import { recordLauremAuditEvent } from '@/lib/laurem-audit';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Context) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await context.params;
  const client = db();
  const ids = await participantConversationIds(client, session.staff_id);
  if (!ids.includes(id)) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const [{ data: messages }, { data: participants }] = await Promise.all([
    client.from('staff_messages').select('id,sender_staff_id,sender_admin_email,body,created_at').eq('conversation_id', id).is('deleted_at', null).order('created_at', { ascending: true }),
    client.from('staff_message_participants').select('staff_id').eq('conversation_id', id),
  ]);
  const otherId = (participants || []).map((p: any) => p.staff_id).find((staffId: string) => staffId !== session.staff_id);
  const { data: other } = otherId ? await client.from('staff_profiles').select('id,full_name,laurem_id,employee_number,job_title').eq('id', otherId).maybeSingle() : { data: null };
  await client.from('staff_message_participants').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', id).eq('staff_id', session.staff_id);
  return NextResponse.json({ conversation: { id, other: other || { display: 'LAUREM Admin' } }, messages: messages || [] });
}

export async function POST(req: NextRequest, context: Context) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 10000) return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
  const client = db();
  const ids = await participantConversationIds(client, session.staff_id);
  if (!ids.includes(id)) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const { data: created, error } = await client.from('staff_messages').insert({ conversation_id: id, sender_staff_id: session.staff_id, body: message })
    .select('id,conversation_id,sender_staff_id,sender_admin_email,body,created_at').single();
  if (error || !created) return NextResponse.json({ error: 'Unable to send message.' }, { status: 500 });
  await client.from('staff_message_conversations').update({ last_message_at: created.created_at, updated_at: created.created_at }).eq('id', id);
  await recordLauremAuditEvent({
    lifecycleArea: 'messaging', entityType: 'staff_message', entityId: created.id, staffId: session.staff_id,
    actorType: 'staff', actor: session.email, action: 'message_sent',
    metadata: { conversationId: id },
  });

  return NextResponse.json({ message: created }, { status: 201 });
}
