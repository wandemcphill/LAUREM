import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildOnboardingTasks, calculateOnboardingStatus, inferLauremOnboardingAudience } from '@/lib/laurem-onboarding';
import { readAdminSession } from '@/lib/admin-auth';
import { getLauremOnboardingReadiness } from '@/lib/laurem-onboarding-readiness';
import { lauremRoleSlug } from '@/lib/laurem-role-policy';
import { hashToken, makeToken } from '@/lib/token';
import { provisionLauremStaffPortal } from '@/lib/laurem-staff-provision';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });

  try {
    const client = db();
    const { data: app, error: appError } = await client
      .from('recruitment_applications')
      .select('id,full_name,email,phone,role_applied,start_date,living_in_uk,nmc_number,application_data,status')
      .eq('id', applicationId)
      .maybeSingle();
    if (appError) throw appError;
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    const { data: contract, error: contractError } = await client
      .from('recruitment_contracts')
      .select('id,status,accepted_at,job_title,start_date')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (contractError) throw contractError;
    if (!contract || contract.status !== 'accepted' || !contract.accepted_at) {
      return NextResponse.json({ error: 'The employment contract must be accepted before staff onboarding can begin.' }, { status: 409 });
    }

    const applicationRole = lauremRoleSlug(app.role_applied);
    const contractRole = lauremRoleSlug(contract.job_title);
    if (!applicationRole || !contractRole) {
      return NextResponse.json({ error: 'The application or contract contains an invalid recruitment role.' }, { status: 409 });
    }
    if (applicationRole !== contractRole) {
      return NextResponse.json({ error: 'The accepted contract role does not match the candidate\'s applied role.' }, { status: 409 });
    }

    const { data: existing, error: existingError } = await client
      .from('staff_profiles')
      .select('id,employee_number,contract_id,activated_at,activation_token_hash')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (existingError) throw existingError;

    const readiness = await getLauremOnboardingReadiness(client, app);
    if (!readiness.ready) {
      return NextResponse.json({
        error: `Onboarding readiness is incomplete. Complete the following before staff onboarding: ${readiness.missing.map((item) => item.title).join(', ')}`,
        readiness,
      }, { status: 409 });
    }

    if (existing?.contract_id && existing.contract_id !== contract.id) {
      return NextResponse.json({ error: 'The existing staff profile is linked to a different employment contract.' }, { status: 409 });
    }

    const applicationData = (app.application_data && typeof app.application_data === 'object') ? app.application_data as Record<string, unknown> : {};
    const nmc = typeof applicationData.nmc_number === 'string' ? applicationData.nmc_number : null;
    const location = typeof body?.location === 'string' ? body.location.trim() : null;
    const audience = inferLauremOnboardingAudience(app.role_applied, app.living_in_uk);
    const tasks = buildOnboardingTasks(audience);
    const verifiedRightToWork = readiness.items.find((item) => item.item_key === 'right_to_work_verified')?.status === 'completed';

    let staffId: string;
    if (existing) {
      staffId = existing.id;
    } else {
      const employeeNumber = `LAU-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { data: createdStaff, error } = await client.from('staff_profiles').insert({
        application_id: applicationId,
        employee_number: employeeNumber,
        full_name: app.full_name,
        email: app.email.trim().toLowerCase(),
        phone: app.phone,
        job_title: app.role_applied,
        employment_status: 'pending',
        start_date: contract.start_date || app.start_date,
        location: location || null,
        nmc_number: nmc || app.nmc_number || null,
        right_to_work_verified: verifiedRightToWork,
        dbs_verified: Boolean(body?.dbsVerified),
        contract_id: contract.id,
      }).select('*').single();
      if (error) throw error;
      if (!createdStaff) throw new Error('Staff profile creation returned no row.');
      staffId = createdStaff.id;
    }

    let { data: packageRow } = await client.from('staff_onboarding_packages').select('*').eq('staff_id', staffId).maybeSingle();
    let rawAccessToken: string | null = null;
    if (!packageRow) {
      rawAccessToken = makeToken();
      const { data: createdPackage, error } = await client.from('staff_onboarding_packages').insert({ staff_id: staffId, audience, title: audience === 'international_nurse' ? 'International Nurse Onboarding & Welcome Programme' : audience === 'sponsored_hca' ? 'Sponsored Healthcare Assistant Onboarding Programme' : 'Laurem Staff Onboarding Programme', status: 'pending', access_token_hash: hashToken(rawAccessToken), access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }).select('*').single();
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

    await client.from('recruitment_applications').update({ status: 'Onboarding', updated_at: new Date().toISOString() }).eq('id', applicationId);
    await client.from('recruitment_status_history').insert({ application_id: applicationId, from_status: app.status, to_status: 'Onboarding', changed_by: session.email, note: `Staff onboarding package ${packageRow.id} created` });

    let portal: Awaited<ReturnType<typeof provisionLauremStaffPortal>> | null = null;
    if (!existing || (!existing.activated_at && !existing.activation_token_hash)) {
      portal = await provisionLauremStaffPortal(applicationId);
    }

    const { data: finalTasks } = await client.from('staff_onboarding_tasks').select('*').eq('package_id', packageRow.id).order('sort_order', { ascending: true });
    const onboardingLink = rawAccessToken ? `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/onboarding/${rawAccessToken}` : null;
    const staff = existing ?? (portal ? { id: portal.staff.id, employee_number: portal.staff.employee_number, contract_id: portal.staff.contract_id } : { id: staffId, employee_number: null, contract_id: contract.id });
    return NextResponse.json({ staff, audience, package: updatedPackage, tasks: finalTasks || [], onboardingLink, portal: portal ? { laurem_id: portal.staff.laurem_id || portal.staff.employee_number, address: `${portal.mailbox.handle}@${portal.mailbox.namespace}`, activation: portal.activation } : null, alreadyOnboarded: Boolean(existing) }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.onboarding.create_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to complete onboarding.' }, { status: 500 });
  }
}
