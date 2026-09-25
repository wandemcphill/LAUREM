import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { recordHrPrivilegedAction } from '@/lib/laurem-hr-workforce';
import { createLauremStaffNotification } from '@/lib/laurem-staff-notifications';

export async function POST(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { staffId } = await params;
  if (!staffId) return NextResponse.json({ error: 'Staff id is required.' }, { status: 400 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof body?.action === 'string' ? body.action : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 2000) : '';

  if (!action) return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });

  const client = db();
  const { data: staff, error: staffError } = await client.from('staff_profiles')
    .select('id, application_id, full_name, email, employment_status, manager_id, location, job_title, start_date, end_date')
    .eq('id', staffId)
    .maybeSingle();

  if (staffError) return NextResponse.json({ error: 'Unable to load staff member.' }, { status: 500 });
  if (!staff) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });

  const now = new Date().toISOString();

  if (action === 'update_details' || action === 'change_manager' || action === 'change_location') {
    const patch: Record<string, unknown> = { updated_at: now };

    if (body?.jobTitle && typeof body.jobTitle === 'string') patch.job_title = body.jobTitle.trim();
    if (body?.location !== undefined) patch.location = typeof body.location === 'string' ? body.location.trim() || null : null;
    if (body?.managerId !== undefined) patch.manager_id = typeof body.managerId === 'string' ? body.managerId.trim() || null : null;
    if (body?.startDate && typeof body.startDate === 'string') patch.start_date = body.startDate.trim();
    if (body?.endDate !== undefined) patch.end_date = typeof body.endDate === 'string' ? body.endDate.trim() || null : null;

    const { data: updated, error: updateError } = await client.from('staff_profiles')
      .update(patch)
      .eq('id', staffId)
      .select('id, employee_number, full_name, job_title, location, manager_id, start_date, end_date, updated_at')
      .single();

    if (updateError) return NextResponse.json({ error: 'Failed to update staff details.' }, { status: 500 });

    await recordHrPrivilegedAction({
      staffId,
      action: `hr.${action}`,
      actor: session.email,
      previousState: { job_title: staff.job_title, location: staff.location, manager_id: staff.manager_id },
      newState: updated,
      reason,
      applicationId: staff.application_id,
    });

    return NextResponse.json({ success: true, staff: updated });
  }

  if (action === 'update_compliance') {
    const patch: Record<string, unknown> = { updated_at: now };

    if (typeof body?.rightToWorkVerified === 'boolean') patch.right_to_work_verified = body.rightToWorkVerified;
    if (body?.rightToWorkExpiryDate !== undefined) patch.right_to_work_expiry_date = typeof body.rightToWorkExpiryDate === 'string' ? body.rightToWorkExpiryDate.trim() || null : null;
    if (body?.rightToWorkNotes !== undefined) patch.right_to_work_notes = typeof body.rightToWorkNotes === 'string' ? body.rightToWorkNotes.trim() || null : null;

    if (typeof body?.dbsVerified === 'boolean') patch.dbs_verified = body.dbsVerified;
    if (body?.dbsPvgStatus !== undefined) patch.dbs_pvg_status = typeof body.dbsPvgStatus === 'string' ? body.dbsPvgStatus.trim() || null : null;
    if (body?.dbsPvgCheckDate !== undefined) patch.dbs_pvg_check_date = typeof body.dbsPvgCheckDate === 'string' ? body.dbsPvgCheckDate.trim() || null : null;
    if (body?.dbsPvgExpiryDate !== undefined) patch.dbs_pvg_expiry_date = typeof body.dbsPvgExpiryDate === 'string' ? body.dbsPvgExpiryDate.trim() || null : null;

    if (body?.nmcNumber !== undefined) patch.nmc_number = typeof body.nmcNumber === 'string' ? body.nmcNumber.trim() || null : null;
    if (body?.nmcStatus !== undefined) patch.nmc_status = typeof body.nmcStatus === 'string' ? body.nmcStatus.trim() || null : null;
    if (body?.nmcExpiryDate !== undefined) patch.nmc_expiry_date = typeof body.nmcExpiryDate === 'string' ? body.nmcExpiryDate.trim() || null : null;

    const { data: updated, error: updateError } = await client.from('staff_profiles')
      .update(patch)
      .eq('id', staffId)
      .select('id, right_to_work_verified, right_to_work_expiry_date, dbs_verified, dbs_pvg_status, nmc_number, nmc_status, nmc_expiry_date, updated_at')
      .single();

    if (updateError) return NextResponse.json({ error: 'Failed to update compliance details.' }, { status: 500 });

    await recordHrPrivilegedAction({
      staffId,
      action: 'hr.update_compliance',
      actor: session.email,
      newState: updated,
      reason,
      applicationId: staff.application_id,
    });

    return NextResponse.json({ success: true, compliance: updated });
  }

  if (action === 'update_emergency_contact') {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const relationship = typeof body?.relationship === 'string' ? body.relationship.trim() : '';

    const { data: updated, error: updateError } = await client.from('staff_profiles')
      .update({
        emergency_contact_name: name || null,
        emergency_contact_phone: phone || null,
        emergency_contact_relationship: relationship || null,
        updated_at: now,
      })
      .eq('id', staffId)
      .select('id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
      .single();

    if (updateError) return NextResponse.json({ error: 'Failed to update emergency contact details.' }, { status: 500 });

    await recordHrPrivilegedAction({
      staffId,
      action: 'hr.update_emergency_contact',
      actor: session.email,
      newState: updated,
      reason,
      applicationId: staff.application_id,
    });

    return NextResponse.json({ success: true, emergencyContact: updated });
  }

  if (action === 'issue_document') {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const category = typeof body?.category === 'string' ? body.category.trim() : 'compliance';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const contentText = typeof body?.contentText === 'string' ? body.contentText.trim() : '';
    const requiresSignature = Boolean(body?.requiresSignature);

    if (!title || !contentText) {
      return NextResponse.json({ error: 'Document title and content text are required.' }, { status: 400 });
    }

    const textBuffer = new TextEncoder().encode(contentText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const documentSha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const { data: doc, error: docError } = await client.from('staff_documents').insert({
      staff_id: staffId,
      category,
      title,
      description: description || null,
      mime_type: 'text/plain',
      content_text: contentText,
      document_sha256: documentSha256,
      source_type: 'manual',
      source_key: `manual_${Date.now()}`,
      status: 'issued',
      requires_signature: requiresSignature,
      signature_status: requiresSignature ? 'pending' : 'not_required',
      issued_by_actor: session.email,
      issuer_name: session.email,
      issuer_title: 'HR Administrator',
      employer_name: 'Laurem Care Group Limited',
      issued_at: now,
    }).select('*').single();

    if (docError) return NextResponse.json({ error: 'Failed to issue workforce document.' }, { status: 500 });

    await client.from('staff_document_events').insert({
      document_id: doc.id,
      staff_id: staffId,
      event_type: 'issued',
      actor_type: 'admin',
      actor: session.email,
      metadata: { title, category, requiresSignature },
    });

    await createLauremStaffNotification(client, {
      staffId,
      category: 'documents',
      title: `New document issued: ${title}`,
      body: requiresSignature ? 'A new workforce document requires your electronic signature.' : 'A new official document has been added to your profile.',
      actionUrl: `/staff/documents/${doc.id}`,
    });

    await recordHrPrivilegedAction({
      staffId,
      action: 'hr.issue_document',
      actor: session.email,
      newState: { document_id: doc.id, title, category },
      reason,
      applicationId: staff.application_id,
    });

    return NextResponse.json({ success: true, document: doc });
  }

  if (action === 'request_evidence') {
    const evidenceType = typeof body?.evidenceType === 'string' ? body.evidenceType.trim() : 'Compliance Update';
    const noteText = typeof body?.note === 'string' ? body.note.trim() : 'Please submit updated compliance evidence.';

    await createLauremStaffNotification(client, {
      staffId,
      category: 'compliance',
      title: `Evidence requested: ${evidenceType}`,
      body: noteText,
      actionUrl: '/staff/profile',
    });

    await recordHrPrivilegedAction({
      staffId,
      action: 'hr.request_evidence',
      actor: session.email,
      metadata: { evidenceType, noteText },
      reason,
      applicationId: staff.application_id,
    });

    return NextResponse.json({ success: true, message: 'Evidence request issued to staff member.' });
  }

  return NextResponse.json({ error: `Unsupported HR action: ${action}` }, { status: 400 });
}
