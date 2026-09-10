import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { hashToken, makeToken } from '@/lib/token';
import { renderLauremContract } from '@/lib/laurem-contract';
import { renderLauremInternationalNurseContract } from '@/lib/laurem-international-nurse-contract';

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : '';
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: app, error: appError } = await client.from('recruitment_applications').select('*').eq('id', applicationId).maybeSingle();
    if (appError) throw appError;
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    const { data: existingContract, error: contractLookupError } = await client
      .from('recruitment_contracts')
      .select('id,status,version,accepted_at,accepted_by_name')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (contractLookupError) throw contractLookupError;
    if (existingContract?.status === 'accepted' && existingContract.accepted_at) {
      return NextResponse.json({ error: 'An employment contract has already been accepted for this application. A new contract cannot overwrite the accepted record.' }, { status: 409 });
    }

    const isInternationalNurse =
      app.role_applied === 'Registered Nurse - International Recruitment' ||
      (app.role_applied === 'Registered Nurse' && app.living_in_uk === 'No');
    const workLocations = Array.isArray(body?.workLocations)
      ? body.workLocations.filter((v): v is string => typeof v === 'string')
      : [];

    const contractContent = isInternationalNurse
      ? renderLauremInternationalNurseContract({
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
        })
      : renderLauremContract({
          employeeName: app.full_name,
          employeeAddress: app.address,
          jobTitle: app.role_applied,
          startDate: app.start_date,
          contractEndDate: typeof body?.contractEndDate === 'string' ? body.contractEndDate : null,
          minimumWeeklyHours: typeof body?.minimumWeeklyHours === 'number' ? body.minimumWeeklyHours : null,
          hourlyRate: typeof body?.hourlyRate === 'number' ? body.hourlyRate : null,
          workLocations,
          clientOrAssignmentDetails: typeof body?.clientOrAssignmentDetails === 'string' ? body.clientOrAssignmentDetails : null,
          noticePeriodEmployee: typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null,
          noticePeriodEmployer: typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null,
          holidayEntitlement: typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null,
          pensionScheme: typeof body?.pensionScheme === 'string' ? body.pensionScheme : null,
        });

    const nextVersion = Number(existingContract?.version || 0) + 1;
    const payload = {
      application_id: applicationId,
      version: nextVersion,
      contract_type: isInternationalNurse ? 'international_nurse' : 'standard',
      job_title: isInternationalNurse ? 'Registered Nurse' : app.role_applied,
      start_date: app.start_date,
      contract_end_date: typeof body?.contractEndDate === 'string' ? body.contractEndDate : null,
      minimum_weekly_hours: typeof body?.minimumWeeklyHours === 'number' ? body.minimumWeeklyHours : (isInternationalNurse ? 37.5 : null),
      weekly_hours: typeof body?.weeklyHours === 'number' ? body.weeklyHours : (isInternationalNurse ? 37.5 : null),
      hourly_rate: typeof body?.hourlyRate === 'number' ? body.hourlyRate : null,
      annual_salary: typeof body?.annualSalary === 'number' ? body.annualSalary : null,
      work_locations: workLocations,
      client_or_assignment_details: typeof body?.clientOrAssignmentDetails === 'string' ? body.clientOrAssignmentDetails : null,
      notice_period_employee: typeof body?.noticePeriodEmployee === 'string' ? body.noticePeriodEmployee : null,
      notice_period_employer: typeof body?.noticePeriodEmployer === 'string' ? body.noticePeriodEmployer : null,
      holiday_entitlement: typeof body?.holidayEntitlement === 'string' ? body.holidayEntitlement : null,
      pension_scheme: typeof body?.pensionScheme === 'string' ? body.pensionScheme : null,
      visa_route: isInternationalNurse && typeof body?.visaRoute === 'string' ? body.visaRoute : null,
      sponsorship_occupation_code: isInternationalNurse && typeof body?.sponsorshipOccupationCode === 'string' ? body.sponsorshipOccupationCode : null,
      nmc_status: isInternationalNurse && typeof body?.nmcStatus === 'string' ? body.nmcStatus : null,
      registration_deadline: isInternationalNurse && typeof body?.registrationDeadline === 'string' ? body.registrationDeadline : null,
      pre_registration_salary: isInternationalNurse && typeof body?.preRegistrationSalary === 'number' ? body.preRegistrationSalary : null,
      post_registration_salary: isInternationalNurse && typeof body?.postRegistrationSalary === 'number' ? body.postRegistrationSalary : (isInternationalNurse && typeof body?.annualSalary === 'number' ? body.annualSalary : null),
      relocation_support: isInternationalNurse && typeof body?.relocationSupport === 'string' ? body.relocationSupport : null,
      repayable_costs: isInternationalNurse && typeof body?.repayableCosts === 'string' ? body.repayableCosts : null,
      repayment_schedule: isInternationalNurse && typeof body?.repaymentSchedule === 'string' ? body.repaymentSchedule : null,
      contract_source: isInternationalNurse ? 'Laurem international nurse template informed by GOV.UK and Scottish Code of Practice' : 'Laurem standard employment template',
      contract_content: contractContent,
      status: 'draft',
      created_by: session.email,
      updated_at: new Date().toISOString(),
    };

    const { data: contract, error } = await client.from('recruitment_contracts').upsert(payload, { onConflict: 'application_id' }).select('*').single();
    if (error) throw error;
    const token = makeToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenError } = await client.from('recruitment_contract_tokens').insert({ contract_id: contract.id, token_hash: hashToken(token), expires_at: expiresAt });
    if (tokenError) throw tokenError;
    return NextResponse.json({
      contract,
      contractType: contract.contract_type,
      acceptanceLink: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/contracts/accept/${token}`,
    }, { status: 201 });
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
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!['draft','issued'].includes(status)) return NextResponse.json({ error: 'Only draft or issued status can be set by recruiter.' }, { status: 400 });
  const client = db();
  const { data: current, error: readError } = await client.from('recruitment_contracts')
    .select('id,status,accepted_at').eq('id', id).maybeSingle();
  if (readError) return NextResponse.json({ error: 'Unable to load contract.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  if (current.status === 'accepted' && current.accepted_at) {
    return NextResponse.json({ error: 'An accepted employment contract is immutable and cannot be reopened or edited.' }, { status: 409 });
  }
  const { data, error } = await client.from('recruitment_contracts')
    .update({ status, issued_at: status === 'issued' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', current.status).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to update contract.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Contract changed concurrently. Refresh and try again.' }, { status: 409 });
  return NextResponse.json({ contract: data });
}
