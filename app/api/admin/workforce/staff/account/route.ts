import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { provisionLauremStaffPortal } from '@/lib/laurem-staff-provision';
import { recordLauremAuditEvent } from '@/lib/laurem-audit';

function accountState(staff: { employment_status: string; activated_at: string | null; activation_expires_at: string | null }) {
  if (staff.employment_status === 'active' && staff.activated_at) return 'active';
  if (staff.employment_status === 'suspended' && staff.activated_at) return 'suspended';
  if (staff.employment_status === 'leaver' && staff.activated_at) return 'leaver';
  if (staff.employment_status === 'pending' && staff.activation_expires_at && new Date(staff.activation_expires_at).getTime() > Date.now()) return 'activation_pending';
  if (staff.employment_status === 'pending') return 'activation_needed';
  return 'state_review';
}

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const client = db();
  const { data, error } = await client.from('staff_profiles')
    .select('id,application_id,employee_number,laurem_id,full_name,email,job_title,employment_status,activated_at,activation_expires_at,activation_used_at,session_version,created_at,updated_at')
    .order('full_name', { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: 'Unable to load staff account state.' }, { status: 500 });

  const staff = (data || []).map((row) => ({ ...row, account_state: accountState(row) }));
  return NextResponse.json({ staff });
}

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const staffId = typeof body?.staffId === 'string' ? body.staffId.trim() : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 2000) : '';

  if (!staffId || action !== 'reissue_activation') {
    return NextResponse.json({ error: 'A valid staffId and reissue_activation action are required.' }, { status: 400 });
  }
  if (reason.length < 5) {
    return NextResponse.json({ error: 'A reason of at least 5 characters is required for activation recovery.' }, { status: 400 });
  }

  const client = db();
  const { data: staff, error } = await client.from('staff_profiles')
    .select('id,application_id,employee_number,laurem_id,full_name,email,employment_status,activated_at,activation_expires_at')
    .eq('id', staffId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Unable to load staff account.' }, { status: 500 });
  if (!staff) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  if (staff.employment_status !== 'pending' || staff.activated_at) {
    return NextResponse.json({ error: 'Only a pending, not-yet-activated staff account can receive an activation reissue.' }, { status: 409 });
  }
  if (!staff.application_id) return NextResponse.json({ error: 'This staff record is not linked to a recruitment application.' }, { status: 409 });

  try {
    const portal = await provisionLauremStaffPortal(staff.application_id, session.email);
    await recordLauremAuditEvent({
      lifecycleArea: 'staff_account',
      entityType: 'staff_profile',
      entityId: staff.id,
      staffId: staff.id,
      applicationId: staff.application_id,
      actorType: 'admin',
      actor: session.email,
      action: 'activation_reissued',
      reason,
      metadata: { deliveryStatus: portal.activation.status, replacementDeliveryId: portal.activation.deliveryId },
    });

    return NextResponse.json({
      ok: true,
      staff: {
        id: staff.id,
        employee_number: portal.staff.employee_number,
        laurem_id: portal.staff.laurem_id,
        full_name: portal.staff.full_name,
        email: portal.staff.email,
      },
      activation: {
        status: portal.activation.status,
        deliveryId: portal.activation.deliveryId,
        expiresAt: portal.expiresAt,
      },
    });
  } catch (caught) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'admin.staff.activation_recovery_failed',
      actor: session.email,
      staffId,
      reason: caught instanceof Error ? caught.message : String(caught),
    }));
    return NextResponse.json({ error: caught instanceof Error ? caught.message : 'Unable to reissue the activation link.' }, { status: 409 });
  }
}
