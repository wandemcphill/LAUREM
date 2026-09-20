import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { hashToken, makeToken } from '@/lib/token';
import { normalizeLauremRole } from '@/lib/laurem-role-policy';
import { renderLauremInternationalNurseContract } from '@/lib/laurem-international-nurse-contract';
import { lauremCompany } from '@/lib/laurem-company-config';
import { sendLauremEmail } from '@/lib/laurem-email';

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://recruitment.lauremcare.com').replace(/\/$/, '');
}

function isInternationalNurseApplication(app: Record<string, any>) {
  return normalizeLauremRole(typeof app.role_applied === 'string' ? app.role_applied : '') === 'Registered Nurse'
    && app.living_in_uk === 'No';
}

function escapeHtml(value: string) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId.trim() : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: app, error: appError } = await client.from('recruitment_applications').select('*').eq('id', applicationId).maybeSingle();
    if (appError) throw appError;
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    if (!isInternationalNurseApplication(app)) {
      return NextResponse.json({ error: 'Employment contract generation is currently available only for international Registered Nurse applications.' }, { status: 409 });
    }

    const { data: existingContract, error: contractLookupError } = await client
      .from('recruitment_contracts')
      .select('id,status,version,accepted_at,accepted_by_name,contract_type')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (contractLookupError) throw contractLookupError;
    if (existingContract?.status === 'accepted' && existingContract.accepted_at) {
      return NextResponse.json({ error: 'An employment contract has already been accepted for this application. A new contract cannot overwrite the accepted record.' }, { status: 409 });
    }

    const workLocations = Array.isArray(body?.workLocations)
      ? body.workLocations.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
      : [];
    const contractContent = renderLauremInternationalNurseContract({
      employeeName: app.full_name,
      employeeAddress: app.address,
      jobTitle: 'Registered Nurse',
      startDate: app.start_date,
      contractEndDate: typeof body?.contractEndDate === 'string' ? body.contractEndDate : null,
      annualSalary: typeof body?.annualSalary === 'number' ? body.annualSalary : null,
      weeklyHours: typeof body?.weeklyHours === 'number' ? body.weeklyHours : 37.5,
      workLocations,
      probation: typeof body?.probation === 'string' ? body.probation : null,
      noticePeriodEmployee: typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null,
      noticePeriodEmployer: typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null,
      holidayEntitlement: typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null,
      pensionScheme: typeof body?.pensionScheme === 'string' ? body.pensionScheme : null,
      visaRoute: typeof body?.visaRoute === 'string' ? body.visaRoute : null,
      sponsorshipOccupationCode: typeof body?.sponsorshipOccupationCode === 'string' ? body.sponsorshipOccupationCode : null,
      nmcStatus: typeof body?.nmcStatus === 'string' ? body.nmcStatus : null,
      registrationDeadline: typeof body?.registrationDeadline === 'string' ? body.registrationDeadline : null,
      preRegistrationSalary: typeof body?.preRegistrationSalary === 'number' ? body.preRegistrationSalary : null,
      postRegistrationSalary: typeof body?.postRegistrationSalary === 'number' ? body.postRegistrationSalary : (typeof body?.annualSalary === 'number' ? body.annualSalary : null),
      relocationSupport: typeof body?.relocationSupport === 'string' ? body.relocationSupport : null,
      repayableCosts: typeof body?.repayableCosts === 'string' ? body.repayableCosts : null,
      repaymentSchedule: typeof body?.repaymentSchedule === 'string' ? body.repaymentSchedule : null,
    });

    const nextVersion = Number(existingContract?.version || 0) + 1;
    const payload = {
      application_id: applicationId,
      version: nextVersion,
      contract_type: 'international_nurse',
      job_title: 'Registered Nurse',
      start_date: app.start_date,
      contract_end_date: typeof body?.contractEndDate === 'string' ? body.contractEndDate : null,
      minimum_weekly_hours: typeof body?.weeklyHours === 'number' ? body.weeklyHours : 37.5,
      weekly_hours: typeof body?.weeklyHours === 'number' ? body.weeklyHours : 37.5,
      hourly_rate: null,
      annual_salary: typeof body?.annualSalary === 'number' ? body.annualSalary : null,
      work_locations: workLocations,
      client_or_assignment_details: null,
      notice_period_employee: typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null,
      notice_period_employer: typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null,
      holiday_entitlement: typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null,
      pension_scheme: typeof body?.pensionScheme === 'string' ? body.pensionScheme : null,
      visa_route: typeof body?.visaRoute === 'string' ? body.visaRoute : null,
      sponsorship_occupation_code: typeof body?.sponsorshipOccupationCode === 'string' ? body.sponsorshipOccupationCode : null,
      nmc_status: typeof body?.nmcStatus === 'string' ? body.nmcStatus : null,
      registration_deadline: typeof body?.registrationDeadline === 'string' ? body.registrationDeadline : null,
      pre_registration_salary: typeof body?.preRegistrationSalary === 'number' ? body.preRegistrationSalary : null,
      post_registration_salary: typeof body?.postRegistrationSalary === 'number' ? body.postRegistrationSalary : (typeof body?.annualSalary === 'number' ? body.annualSalary : null),
      relocation_support: typeof body?.relocationSupport === 'string' ? body.relocationSupport : null,
      repayable_costs: typeof body?.repayableCosts === 'string' ? body.repayableCosts : null,
      repayment_schedule: typeof body?.repaymentSchedule === 'string' ? body.repaymentSchedule : null,
      contract_source: 'Laurem international nurse template informed by GOV.UK and Scottish Code of Practice',
      contract_content: contractContent,
      status: 'draft',
      created_by: session.email,
      updated_at: new Date().toISOString(),
    };

    const { data: contract, error } = await client.from('recruitment_contracts').upsert(payload, { onConflict: 'application_id' }).select('*').single();
    if (error) throw error;
    const token = makeToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenError } = await client.from('recruitment_contract_tokens').insert({ contract_id: contract.id, token_hash: hashToken(token), expires_at: expiresAt, used_at: null });
    if (tokenError) throw tokenError;
    return NextResponse.json({ contract, contractType: contract.contract_type, acceptanceLink: `${appUrl()}/contracts/accept/${token}` }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.contract.generate_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to generate employment contract.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Contract id is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.status !== 'issued') return NextResponse.json({ error: 'Only issuing a draft contract is permitted here.' }, { status: 400 });
  const client = db();
  const { data: current, error: readError } = await client.from('recruitment_contracts')
    .select('id,application_id,status,accepted_at,job_title,contract_type').eq('id', id).maybeSingle();
  if (readError) return NextResponse.json({ error: 'Unable to load contract.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  if (current.contract_type !== 'international_nurse' || current.job_title !== 'Registered Nurse') return NextResponse.json({ error: 'Only an international Registered Nurse contract can be issued.' }, { status: 409 });
  if (current.accepted_at) return NextResponse.json({ error: 'An accepted contract is immutable.' }, { status: 409 });

  const { data: app, error: appError } = await client.from('recruitment_applications').select('id,full_name,email,role_applied,living_in_uk').eq('id', current.application_id).maybeSingle();
  if (appError) return NextResponse.json({ error: 'Unable to load contract application.' }, { status: 500 });
  if (!app || !isInternationalNurseApplication(app)) return NextResponse.json({ error: 'Contract is not eligible for issue.' }, { status: 409 });

  const token = makeToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: atomicResult, error: issueError } = await client.rpc('laurem_issue_recruitment_contract_with_token', {
    p_contract_id: id,
    p_token_hash: hashToken(token),
    p_expires_at: expiresAt,
    p_actor: session.email,
  });

  if (issueError || !atomicResult?.contract) {
    const message = issueError?.message || 'Unable to issue contract.';
    const status = message.includes('CONTRACT_ALREADY_ACCEPTED') || message.includes('CONTRACT_NOT_ISSUABLE') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const updated = atomicResult.contract;
  const link = `${appUrl()}/contracts/accept/${token}`;
  const safeName = escapeHtml(app.full_name);
  const safeLink = escapeHtml(link);
  const email = await sendLauremEmail(client, {
    eventType: 'contract_issued',
    entityId: id,
    idempotencyKey: `contract:issued:${id}:${updated.issued_at}`,
    payload: {
      from: lauremCompany.candidateCommunications.senderAddress,
      to: [app.email],
      reply_to: lauremCompany.candidateCommunications.replyToAddress,
      subject: `Your employment contract from ${lauremCompany.tradingName}`,
      text: `Dear ${app.full_name},\n\nYour international Registered Nurse employment contract is ready for review.\n\nReview and respond here:\n${link}\n\nKind regards,\n${lauremCompany.tradingName} Recruitment`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">${escapeHtml(lauremCompany.tradingName.toUpperCase())} RECRUITMENT</p><h1 style="font-size:28px">Your employment contract is ready</h1><p>Dear ${safeName},</p><p>Your international Registered Nurse employment contract is ready for review.</p><p><a href="${safeLink}" style="display:inline-block;background:#173a31;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Review contract</a></p><p>Kind regards,<br>${escapeHtml(lauremCompany.tradingName)} Recruitment</p></div>`,
    },
  });

  return NextResponse.json({
    contract: updated,
    acceptanceLink: link,
    email: { status: email.status, attempts: email.attempts, providerId: 'providerId' in email ? email.providerId : null, deliveryId: email.deliveryId, ...(email.status === 'failed' ? { error: email.error } : {}) },
  });
}
