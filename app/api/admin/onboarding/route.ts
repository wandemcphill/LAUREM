import { NextRequest, NextResponse } from 'next/server';
import { buildOnboardingTasks, inferLauremOnboardingAudience } from '@/lib/laurem-onboarding';
import { renderLauremJobDescription } from '@/lib/laurem-job-description';
import { lauremCompany } from '@/lib/laurem-company-config';
import { createHash } from 'node:crypto';
import { sendLauremEmail } from '@/lib/laurem-email';
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
    const { application } = await validateLauremStaffTransition(client, applicationId);
    const applicationData = (application.application_data && typeof application.application_data === 'object') ? application.application_data as Record<string, unknown> : {};
    const nmc = typeof applicationData.nmc_number === 'string' ? applicationData.nmc_number : null;
    const location = typeof body?.location === 'string' ? body.location.trim() : null;
    const audience = inferLauremOnboardingAudience(String(application.role_applied || ''), application.living_in_uk);
    const tasks = buildOnboardingTasks(audience);
    const packageTitle = audience === 'international_nurse'
      ? 'International Nurse Onboarding & Welcome Programme'
      : audience === 'sponsored_hca'
        ? 'Sponsored Healthcare Assistant Onboarding Programme'
        : 'Laurem Staff Onboarding Programme';

    const rawAccessToken = makeToken();
    const accessTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: atomicRows, error: atomicError } = await client.rpc('laurem_prepare_staff_onboarding_atomic', {
      p_application_id: applicationId,
      p_actor: session.email,
      p_audience: audience,
      p_package_title: packageTitle,
      p_tasks: tasks,
      p_location: location,
      p_nmc_number: nmc || (typeof application.nmc_number === 'string' ? application.nmc_number : null),
      p_dbs_verified: Boolean(body?.dbsVerified),
      p_access_token_hash: hashToken(rawAccessToken),
      p_access_token_expires_at: accessTokenExpiresAt,
    });
    if (atomicError) throw atomicError;

    const atomic = Array.isArray(atomicRows) ? atomicRows[0] : atomicRows;
    if (!atomic) throw new Error('Atomic onboarding preparation returned no result.');

    const { data: updatedPackage, error: packageError } = await client
      .from('staff_onboarding_packages')
      .select('*')
      .eq('id', atomic.package_id)
      .single();
    if (packageError || !updatedPackage) throw packageError || new Error('Onboarding package not found after atomic preparation.');

    let portal: Awaited<ReturnType<typeof provisionLauremStaffPortal>> | null = null;
    const { data: preparedStaff, error: staffReadError } = await client
      .from('staff_profiles')
      .select('*')
      .eq('id', atomic.staff_id)
      .single();
    if (staffReadError || !preparedStaff) throw staffReadError || new Error('Staff profile not found after atomic preparation.');

    if (!preparedStaff.activated_at && !preparedStaff.activation_token_hash) {
      portal = await provisionLauremStaffPortal(applicationId);
    }

    const { data: finalTasks } = await client
      .from('staff_onboarding_tasks')
      .select('*')
      .eq('package_id', atomic.package_id)
      .order('sort_order', { ascending: true });

    const onboardingLink = atomic.access_token_issued && rawAccessToken
      ? `${(process.env.NEXT_PUBLIC_APP_URL || 'https://recruitment.lauremcare.com').replace(/\/$/, '')}/onboarding/${rawAccessToken}`
      : null;

    const staffId = portal?.staff.id || preparedStaff.id;
    const staffSummary = portal
      ? { id: portal.staff.id, employee_number: portal.staff.employee_number, contract_id: portal.staff.contract_id }
      : { id: preparedStaff.id, employee_number: preparedStaff.employee_number, contract_id: preparedStaff.contract_id };

    const { error: contractDocumentError } = await client.rpc('laurem_attach_accepted_contract_document', { p_staff_id: staffId, p_application_id: applicationId, p_actor: session.email });
    if (contractDocumentError) throw contractDocumentError;

    const existingJobDescription = await client.from('staff_documents').select('id').eq('staff_id', staffId).eq('source_type', 'job_description').eq('source_key', String(preparedStaff.job_title || application.role_applied || '').trim().toLowerCase()).maybeSingle();
    if (!existingJobDescription.data) {
      const jobDescription = renderLauremJobDescription(preparedStaff.job_title || application.role_applied || 'Care Worker', preparedStaff.full_name);
      const jobHash = createHash('sha256').update(jobDescription, 'utf8').digest('hex');
      const { data: createdJobDocument, error: jobDocumentError } = await client.from('staff_documents').insert({
        staff_id: staffId,
        category: 'job_description',
        title: `${preparedStaff.job_title || application.role_applied || 'Role'} Job Description`,
        description: 'Role-specific employment job description issued as part of LAUREM staff onboarding.',
        mime_type: 'text/plain',
        content_text: jobDescription,
        document_sha256: jobHash,
        source_type: 'job_description',
        source_key: String(preparedStaff.job_title || application.role_applied || '').trim().toLowerCase(),
        status: 'issued',
        requires_signature: true,
        signature_status: 'pending',
        issuer_name: lauremCompany.documentIssuer.name,
        issuer_title: lauremCompany.documentIssuer.title,
        employer_name: lauremCompany.documentIssuer.employer,
        issued_by_actor: session.email,
        issued_at: new Date().toISOString(),
      }).select('id,title').single();
      if (!jobDocumentError && createdJobDocument) {
        await client.from('staff_document_events').insert({ document_id: createdJobDocument.id, staff_id: staffId, event_type: 'created', actor_type: 'admin', actor: session.email, metadata: { source_type:'job_description', document_sha256:jobHash } });
        await sendLauremEmail(client, {
          eventType:'staff.document.issued', entityId:createdJobDocument.id, idempotencyKey:`staff.document.issued/${createdJobDocument.id}/${session.email}`,
          payload:{ from:process.env.RESEND_FROM_EMAIL || 'LAUREM Care <onboarding@resend.dev>', to:[preparedStaff.email], reply_to:lauremCompany.publicEmails.manager, subject:'Your LAUREM Job Description is ready', text:`Hello ${preparedStaff.full_name},\\n\\nYour LAUREM job description is now available in your Staff Portal. Please review and sign it online.\\n\\n${(process.env.NEXT_PUBLIC_APP_URL || 'https://recruitment.lauremcare.com').replace(/\\/$/,'')}/staff/documents/${createdJobDocument.id}\\n\\nKind regards,\\n${lauremCompany.documentIssuer.name}\\n${lauremCompany.documentIssuer.title}\\n${lauremCompany.documentIssuer.employer}`, html:`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p style="font-weight:800;color:#0f766e">LAUREM CARE</p><h1>Your job description is ready</h1><p>Hello ${preparedStaff.full_name},</p><p>Your role-specific job description is available in your Staff Portal and requires your electronic signature.</p><p><a href="${(process.env.NEXT_PUBLIC_APP_URL || 'https://recruitment.lauremcare.com').replace(/\\/$/,'')}/staff/documents/${createdJobDocument.id}" style="background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:800">Review and sign online</a></p><p>Kind regards,<br>${lauremCompany.documentIssuer.name}<br>${lauremCompany.documentIssuer.title}<br>${lauremCompany.documentIssuer.employer}</p></div>`}
        });
      }
    }

    return NextResponse.json({
      staff: staffSummary,
      audience,
      package: updatedPackage,
      tasks: finalTasks || [],
      onboardingLink,
      portal: portal ? { laurem_id: portal.staff.laurem_id || portal.staff.employee_number, address: `${portal.mailbox.handle}@${portal.mailbox.namespace}`, activation: portal.activation } : null,
      alreadyOnboarded: !atomic.created_staff,
    }, { status: atomic.created_staff ? 201 : 200 });
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
