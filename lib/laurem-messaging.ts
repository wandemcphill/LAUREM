import type { SupabaseClient } from '@supabase/supabase-js';

export const LAUREM_MESSAGE_NAMESPACES = ['lauremcare', 'lauremnurse', 'lauremstaff'] as const;

export function namespaceForRole(role: string | null | undefined) {
  const value = (role || '').toLowerCase();
  if (value.includes('nurse')) return 'lauremnurse';
  if (value.includes('care') || value.includes('support') || value.includes('assistant')) return 'lauremcare';
  return 'lauremstaff';
}

export function handleBase(name: string) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim()
    .split(/\s+/).join('.')
    .replace(/[^a-z0-9.]/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '');
  return base || 'staff';
}

export async function ensureLauremMailbox(client: SupabaseClient, staff: { id: string; full_name: string; job_title?: string | null }) {
  const existing = await client.from('laurem_staff_internal_mailboxes')
    .select('id,staff_id,handle,namespace,enabled')
    .eq('staff_id', staff.id).maybeSingle();
  if (existing.data) return existing.data;

  const namespace = namespaceForRole(staff.job_title);
  const base = handleBase(staff.full_name);
  for (let i = 1; i <= 100; i += 1) {
    const handle = i === 1 ? base : `${base}${i}`;
    const clash = await client.from('laurem_staff_internal_mailboxes').select('id').eq('handle', handle).eq('namespace', namespace).maybeSingle();
    if (clash.data) continue;
    const { data, error } = await client.from('laurem_staff_internal_mailboxes')
      .insert({ staff_id: staff.id, handle, namespace })
      .select('id,staff_id,handle,namespace,enabled').single();
    if (!error && data) {
      await client.from('laurem_staff_profiles').update({
        portal_handle: handle,
        department_namespace: namespace,
        portal_address: `${handle}@${namespace}`,
        updated_at: new Date().toISOString(),
      }).eq('id', staff.id);
      return data;
    }
  }
  throw new Error('Unable to allocate LAUREM internal address.');
}

export async function findLauremStaffByAddress(client: SupabaseClient, address: string) {
  const value = address.trim().toLowerCase().replace(/\s+/g, '');
  const at = value.lastIndexOf('@');
  if (at <= 0) return null;
  const handle = value.slice(0, at);
  const namespace = value.slice(at + 1);
  if (!LAUREM_MESSAGE_NAMESPACES.includes(namespace as (typeof LAUREM_MESSAGE_NAMESPACES)[number])) return null;
  const { data: mailbox, error } = await client.from('laurem_staff_internal_mailboxes')
    .select('staff_id,handle,namespace,enabled')
    .eq('handle', handle).eq('namespace', namespace).eq('enabled', true).maybeSingle();
  if (error || !mailbox) return null;
  const { data: staff } = await client.from('laurem_staff_profiles')
    .select('id,laurem_id,employee_number,full_name,email,job_title,employment_status')
    .eq('id', mailbox.staff_id).maybeSingle();
  if (!staff || !['pending', 'active'].includes(staff.employment_status)) return null;
  return { ...staff, mailbox };
}

export function directKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

export async function getOrCreateConversation(client: SupabaseClient, a: string, b: string) {
  const key = directKey(a, b);
  const existing = await client.from('laurem_staff_message_conversations')
    .select('id,direct_key,created_at,updated_at,last_message_at').eq('direct_key', key).maybeSingle();
  if (existing.data) return existing.data;

  const { data: conversation, error } = await client.from('laurem_staff_message_conversations')
    .insert({ direct_key: key, created_by_staff_id: a })
    .select('id,direct_key,created_at,updated_at,last_message_at').single();
  if (error || !conversation) {
    const retry = await client.from('laurem_staff_message_conversations')
      .select('id,direct_key,created_at,updated_at,last_message_at').eq('direct_key', key).maybeSingle();
    if (retry.data) return retry.data;
    throw error || new Error('Unable to create conversation.');
  }
  const { error: participantError } = await client.from('laurem_staff_message_participants').insert([
    { conversation_id: conversation.id, staff_id: a },
    { conversation_id: conversation.id, staff_id: b },
  ]);
  if (participantError) throw participantError;
  return conversation;
}

export async function getOrCreateAdminConversation(client: SupabaseClient, staffId: string) {
  const key = `admin:${staffId}`;
  const existing = await client.from('laurem_staff_message_conversations')
    .select('id,direct_key,created_at,updated_at,last_message_at').eq('direct_key', key).maybeSingle();
  if (existing.data) return existing.data;

  const { data: conversation, error } = await client.from('laurem_staff_message_conversations')
    .insert({ direct_key: key, created_by_staff_id: null })
    .select('id,direct_key,created_at,updated_at,last_message_at').single();
  if (error || !conversation) {
    const retry = await client.from('laurem_staff_message_conversations')
      .select('id,direct_key,created_at,updated_at,last_message_at').eq('direct_key', key).maybeSingle();
    if (retry.data) return retry.data;
    throw error || new Error('Unable to create LAUREM admin conversation.');
  }

  const { error: participantError } = await client.from('laurem_staff_message_participants')
    .insert({ conversation_id: conversation.id, staff_id: staffId });
  if (participantError) throw participantError;
  return conversation;
}

export async function participantConversationIds(client: SupabaseClient, staffId: string) {
  const { data, error } = await client.from('laurem_staff_message_participants').select('conversation_id').eq('staff_id', staffId);
  if (error) throw error;
  return (data || []).map((row) => row.conversation_id);
}
