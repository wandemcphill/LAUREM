import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { buildOnboardingTasks, calculateOnboardingStatus, inferLauremOnboardingAudience } from '@/lib/laurem-onboarding';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: app, error: appError } = await client.from('recruitment_applications').select('id,full_name,email,phone,role_applied,start_date,living_in_uk,nmc_number,application_data').eq('id', applicationId).maybeSingle();
    if (appError) throw appError;
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    const { data: existing } = await client.from('staff_profiles').select('id,employee_number,contract_id').eq('application_id', applicationId).maybeSingle();
    const applicationData = (app.application_data && typeof app.application_data === 'object') ? app.application_data as Record<string, unknown> : {};
    const nmc = typeof applicationData.nmc_number === 'string' ? applicationData.nmc_number : null;
    const location = typeof body?.location === 'string' ? body.location : null;
    const contractId = typeof body?.contractId === 'string' ? body.contractId : null;
    const audience = inferLauremOnboardingAudience(app.role_applied, app.living_in_uk);
    const tasks = buildOnboardingTasks(audience);

    let staff = existing;
    if (!staff) {
      const employeeNumber = `LAU-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { data: createdStaff, error } = await client.from('staff_profiles').insert({
        application_id: applicationId,
        employee_number: employeeNumber,
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        job_title: app.role_applied,
        employment_status: 'active',
        start_date: app.start_date,
        location,
        nmc_number: nmc || app.nmc_number || null,
        right_to_work_verified: Boolean(body?.rightToWorkVerified),
        dbs_verified: Boolean(body?.dbsVerified),
        contract_id: contractId,
      }).select('*').single();
      if (error) throw error;
      staff = createdStaff;
    }

    const staffId = staff.id;
    let { data: packageRow } = await client.from('staff_onboarding_packages').select('*').eq('staff_id', staffId).maybeSingle();
    if (!packageRow) {
      const { data: createdPackage, error } = await client.from('staff_onboarding_packages').insert({
        staff_id: staffId,
        audience,
        title: audience === 'international_nurse' ? 'International Nurse Onboarding & Welcome Programme' : audience === 'sponsored_hca' ? 'Sponsored Healthcare Assistant Onboarding Programme' : 'Laurem Staff Onboarding Programme',
        status: 'pending',
      }).select('*').single();
      if (error) throw error;
      packageRow = createdPackage;
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

    await client.from('recruitment_applications').update({ status: 'Hired', updated_at: new Date().toISOString() }).eq('id', applicationId);
    await client.from('recruitment_status_history').insert({ application_id: applicationId, from_status: 'Onboarding', to_status: 'Hired', changed_by: session.email, note: `Staff onboarding package ${packageRow.id} created for ${staff.employee_number || 'staff member'}` });

    const { data: finalTasks } = await client.from('staff_onboarding_tasks').select('*').eq('package_id', packageRow.id).order('sort_order', { ascending: true });
    return NextResponse.json({ staff, audience, package: updatedPackage, tasks: finalTasks || [], alreadyOnboarded: Boolean(existing) }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.onboarding.create_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to complete onboarding.' }, { status: 500 });
  }
}
