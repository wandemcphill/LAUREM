import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const session = readAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const client = db();
  const { data: conversations, error } = await client.from('staff_message_conversations')
    .select('id,created_at,updated_at,last_message_at')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: 'Unable to load message centre.' }, { status: 500 });

  const output: any[] = [];
  for (const conversation of conversations || []) {
    const { data: participants } = await client.from('staff_message_participants').select('staff_id').eq('conversation_id', conversation.id);
    const ids = (participants || []).map((p: any) => p.staff_id);
    const [{ data: staff }, { data: mailboxes }, { data: latest }] = await Promise.all([
      ids.length ? client.from('staff_profiles').select('id,full_name,laurem_id,employee_number,job_title').in('id', ids) : Promise.resolve({ data: [] }),
      ids.length ? client.from('staff_internal_mailboxes').select('staff_id,handle,namespace').in('staff_id', ids) : Promise.resolve({ data: [] }),
      client.from('staff_messages').select('id,body,sender_staff_id,sender_admin_email,created_at').eq('conversation_id', conversation.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    output.push({
      ...conversation,
      participants: (staff || []).map((person: any) => {
        const mailbox = (mailboxes || []).find((item: any) => item.staff_id === person.id);
        return { ...person, address: mailbox ? `${mailbox.handle}@${mailbox.namespace}` : null };
      }),
      latest,
    });
  }
  return NextResponse.json({ conversations: output });
}
