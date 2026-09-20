import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { buildOnboardingTasks, inferLauremOnboardingAudience } from '@/lib/laurem-onboarding';
import { renderLauremJobDescription } from '@/lib/laurem-job-description';
import { provisionLauremStaffPortal } from '@/lib/laurem-staff-provision';
import { LauremLifecycleError, validateLauremStaffTransition, type LauremLifecycleErrorCode } from '@/lib/laurem-lifecycle';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id')?.trim() || '';
  if (!id) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });

  try {
    const client = db();
    const { data: application, error: applicationError } = await client
      .from('recruitment_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    await validateLauremStaffTransition(client, id);

    if (!['Onboarding', 'Hired'].includes(application.status)) {
      return NextResponse.json({ error: 'A candidate must be in Onboarding before they can be marked Hired.' }, { status: 409 });
    }

    const applicationData = application.application_data && typeof application.application_data === 'object'
      ? application.application_data as Record<string, unknown>
      : {};
    const audience = inferLauremOnboardingAudience(String(application.role_applied || ''), application.living_in_uk);
    const tasks = buildOnboardingTasks(audience);
    const packageTitle = audience === 'international_nurse'
      ? 'International Nurse Onboarding & Welcome Programme'
      : audience === 'sponsored_hca'
        ? 'Sponsored Healthcare Assistant Onboarding Programme'
        : 'Laurem Staff Onboarding Programme';

    const preparedResult = await client.rpc('laurem_prepare_staff_onboarding_atomic', {
      p_application_id: id,
      p_actor: session.email,
      p_audience: audience,
      p_package_title: packageTitle,
      p_tasks: tasks,
      p_location: null,
      p_nmc_number: typeof applicationData.nmc_number === 'string'
        ? applicationData.nmc_number
        : (typeof application.nmc_number === 'string' ? application.nmc_number : null),
      p_dbs_verified: Boolean(applicationData.dbs_verified),
      p_access_token_hash: null,
      p_access_token_expires_at: null,
    });
    if (preparedResult.error) throw preparedResult.error;
    const prepared = Array.isArray(preparedResult.data) ? preparedResult.data[0] : preparedResult.data;
    if (!prepared?.staff_id) throw new Error('Unable to prepare the workforce identity for hire.');

    const { data: staff, error: staffError } = await client.from('staff_profiles')
      .select('*')
      .eq('id', prepared.staff_id)
      .single();
    if (staffError || !staff) throw staffError || new Error('Staff profile not found after hire preparation.');

    const jobDescription = renderLauremJobDescription(
      staff.job_title || application.role_applied || 'Care Worker',
      staff.full_name,
    );
    const jobHash = createHash('sha256').update(jobDescription, 'utf8').digest('hex');

    const packageResult = await client.rpc('laurem_issue_staff_employment_document_package', {
      p_staff_id: staff.id,
      p_application_id: id,
      p_job_title: staff.job_title || application.role_applied || 'Care Worker',
      p_job_description: jobDescription,
      p_job_description_sha256: jobHash,
      p_actor: session.email,
    });
    if (packageResult.error) throw packageResult.error;
    if (!packageResult.data) throw new Error('Employment document package issuance returned no result.');

    let transitioned = application;
    if (application.status !== 'Hired') {
      const transitionResult = await client.rpc('laurem_transition_application_status', {
        p_application_id: id,
        p_to_status: 'Hired',
        p_actor: session.email,
        p_note: 'Employment document package issued and staff portal activation prepared.',
        p_override: false,
        p_override_reason: null,
      });
      if (transitionResult.error || !transitionResult.data) throw transitionResult.error || new Error('Unable to move application to Hired.');
      transitioned = transitionResult.data;
    }

    let activation: { status: string; deliveryId?: string | null; error?: string } | null = null;
    if (staff.activated_at) {
      activation = { status: 'already_activated', deliveryId: null };
    } else if (!staff.activation_token_hash) {
      const portal = await provisionLauremStaffPortal(id);
      activation = {
        status: portal.activation.status,
        deliveryId: portal.activation.deliveryId || null,
        ...(portal.activation.status === 'failed' ? { error: portal.activation.error } : {}),
      };
    } else {
      activation = { status: 'activation_already_issued', deliveryId: null };
    }

    const { data: currentDocs, error: docsError } = await client.from('staff_documents')
      .select('id,title,category,requires_signature,signature_status,issuer_name,issuer_title,employer_name,issued_at')
      .eq('staff_id', staff.id)
      .eq('status', 'issued')
      .order('issued_at', { ascending: true });
    if (docsError) throw docsError;

    return NextResponse.json({
      application: transitioned,
      staff: {
        id: staff.id,
        employee_number: staff.employee_number,
        laurem_id: staff.laurem_id || staff.employee_number,
        employment_status: staff.employment_status,
      },
      documents: currentDocs || [],
      activation,
    }, { status: application.status === 'Hired' ? 200 : 201 });
  } catch (error) {
    if (error instanceof LauremLifecycleError) {
      const statusByCode: Record<LauremLifecycleErrorCode, number> = {
        APPLICATION_NOT_FOUND: 404,
        CONTRACT_REQUIRED: 409,
        CONTRACT_ROLE_MISMATCH: 409,
        READINESS_INCOMPLETE: 409,
        STAFF_CONTRACT_MISMATCH: 409,
      };
      const details = error.details?.readiness ? { readiness: error.details.readiness } : undefined;
      return NextResponse.json({ error: error.message, ...details }, { status: statusByCode[error.code] });
    }
    console.error(JSON.stringify({
      level: 'error',
      event: 'admin.application.hire_failed',
      actor: session.email,
      applicationId: id,
      reason: error instanceof Error ? error.message : String(error),
    }));
    return NextResponse.json({ error: 'Unable to complete the hire workflow.' }, { status: 500 });
  }
}