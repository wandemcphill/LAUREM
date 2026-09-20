import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { createLauremStaffNotification } from '@/lib/laurem-staff-notifications';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Context) {
  const session = readAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await context.params;
  const client = db();
  const [{ data: messages, error: messageError }, { data: participants }] = await Promise.all([
    client.from('staff_messages').select('id,sender_staff_id,sender_admin_email,body,created_at').eq('conversation_id', id).is('deleted_at', null).order('created_at', { ascending: true }),
    client.from('staff_message_participants').select('staff_id').eq('conversation_id', id),
  ]);
  if (messageError) return NextResponse.json({ error: 'Unable to load conversation.' }, { status: 500 });
  const ids = (participants || []).map((participant: any) => participant.staff_id);
  if (!ids.length) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const { data: staff } = await client.from('staff_profiles').select('id,full_name,laurem_id,employee_number,job_title').in('id', ids);
  return NextResponse.json({ conversation: { id, participants: staff || [] }, messages: messages || [] });
}

export async function POST(req: NextRequest, context: Context) {
  const session = readAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 10000) return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
  const client = db();
  const { data: participant } = await client.from('staff_message_participants').select('staff_id').eq('conversation_id', id).limit(1).maybeSingle();
  if (!participant) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const { data: created, error } = await client.from('staff_messages').insert({ conversation_id: id, sender_admin_email: session.email, body: message })
    .select('id,conversation_id,sender_staff_id,sender_admin_email,body,created_at').single();
  if (error || !created) return NextResponse.json({ error: 'Unable to send message.' }, { status: 500 });
  await client.from('staff_message_conversations').update({ last_message_at: created.created_at, updated_at: created.created_at }).eq('id', id);
  await createLauremStaffNotification(client, {
    staffId: participant.staff_id,
    category: 'message',
    title: 'New LAUREM message',
    body: `LAUREM Admin / HR sent you a new message.`,
    actionUrl: `/staff/messages?conversation=${encodeURIComponent(id)}`,
  });
  return NextResponse.json({ message: created }, { status: 201 });
}
