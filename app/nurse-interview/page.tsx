import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';
import NurseInterviewClient from './NurseInterviewClient';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function NurseInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() || '';
  if (!token) notFound();

  const client = db();
  const { data: invite, error: inviteError } = await client
    .from('recruitment_invites')
    .select('id,role,expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (inviteError || !invite) notFound();
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) notFound();
  if (invite.role && !/nurse/i.test(invite.role)) notFound();

  const { data: application, error: applicationError } = await client
    .from('recruitment_applications')
    .select('id,role_applied,living_in_uk')
    .eq('invite_id', invite.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (applicationError || !application || !/nurse/i.test(application.role_applied || '')) notFound();

  const pathway = application.living_in_uk === 'No' ? 'international' : 'uk';
  return <NurseInterviewClient token={token} pathway={pathway} />;
}
