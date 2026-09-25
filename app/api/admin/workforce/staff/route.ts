import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { createLauremStaffNotification } from '@/lib/laurem-staff-notifications';
import { recordLauremAuditEvent } from '@/lib/laurem-audit';
import { LAUREM_STAFF_EMPLOYMENT_TRANSITIONS, isLauremStaffEmploymentStatus } from '@/lib/laurem-lifecycle-policy';
import { buildStaffComplianceSnapshot } from '@/lib/laurem-hr-workforce';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.get('status')?.trim();
  const role = url.searchParams.get('role')?.trim();
  const location = url.searchParams.get('location')?.trim();
  const managerId = url.searchParams.get('managerId')?.trim();
  const complianceState = url.searchParams.get('complianceState')?.trim();
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);

  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const limit = Math.min(100, Math.max(1, isNaN(limitParam) ? 50 : limitParam));
  const offset = (page - 1) * limit;

  const client = db();

  // Query base profiles
  let query = client.from('staff_profiles')
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
      activated_at,
      created_at,
      updated_at
    `, { count: 'exact' });

  if (status && ['pending', 'active', 'suspended', 'leaver'].includes(status)) {
    query = query.eq('employment_status', status);
  }

  if (managerId) {
    query = query.eq('manager_id', managerId);
  }

  if (location) {
    query = query.ilike('location', `%${location}%`);
  }

  if (role) {
    query = query.ilike('job_title', `%${role}%`);
  }

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,employee_number.ilike.%${q}%,laurem_id.ilike.%${q}%,email.ilike.%${q}%`);
  }

  query = query.order('full_name', { ascending: true }).range(offset, offset + limit - 1);

  const { data: rawStaff, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Unable to load staff records.' }, { status: 500 });
  }

  const staffList = rawStaff || [];

  // Fetch managers mapping to populate manager names
  const managerIds = Array.from(new Set(staffList.map((s) => s.manager_id).filter(Boolean))) as string[];
  let managerMap: Record<string, { id: string; full_name: string; job_title: string }> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await client.from('staff_profiles')
      .select('id, full_name, job_title')
      .in('id', managerIds);
    if (managers) {
      managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));
    }
  }

  // Calculate compliance snapshots
  const enrichedStaff = staffList.map((item) => {
    const compliance = buildStaffComplianceSnapshot(item);
    const manager = item.manager_id ? managerMap[item.manager_id] || null : null;
    return {
      ...item,
      manager,
      compliance,
    };
  });

  // Filter in memory for complianceState if specified
  let filteredStaff = enrichedStaff;
  if (complianceState && ['Current', 'Expiring Soon', 'Expired', 'Missing', 'Under Review'].includes(complianceState)) {
    filteredStaff = enrichedStaff.filter((s) => s.compliance.overallStatus === complianceState);
  }

  const total = count ?? filteredStaff.length;
  const totalPages = Math.ceil(total / limit) || 1;

  return NextResponse.json({
    staff: filteredStaff,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Staff id is required.' }, { status: 400 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nextStatus = typeof body?.employmentStatus === 'string' ? body.employmentStatus : '';
  const reason = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  const endDate = typeof body?.endDate === 'string' ? body.endDate : null;

  if (!isLauremStaffEmploymentStatus(nextStatus)) return NextResponse.json({ error: 'Invalid employment status.' }, { status: 400 });
  if (['suspended', 'leaver', 'active'].includes(nextStatus) && !reason) {
    return NextResponse.json({ error: 'A reason is required for this employment status change.' }, { status: 400 });
  }
  if (nextStatus === 'leaver' && (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
    return NextResponse.json({ error: 'A valid end date is required when marking staff as a leaver.' }, { status: 400 });
  }

  const client = db();
  const { data: current, error: currentError } = await client
    .from('staff_profiles')
    .select('id,application_id,employment_status,full_name,session_version,activated_at,password_hash')
    .eq('id', id)
    .maybeSingle();
  if (currentError) return NextResponse.json({ error: 'Unable to load staff record.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  if (current.employment_status === nextStatus) return NextResponse.json({ error: 'Staff member is already in that status.' }, { status: 400 });

  if (
    !isLauremStaffEmploymentStatus(current.employment_status)
    || !LAUREM_STAFF_EMPLOYMENT_TRANSITIONS[current.employment_status].includes(nextStatus)
  ) {
    return NextResponse.json({ error: `Transition from ${current.employment_status} to ${nextStatus} is not allowed.` }, { status: 409 });
  }

  if (current.employment_status === 'pending' && nextStatus === 'active') {
    if (!current.activated_at || !current.password_hash) {
      return NextResponse.json({
        error: 'Pending staff must complete the one-time Staff Portal activation before employment can become active.',
        code: 'STAFF_ACTIVATION_REQUIRED',
      }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    employment_status: nextStatus,
    end_date: nextStatus === 'leaver' ? endDate : null,
    updated_at: now,
  };
  if (typeof current.session_version === 'number') patch.session_version = current.session_version + 1;

  const { data, error } = await client.from('staff_profiles').update(patch).eq('id', id)
    .select('id,employee_number,full_name,email,job_title,employment_status,start_date,end_date,location,activated_at,updated_at').single();
  if (error) return NextResponse.json({ error: 'Unable to update staff status.' }, { status: 500 });

  await client.from('staff_portal_sessions').update({ revoked_at: now }).eq('staff_id', id).is('revoked_at', null);
  await client.from('staff_password_reset_tokens').update({ consumed_at: now }).eq('staff_id', id).is('consumed_at', null);

  await client.from('workforce_audit_events').insert({
    staff_id: id,
    event_type: 'staff.status_changed',
    actor: session.email,
    details: { from: current.employment_status, to: nextStatus, endDate, reason },
  });

  await recordLauremAuditEvent({
    lifecycleArea: 'staff_account',
    entityType: 'staff_profile',
    entityId: id,
    staffId: id,
    applicationId: current.application_id,
    actorType: 'admin',
    actor: session.email,
    action: 'employment_status_changed',
    previousState: current.employment_status,
    newState: nextStatus,
    reason,
    metadata: { endDate },
  });

  const statusLabel = nextStatus.replaceAll('_', ' ');
  await createLauremStaffNotification(client, {
    staffId: id,
    category: 'employment',
    title: `Employment status updated: ${statusLabel}`,
    body: `Your LAUREM employment status has changed from ${current.employment_status.replaceAll('_', ' ')} to ${statusLabel}.`,
    actionUrl: '/staff/profile',
  });

  return NextResponse.json({ staff: data });
}
