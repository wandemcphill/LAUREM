import { NextRequest, NextResponse } from 'next/server';
import { buildOnboardingTasks, calculateOnboardingStatus, inferLauremOnboardingAudience } from '@/lib/laurem-onboarding';
import { readAdminSession } from '@/lib/admin-auth';
import { hashToken, makeToken } from '@/lib/token';
import { provisionLauremStaffPortal } from '@/lib/laurem-staff-provision';
import { LauremLifecycleError, validateLauremStaffTransition, type LauremLifecycleErrorCode } from '@/lib/laurem-lifecycle';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { application, contract, readiness, staff: existing } = await validateLauremStaffTransition(client, applicationId);
    const applicationData = (application.application_data && typeof application.application_data === 'object') ? application.application_data as Record<string, unknown> : {};
    const nmc = typeof applicationData.nmc_number === 'string' ? applicationData.nmc_number : null;
    const location = typeof body?.location === 'string' ? body.location.trim() : null;
    const audience = inferLauremOnboardingAudience(String(application.role_applied || ''), application.living_in_uk);
    const tasks = buildOnboardingTasks(audience);
    const verifiedRightToWork = readiness.items.find((item) => item.item_key === 'right_to_work_verified')?.status === 'completed';

    let staffId: string;
    if (existing) {
      staffId = existing.id;
      if (contract && !existing.contract_id) {
        const { error: bindingError } = await client.from('staff_profiles').update({ contract_id: contract.id, updated_at: new Date().toISOString() }).eq('id', existing.id).is('contract_id', null);
        if (bindingError) throw bindingError;
      }
    } else {
      const employeeNumber = `LAU-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { data: createdStaff, error } = await client.from('staff_profiles').insert({
        application_id: applicationId,
        employee_number: employeeNumber,
        full_name: String(application.full_name),
        email: String(application.email || '').trim().toLowerCase(),
        phone: application.phone,
        job_title: application.role_applied,
        employment_status: 'pending',
        start_date: contract?.start_date || application.start_date,
        location: location || null,
        nmc_number: nmc || (typeof application.nmc_number === 'string' ? application.nmc_number : null),
        right_to_work_verified: verifiedRightToWork,
        dbs_verified: Boolean(body?.dbsVerified),
        contract_id: contract?.id || null,
      }).select('*').single();
      if (error) throw error;
      if (!createdStaff) throw new Error('Staff profile creation returned no row.');
      staffId = createdStaff.id;
    }

    let { data: packageRow } = await client.from('staff_onboarding_packages').select('*').eq('staff_id', staffId).maybeSingle();
    let rawAccessToken: string | null = null;
    if (!packageRow) {
      rawAccessToken = makeToken();
      const { data: createdPackage, error } = await client.from('staff_onboarding_packages').insert({
        staff_id: staffId,
        audience,
        title: audience === 'international_nurse' ? 'International Nurse Onboarding & Welcome Programme' : audience === 'sponsored_hca' ? 'Sponsored Healthcare Assistant Onboarding Programme' : 'Laurem Staff Onboarding Programme',
        status: 'pending',
        access_token_hash: hashToken(rawAccessToken),
        access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).select('*').single();
      if (error) throw error;
      packageRow = createdPackage;
    } else if (!packageRow.access_token_hash) {
      rawAccessToken = makeToken();
      const { data: refreshedPackage, error } = await client.from('staff_onboarding_packages').update({ access_token_hash: hashToken(rawAccessToken), access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('id', packageRow.id).select('*').single();
      if (error) throw error;
      packageRow = refreshedPackage;
    }

    const { data: existingTasks, error: taskReadError } = await client.from('staff_onboarding_tasks').select('task_key,status,required').eq('package_id', packageRow.id);
    if (taskReadError) throw taskReadError;
    if (!existingTasks || existingTasks.length === 0) {
      const { error: taskInsertError } = await client.from('staff_onboarding_tasks').insert(tasks.map((task) => ({ ...task, package_id: packageRow.id })));
      if (taskInsertError) throw taskInsertError;
    }
    const { data: allTasks, error: allTasksError } = await client.from('staff_onboarding_tasks').select('status,required').eq('package_id', packageRow.id);
    if (allTasksError) throw allTasksError;
    const onboardingStatus = calculateOnboardingStatus((allTasks || []) as Array<{ status: string; required: boolean }>);
    const { data: updatedPackage, error: packageUpdateError } = await client.from('staff_onboarding_packages').update({ status: onboardingStatus, completed_at: onboardingStatus === 'complete' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', packageRow.id).select('*').single();
    if (packageUpdateError) throw packageUpdateError;

    if (application.status !== 'Onboarding') {
      const { error: transitionError } = await client.rpc('laurem_transition_application_status', { p_application_id: applicationId, p_to_status: 'Onboarding', p_actor: session.email, p_note: `Staff onboarding package ${packageRow.id} created`, p_override: false, p_override_reason: null });
      if (transitionError) throw transitionError;
    }

    let portal: Awaited<ReturnType<typeof provisionLauremStaffPortal>> | null = null;
    if (!existing || (!existing.activated_at && !existing.activation_token_hash)) portal = await provisionLauremStaffPortal(applicationId);
    const { data: finalTasks } = await client.from('staff_onboarding_tasks').select('*').eq('package_id', packageRow.id).order('sort_order', { ascending: true });
    const onboardingLink = rawAccessToken ? `${(process.env.NEXT_PUBLIC_APP_URL || 'https://recruitment.lauremcare.com').replace(/\/$/, '')}/onboarding/${rawAccessToken}` : null;
    const staff = existing ?? (portal ? { id: portal.staff.id, employee_number: portal.staff.employee_number, contract_id: portal.staff.contract_id } : { id: staffId, employee_number: null, contract_id: contract?.id || null });
    return NextResponse.json({ staff, audience, package: updatedPackage, tasks: finalTasks || [], onboardingLink, portal: portal ? { laurem_id: portal.staff.laurem_id || portal.staff.employee_number, address: `${portal.mailbox.handle}@${portal.mailbox.namespace}`, activation: portal.activation } : null, alreadyOnboarded: Boolean(existing) }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof LauremLifecycleError) {
      const statusByCode: Record<LauremLifecycleErrorCode, number> = { APPLICATION_NOT_FOUND: 404, CONTRACT_REQUIRED: 409, CONTRACT_ROLE_MISMATCH: 409, READINESS_INCOMPLETE: 409, STAFF_CONTRACT_MISMATCH: 409 };
      const details = error.details?.readiness ? { readiness: error.details.readiness } : undefined;
      return NextResponse.json({ error: error.message, ...details }, { status: statusByCode[error.code] });
    }
    console.error(JSON.stringify({ level: 'error', event: 'admin.onboarding.create_failed', actor: session.email, reason: error instanceof Error ? error.message : String(error) }));
    return NextResponse.json({ error: 'Unable to complete onboarding.' }, { status: 500 });
  }
}
