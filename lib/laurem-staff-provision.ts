import { db } from './db';
import { makeActivationToken, hashActivationToken } from './laurem-staff-auth';
import { ensureLauremMailbox } from './laurem-messaging';
import { sendLauremStaffActivation } from './laurem-staff-email';
import { getLauremOnboardingReadiness } from './laurem-onboarding-readiness';
import { lauremRoleSlug } from './laurem-role-policy';

/**
 * Provisions portal identity only after the admin onboarding route has already
 * enforced contract + role + readiness gates. This helper repeats the critical
 * gates as defence in depth and never activates a staff account by itself.
 */
export async function provisionLauremStaffPortal(applicationId: string) {
  const client = db();
  const { data: app, error: appError } = await client.from('recruitment_applications')
    .select('id,full_name,email,phone,role_applied,start_date,living_in_uk,nmc_number,application_data')
    .eq('id', applicationId).single();
  if (appError || !app) throw appError || new Error('Application not found.');

  const { data: contract, error: contractError } = await client.from('recruitment_contracts')
    .select('id,status,accepted_at,job_title,start_date').eq('application_id', applicationId).maybeSingle();
  if (contractError) throw contractError;
  if (!contract || contract.status !== 'accepted' || !contract.accepted_at) throw new Error('Accepted employment contract required.');

  const applicationRole = lauremRoleSlug(app.role_applied);
  const contractRole = lauremRoleSlug(contract.job_title);
  if (!applicationRole || !contractRole || applicationRole !== contractRole) throw new Error('Application and contract roles must match.');

  const readiness = await getLauremOnboardingReadiness(client, app);
  if (!readiness.ready) throw new Error(`Onboarding readiness incomplete: ${readiness.missing.map((item) => item.item_key).join(', ')}`);

  const { data: staff, error: staffError } = await client.from('staff_profiles').select('*').eq('application_id', applicationId).maybeSingle();
  if (staffError) throw staffError;
  if (!staff) throw new Error('Staff profile must be created by the gated onboarding flow before portal provisioning.');

  const mailbox = await ensureLauremMailbox(client, staff);
  const rawToken = makeActivationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: updated, error: updateError } = await client.from('staff_profiles').update({
    activation_token_hash: hashActivationToken(rawToken),
    activation_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', staff.id).select('*').single();
  if (updateError || !updated) throw updateError || new Error('Unable to create staff activation token.');

  const activation = await sendLauremStaffActivation(client, updated, rawToken);
  return { staff: updated, mailbox, activation };
}
