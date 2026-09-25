import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { hashToken, makeToken } from '@/lib/token';
import { normalizeLauremRole } from '@/lib/laurem-role-policy';
import { renderLauremContract } from '@/lib/laurem-contract';
import { renderLauremInternationalNurseContract } from '@/lib/laurem-international-nurse-contract';
import { validateContractCompleteness } from '@/lib/laurem-contract-validator';
import { lauremCompany } from '@/lib/laurem-company-config';
import { sendLauremEmail } from '@/lib/laurem-email';
import { getLauremRecruitmentDocumentPack } from '@/lib/laurem-recruitment-documents';
import { getRequestId, logOperationalError, operationalError, withRequestId } from '@/lib/laurem-operational';

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

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return operationalError(getRequestId(request), 'Unauthorised', 401, 'UNAUTHORISED');

  const requestId = getRequestId(request);
  const applicationId = new URL(request.url).searchParams.get('applicationId')?.trim() || '';
  if (!applicationId) return operationalError(requestId, 'Application id is required.', 400, 'APPLICATION_ID_REQUIRED');

  try {
    const { data: contract, error } = await db()
      .from('recruitment_contracts')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (error) throw error;

    return withRequestId(NextResponse.json({ contract: contract || null }), requestId);
  } catch (error) {
    logOperationalError({
      requestId,
      event: 'admin.contract.load_failed',
      actor: session.email,
      reason: error,
      metadata: { applicationId },
    });
    return operationalError(requestId, 'Unable to load employment contract.', 500, 'CONTRACT_LOAD_FAILED');
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const session = readAdminSession(request);
  if (!session) return operationalError(requestId, 'Unauthorised', 401, 'UNAUTHORISED');

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId.trim() : '';
  if (!applicationId) return operationalError(requestId, 'Application id is required.', 400, 'APPLICATION_ID_REQUIRED');

  try {
    const client = db();
    const { data: app, error: appError } = await client
      .from('recruitment_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();
    if (appError) throw appError;
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    const role = normalizeLauremRole(typeof app.role_applied === 'string' ? app.role_applied : '');
    if (!role) return NextResponse.json({ error: 'The application role is not recognised.' }, { status: 409 });

    const { data: existingContract, error: contractLookupError } = await client
      .from('recruitment_contracts')
      .select('id,status,version,accepted_at,accepted_by_name,contract_type')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (contractLookupError) throw contractLookupError;
    if (existingContract?.status === 'accepted' && existingContract.accepted_at) {
      return NextResponse.json({ error: 'An employment contract has already been accepted for this application. A new contract cannot overwrite the accepted record.' }, { status: 409 });
    }

    const internationalNurse = isInternationalNurseApplication(app);
    const workLocations = Array.isArray(body?.workLocations)
      ? body.workLocations.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
      : [];

    const weeklyHours = typeof body?.weeklyHours === 'number' ? body.weeklyHours : (typeof body?.minimumWeeklyHours === 'number' ? body.minimumWeeklyHours : 37.5);
    const annualSalary = typeof body?.annualSalary === 'number' ? body.annualSalary : null;
    const hourlyRate = typeof body?.hourlyRate === 'number' ? body.hourlyRate : null;
    const contractEndDate = typeof body?.contractEndDate === 'string' ? body.contractEndDate : null;
    const noticePeriodEmployee = typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null;
    const noticePeriodEmployer = typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null;
    const holidayEntitlement = typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null;
    const pensionScheme = typeof body?.pensionScheme === 'string' ? body.pensionScheme : null;

    const contractInput = {
      employeeName: app.full_name,
      employeeAddress: app.address,
      jobTitle: role,
      employmentType: typeof body?.employmentType === 'string' ? body.employmentType : 'Permanent',
      startDate: app.start_date,
      continuousEmploymentDate: typeof body?.continuousEmploymentDate === 'string' ? body.continuousEmploymentDate : app.start_date,
      contractEndDate,
      minimumWeeklyHours: weeklyHours,
      weeklyHours,
      normalWorkingDays: typeof body?.normalWorkingDays === 'string' ? body.normalWorkingDays : null,
      shiftPattern: typeof body?.shiftPattern === 'string' ? body.shiftPattern : null,
      workLocations,
      hourlyRate,
      annualSalary,
      payFrequency: typeof body?.payFrequency === 'string' ? body.payFrequency : null,
      payMethod: typeof body?.payMethod === 'string' ? body.payMethod : null,
      holidayEntitlement,
      holidayPayCalculation: typeof body?.holidayPayCalculation === 'string' ? body.holidayPayCalculation : null,
      sickPay: typeof body?.sickPay === 'string' ? body.sickPay : null,
      paidLeave: typeof body?.paidLeave === 'string' ? body.paidLeave : null,
      contractualBenefits: typeof body?.contractualBenefits === 'string' ? body.contractualBenefits : null,
      nonContractualBenefits: typeof body?.nonContractualBenefits === 'string' ? body.nonContractualBenefits : null,
      probation: typeof body?.probation === 'string' ? body.probation : null,
      probationConditions: typeof body?.probationConditions === 'string' ? body.probationConditions : null,
      noticePeriodEmployee,
      noticePeriodEmployer,
      mandatoryTraining: typeof body?.mandatoryTraining === 'string' ? body.mandatoryTraining : null,
      mandatoryTrainingPaidBy: typeof body?.mandatoryTrainingPaidBy === 'string' ? body.mandatoryTrainingPaidBy : null,
      pensionScheme,
      clientOrAssignmentDetails: typeof body?.clientOrAssignmentDetails === 'string' ? body.clientOrAssignmentDetails : null,
      visaRoute: typeof body?.visaRoute === 'string' ? body.visaRoute : null,
      sponsorshipOccupationCode: typeof body?.sponsorshipOccupationCode === 'string' ? body.sponsorshipOccupationCode : null,
      nmcStatus: typeof body?.nmcStatus === 'string' ? body.nmcStatus : null,
      registrationDeadline: typeof body?.registrationDeadline === 'string' ? body.registrationDeadline : null,
      preRegistrationRole: typeof body?.preRegistrationRole === 'string' ? body.preRegistrationRole : null,
      preRegistrationSalary: typeof body?.preRegistrationSalary === 'number' ? body.preRegistrationSalary : null,
      postRegistrationSalary: typeof body?.postRegistrationSalary === 'number' ? body.postRegistrationSalary : annualSalary,
      relocationSupport: typeof body?.relocationSupport === 'string' ? body.relocationSupport : null,
      repayableCosts: typeof body?.repayableCosts === 'string' ? body.repayableCosts : null,
      repaymentSchedule: typeof body?.repaymentSchedule === 'string' ? body.repaymentSchedule : null,
      repaymentMethod: typeof body?.repaymentMethod === 'string' ? body.repaymentMethod : null,
    };

    const completeness = validateContractCompleteness(role, contractInput, internationalNurse ? 'international' : 'uk');

    const contractContent = internationalNurse
      ? renderLauremInternationalNurseContract(contractInput)
      : renderLauremContract(contractInput);

    const nextVersion = Number(existingContract?.version || 0) + 1;
    const payload = {
      application_id: applicationId,
      version: nextVersion,
      contract_type: internationalNurse ? 'international_nurse' : 'standard',
      job_title: role,
      employment_type: contractInput.employmentType,
      start_date: app.start_date,
      continuous_employment_date: contractInput.continuousEmploymentDate,
      contract_end_date: contractEndDate,
      minimum_weekly_hours: weeklyHours,
      weekly_hours: weeklyHours,
      normal_working_days: contractInput.normalWorkingDays,
      shift_pattern: contractInput.shiftPattern,
      hourly_rate: hourlyRate,
      annual_salary: annualSalary,
      pay_frequency: contractInput.payFrequency,
      pay_method: contractInput.payMethod,
      work_locations: workLocations,
      holiday_pay_calculation: contractInput.holidayPayCalculation,
      sick_pay: contractInput.sickPay,
      paid_leave: contractInput.paidLeave,
      contractual_benefits: contractInput.contractualBenefits,
      non_contractual_benefits: contractInput.nonContractualBenefits,
      probation: contractInput.probation,
      probation_conditions: contractInput.probationConditions,
      notice_period_employee: noticePeriodEmployee,
      notice_period_employer: noticePeriodEmployer,
      mandatory_training: contractInput.mandatoryTraining,
      mandatory_training_paid_by: contractInput.mandatoryTrainingPaidBy,
      client_or_assignment_details: contractInput.clientOrAssignmentDetails,
      pension_scheme: pensionScheme,
      visa_route: internationalNurse ? contractInput.visaRoute : null,
      sponsorship_occupation_code: internationalNurse ? contractInput.sponsorshipOccupationCode : null,
      nmc_status: internationalNurse ? contractInput.nmcStatus : null,
      registration_deadline: internationalNurse ? contractInput.registrationDeadline : null,
      pre_registration_role: internationalNurse ? contractInput.preRegistrationRole : null,
      pre_registration_salary: internationalNurse ? contractInput.preRegistrationSalary : null,
      post_registration_salary: internationalNurse ? contractInput.postRegistrationSalary : null,
      relocation_support: internationalNurse ? contractInput.relocationSupport : null,
      repayable_costs: internationalNurse ? contractInput.repayableCosts : null,
      repayment_schedule: internationalNurse ? contractInput.repaymentSchedule : null,
      repayment_method: internationalNurse ? contractInput.repaymentMethod : null,
      contract_source: internationalNurse
        ? 'Laurem international nurse contract template informed by current UK and Scottish guidance'
        : 'Laurem standard employment contract template',
      contract_content: contractContent,
      status: 'draft',
      created_by: session.email,
      updated_at: new Date().toISOString(),
    };

    const { data: contract, error } = await client
      .from('recruitment_contracts')
      .upsert(payload, { onConflict: 'application_id' })
      .select('*')
      .single();
    if (error) throw error;

    return withRequestId(
      NextResponse.json({
        id: contract.id,
        status: contract.status,
        contractType: contract.contract_type,
        completeness,
        contract,
      }, { status: 201 }),
      requestId,
    );
  } catch (error) {
    logOperationalError({ requestId, event: 'admin.contract.generate_failed', actor: session.email, reason: error, metadata: { applicationId } });
    return operationalError(requestId, 'Unable to generate employment contract.', 500, 'CONTRACT_GENERATION_FAILED');
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  const session = readAdminSession(request);
  if (!session) return operationalError(requestId, 'Unauthorised', 401, 'UNAUTHORISED');

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return operationalError(requestId, 'Contract id is required.', 400, 'CONTRACT_ID_REQUIRED');

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.status !== 'issued') return NextResponse.json({ error: 'Only issuing a draft contract is permitted here.' }, { status: 400 });

  const client = db();
  const { data: current, error: readError } = await client
    .from('recruitment_contracts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: 'Unable to load contract.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  if (!['standard','international_nurse'].includes(current.contract_type)) return NextResponse.json({ error: 'This contract type cannot be issued.' }, { status: 409 });
  if (current.accepted_at) return NextResponse.json({ error: 'An accepted contract is immutable.' }, { status: 409 });

  const { data: app, error: appError } = await client
    .from('recruitment_applications')
    .select('id,full_name,email,role_applied,living_in_uk,address,start_date')
    .eq('id', current.application_id)
    .maybeSingle();
  if (appError) return NextResponse.json({ error: 'Unable to load contract application.' }, { status: 500 });
  if (!app || !normalizeLauremRole(app.role_applied || '')) return NextResponse.json({ error: 'Contract is not eligible for issue.' }, { status: 409 });

  // central contract completeness validation before issuing
  const contractInput = {
    employeeName: app.full_name,
    employeeAddress: app.address,
    jobTitle: current.job_title || app.role_applied,
    employmentType: current.employment_type || 'Permanent',
    startDate: current.start_date || app.start_date,
    continuousEmploymentDate: current.continuous_employment_date || current.start_date || app.start_date,
    minimumWeeklyHours: current.minimum_weekly_hours ?? current.weekly_hours,
    normalWorkingDays: current.normal_working_days,
    shiftPattern: current.shift_pattern,
    workLocations: current.work_locations || [],
    hourlyRate: current.hourly_rate,
    annualSalary: current.annual_salary,
    payFrequency: current.pay_frequency,
    payMethod: current.pay_method,
    holidayEntitlement: current.holiday_entitlement,
    holidayPayCalculation: current.holiday_pay_calculation,
    sickPay: current.sick_pay,
    paidLeave: current.paid_leave,
    contractualBenefits: current.contractual_benefits,
    probation: current.probation,
    probationConditions: current.probation_conditions,
    noticePeriodEmployee: current.notice_period_employee,
    noticePeriodEmployer: current.notice_period_employer,
    mandatoryTraining: current.mandatory_training,
    mandatoryTrainingPaidBy: current.mandatory_training_paid_by,
    pensionScheme: current.pension_scheme,
    visaRoute: current.visa_route,
    sponsorshipOccupationCode: current.sponsorship_occupation_code,
    nmcStatus: current.nmc_status,
    registrationDeadline: current.registration_deadline,
    preRegistrationRole: current.pre_registration_role,
    preRegistrationSalary: current.pre_registration_salary,
    postRegistrationSalary: current.post_registration_salary,
    relocationSupport: current.relocation_support,
    repayableCosts: current.repayable_costs,
    repaymentSchedule: current.repayment_schedule,
    repaymentMethod: current.repayment_method,
  };

  const validation = validateContractCompleteness(app.role_applied, contractInput, current.contract_type === 'international_nurse' ? 'international' : 'uk');
  if (!validation.valid) {
    return NextResponse.json({
      error: 'Cannot issue contract: material employment particulars are missing.',
      code: 'CONTRACT_INCOMPLETE',
      validationErrors: validation.errors,
      missingFields: validation.missingFields,
    }, { status: 422 });
  }

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
  const link = appUrl() + '/contracts/accept/' + token;

  const rawDocumentToken = makeToken();
  const documentPackExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const documents = getLauremRecruitmentDocumentPack({
    role: app.role_applied,
    staffName: app.full_name,
    livingInUk: app.living_in_uk,
  });
  const jobHash = createHash('sha256').update(documents.jobDescription, 'utf8').digest('hex');
  const handbookHash = createHash('sha256').update(documents.handbookContent, 'utf8').digest('hex');
  const packResult = await client.rpc('laurem_issue_candidate_document_pack', {
    p_application_id: app.id,
    p_token_hash: hashToken(rawDocumentToken),
    p_expires_at: documentPackExpiresAt,
    p_job_description: documents.jobDescription,
    p_job_description_sha256: jobHash,
    p_handbook_title: documents.handbookTitle,
    p_handbook_content: documents.handbookContent,
    p_handbook_sha256: handbookHash,
    p_actor: session.email,
  });
  if (packResult.error) {
    logOperationalError({ requestId, event: 'admin.contract.document_pack_failed', actor: session.email, reason: packResult.error, metadata: { applicationId: app.id, contractId: id } });
    return operationalError(requestId, 'Unable to issue the candidate offer document package.', 500, 'DOCUMENT_PACK_ISSUE_FAILED');
  }
  const documentPackLink = appUrl() + '/candidate-documents/' + rawDocumentToken;
  const safeName = escapeHtml(app.full_name);
  const safeLink = escapeHtml(link);
  const safeDocumentPackLink = escapeHtml(documentPackLink);
  const email = await sendLauremEmail(client, {
    eventType: 'contract_issued',
    entityId: id,
    idempotencyKey: 'contract:issued:' + id + ':' + updated.issued_at,
    payload: {
      from: lauremCompany.candidateCommunications.senderAddress,
      to: [app.email],
      reply_to: lauremCompany.candidateCommunications.replyToAddress,
      subject: 'Your LAUREM employment offer package from ' + lauremCompany.tradingName,
      text: 'Dear ' + app.full_name + ',\n\nYour LAUREM employment offer package is ready. It includes your Employment Contract, Job Description, Handbook and onboarding preparation information.\n\nSign or decline your contract:\n' + link + '\n\nReview your Job Description and Handbook:\n' + documentPackLink + '\n\nThese documents are completed online. You will not be asked to sign the Contract, Job Description or Handbook again during onboarding.\n\nKind regards,\n' + lauremCompany.tradingName + ' Recruitment',
      html: '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">' + escapeHtml(lauremCompany.tradingName.toUpperCase()) + ' RECRUITMENT</p><h1 style="font-size:28px">Your employment offer package is ready</h1><p>Dear ' + safeName + ',</p><p>Your <strong>' + escapeHtml(current.job_title) + '</strong> employment offer package is ready. It contains your Employment Contract, Job Description, Handbook and onboarding preparation information.</p><p><a href="' + safeLink + '" style="display:inline-block;background:#173a31;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Review & sign contract</a></p><p><a href="' + safeDocumentPackLink + '" style="display:inline-block;border:1px solid #173a31;color:#173a31;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Job Description & Handbook</a></p><p>All signing is completed online. You will not be asked to sign these three employment documents again during onboarding.</p><p>Kind regards,<br>' + escapeHtml(lauremCompany.tradingName) + ' Recruitment</p></div>',
    },
  });

  return withRequestId(NextResponse.json({
    contract: updated,
    acceptanceLink: link,
    documentPackLink,
    email: { status: email.status, attempts: email.attempts, providerId: 'providerId' in email ? email.providerId : null, deliveryId: email.deliveryId, ...(email.status === 'failed' ? { error: email.error } : {}) },
  }), requestId);
}
