import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { buildStaffOperationalSnapshot } from '@/lib/laurem-workforce-integrity';
import { buildStaffComplianceSnapshot } from '@/lib/laurem-hr-workforce';

const transitions: Record<string, string[]> = {
  pending: ['active'],
  active: ['suspended', 'leaver'],
  suspended: ['active', 'leaver'],
  leaver: [],
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { staffId } = await params;
  if (!staffId) return NextResponse.json({ error: 'Staff id is required.' }, { status: 400 });

  const client = db();
  const { data: staff, error: staffError } = await client.from('staff_profiles')
    .select(`
      id,
      application_id,
      employee_number,
      laurem_id,
      full_name,
      email,
      phone,
      job_title,
      employment_status,
      start_date,
      end_date,
      location,
      manager_id,
      nmc_number,
      nmc_status,
      nmc_expiry_date,
      right_to_work_verified,
      right_to_work_expiry_date,
      right_to_work_notes,
      dbs_verified,
      dbs_pvg_status,
      dbs_pvg_check_date,
      dbs_pvg_expiry_date,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      contract_id,
      address_line_1,
      address_line_2,
      city,
      county,
      postcode,
      country,
      profile_photo_path,
      profile_photo_updated_at,
      activated_at,
      created_at,
      updated_at
    `)
    .eq('id', staffId).maybeSingle();

  if (staffError) return NextResponse.json({ error: 'Unable to load staff record.' }, { status: 500 });
  if (!staff) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });

  // Fetch manager details if manager_id is present
  let manager: { id: string; full_name: string; job_title: string; email: string } | null = null;
  if (staff.manager_id) {
    const { data: mgrData } = await client.from('staff_profiles')
      .select('id, full_name, job_title, email')
      .eq('id', staff.manager_id)
      .maybeSingle();
    if (mgrData) manager = mgrData;
  }

  // Fetch pathway from application if application_id exists
  let employmentPathway: string = 'UK Standard';
  if (staff.application_id) {
    const { data: appData } = await client.from('recruitment_applications')
      .select('pathway, payload')
      .eq('id', staff.application_id)
      .maybeSingle();
    if (appData?.pathway) {
      employmentPathway = appData.pathway === 'nurse' ? 'International Nurse' : appData.pathway === 'sponsorship' ? 'Overseas Sponsorship' : 'UK Standard';
    }
  }

  const [assignmentsResult, timesheetsResult, leaveResult, packageResult, auditResult, payrollResult, availabilityResult, documentsResult] = await Promise.all([
    client.from('staff_assignments').select('id,staff_id,client_name,location,scheduled_start,scheduled_end,status,notes,created_at,updated_at').eq('staff_id', staffId).order('scheduled_start', { ascending: false }).limit(100),
    client.from('staff_timesheets').select('id,staff_id,assignment_id,work_date,clock_in,clock_out,break_minutes,total_hours,status,notes,approved_by,approved_at,created_at,updated_at').eq('staff_id', staffId).order('work_date', { ascending: false }).limit(100),
    client.from('staff_leave_requests').select('id,staff_id,leave_type,start_date,end_date,total_days,reason,status,reviewed_by,reviewed_at,review_note,created_at,updated_at').eq('staff_id', staffId).order('start_date', { ascending: false }).limit(100),
    client.from('staff_onboarding_packages').select('*').eq('staff_id', staffId).maybeSingle(),
    client.from('laurem_audit_events').select('id,lifecycle_area,entity_type,entity_id,application_id,staff_id,actor_type,actor,action,previous_state,new_state,reason,metadata,occurred_at').eq('staff_id', staffId).order('occurred_at', { ascending: false }).limit(100),
    client.from('payroll_entries').select('id,payroll_period_id,staff_id,approved_hours,hourly_rate,gross_amount,status,notes,created_at,updated_at').eq('staff_id', staffId).order('created_at', { ascending: false }).limit(100),
    client.from('staff_availability').select('id,staff_id,effective_from,full_time,part_time,days,nights,weekends,notes,created_at').eq('staff_id', staffId).lte('effective_from', new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())).order('effective_from', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('staff_documents').select('id,title,category,source_type,source_key,signature_status,requires_signature,issued_at,status,signed_at,superseded_at,superseded_by').eq('staff_id', staffId).order('issued_at', { ascending: false }).limit(100),
  ]);

  const failed = [assignmentsResult, timesheetsResult, leaveResult, packageResult, auditResult, payrollResult, availabilityResult, documentsResult].find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: 'Unable to load the complete staff workspace.' }, { status: 500 });

  let onboarding = null as { package: unknown; tasks: unknown[] } | null;
  if (packageResult.data) {
    const { data: tasks, error: taskError } = await client.from('staff_onboarding_tasks').select('*').eq('package_id', packageResult.data.id).order('sort_order', { ascending: true });
    if (taskError) return NextResponse.json({ error: 'Unable to load onboarding tasks.' }, { status: 500 });
    onboarding = { package: packageResult.data, tasks: tasks || [] };
  }

  const profilePhotoUrl = staff.profile_photo_path
    ? `/api/admin/workforce/staff/${encodeURIComponent(staffId)}/photo?v=${encodeURIComponent(String(staff.profile_photo_updated_at || 'current'))}`
    : null;

  const operationalState = buildStaffOperationalSnapshot({
    employmentStatus: staff.employment_status,
    assignments: assignmentsResult.data || [],
    timesheets: timesheetsResult.data || [],
    leaveRequests: leaveResult.data || [],
    payrollEntries: payrollResult.data || [],
  });

  const allDocuments = documentsResult.data || [];
  const activeDocuments = allDocuments.filter((doc: any) => doc.status === 'issued');

  const tasksList = onboarding?.tasks || [];
  const requiredTotal = tasksList.filter((t: any) => t.required).length;
  const requiredDone = tasksList.filter((t: any) => t.required && ['completed', 'waived'].includes(t.status)).length;
  const onboardingComplete = requiredTotal > 0 ? requiredDone === requiredTotal : true;

  const compliance = buildStaffComplianceSnapshot(staff, {
    documentsComplete: activeDocuments.every((doc: any) => !doc.requires_signature || doc.signature_status === 'signed'),
    onboardingComplete,
  });

  return NextResponse.json({
    staff: { ...staff, profile_photo_url: profilePhotoUrl, manager, employment_pathway: employmentPathway },
    compliance,
    assignments: assignmentsResult.data || [],
    timesheets: timesheetsResult.data || [],
    leaveRequests: leaveResult.data || [],
    payrollEntries: payrollResult.data || [],
    onboarding,
    documents: allDocuments,
    audit: (auditResult.data || []).map((event: any) => ({
      id: event.id,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      event_type: event.action,
      actor: event.actor,
      details: {
        lifecycleArea: event.lifecycle_area,
        actorType: event.actor_type,
        previousState: event.previous_state,
        newState: event.new_state,
        reason: event.reason,
        metadata: event.metadata,
      },
      created_at: event.occurred_at,
    })),
    availability: availabilityResult.data || null,
    operationalState,
    documentsSummary: {
      total: activeDocuments.length,
      signaturePending: activeDocuments.filter((item: any) => item.requires_signature && item.signature_status === 'pending').length,
      latestIssuedAt: activeDocuments[0]?.issued_at || null,
    },
    actor: session.email,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { staffId } = await params;
  if (!staffId) return NextResponse.json({ error: 'Staff id is required.' }, { status: 400 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nextStatus = typeof body?.employmentStatus === 'string' ? body.employmentStatus : '';
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  const endDate = typeof body?.endDate === 'string' ? body.endDate : null;
  if (!['pending', 'active', 'suspended', 'leaver'].includes(nextStatus)) return NextResponse.json({ error: 'Invalid employment status.' }, { status: 400 });
  if (nextStatus === 'leaver' && (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) return NextResponse.json({ error: 'A valid end date is required when marking staff as a leaver.' }, { status: 400 });
  if (['suspended', 'leaver'].includes(nextStatus) && !note) return NextResponse.json({ error: 'A reason is required for suspension or leaver status.' }, { status: 400 });

  const client = db();
  const { data: current, error: currentError } = await client.from('staff_profiles').select('id,application_id,employment_status,activated_at,password_hash,full_name,session_version').eq('id', staffId).maybeSingle();
  if (currentError) return NextResponse.json({ error: 'Unable to load staff record.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  if (current.employment_status === nextStatus) return NextResponse.json({ error: 'Staff member is already in that status.' }, { status: 400 });
  if (!transitions[current.employment_status]?.includes(nextStatus)) return NextResponse.json({ error: `Transition from ${current.employment_status} to ${nextStatus} is not allowed.` }, { status: 409 });

  if (
    nextStatus === 'active'
    && current.employment_status !== 'active'
    && (!current.activated_at || !current.password_hash)
  ) {
    return NextResponse.json({
      error: 'Staff accounts become active through the one-time staff portal activation flow. Complete portal activation instead of manually marking this staff record active.',
    }, { status: 409 });
  }

  const patch: Record<string, unknown> = { employment_status: nextStatus, end_date: nextStatus === 'leaver' ? endDate : null, updated_at: new Date().toISOString() };
  if (typeof current.session_version === 'number') patch.session_version = current.session_version + 1;

  const { data, error } = await client.from('staff_profiles').update(patch).eq('id', staffId).eq('employment_status', current.employment_status)
    .select('id,employee_number,full_name,email,job_title,employment_status,start_date,end_date,location,updated_at').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to update staff status. It may have changed; refresh and try again.' }, { status: 409 });

  const { error: auditError } = await client.rpc('laurem_record_audit_event', {
    p_lifecycle_area: 'workforce',
    p_entity_type: 'staff',
    p_entity_id: staffId,
    p_application_id: null,
    p_staff_id: staffId,
    p_actor_type: 'admin',
    p_actor: session.email,
    p_action: 'staff.status_changed',
    p_previous_state: current.employment_status,
    p_new_state: nextStatus,
    p_reason: note || null,
    p_source_table: null,
    p_source_event_id: null,
    p_metadata: { endDate },
  });
  if (auditError) {
    return NextResponse.json({ error: 'Staff status changed, but the canonical audit record could not be written. Escalate this event before continuing.' }, { status: 503 });
  }

  return NextResponse.json({ staff: data });
}
