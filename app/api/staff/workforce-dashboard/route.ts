import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';
import { participantConversationIds } from '@/lib/laurem-messaging';
import { buildStaffOperationalSnapshot } from '@/lib/laurem-workforce-integrity';
import { buildWorkforceReadiness } from '@/lib/laurem-workforce-readiness';

function countByStatus(rows: Array<{ status: string | null }>, status: string) {
  return rows.filter((row) => row.status === status).length;
}

export async function GET(request: NextRequest) {
  const session = await getStaffSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const client = db();
    const now = new Date();
    const londonToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);

    const [
      staffResult,
      assignmentsResult,
      timesheetsResult,
      leaveResult,
      onboardingPackageResult,
      notificationsResult,
      documentsResult,
      availabilityResult,
      payrollResult,
    ] = await Promise.all([
      client.from('staff_profiles')
        .select('id,laurem_id,employee_number,full_name,email,phone,job_title,employment_status,start_date,location,portal_handle,portal_address,address_line_1,city,postcode,country,profile_photo_path,profile_photo_updated_at')
        .eq('id', session.staff_id)
        .maybeSingle(),
      client.from('staff_assignments')
        .select('id,client_name,location,scheduled_start,scheduled_end,status,notes')
        .eq('staff_id', session.staff_id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_end', now.toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(20),
      client.from('staff_timesheets')
        .select('id,assignment_id,work_date,clock_in,clock_out,total_hours,status,notes')
        .eq('staff_id', session.staff_id)
        .order('work_date', { ascending: false })
        .limit(100),
      client.from('staff_leave_requests')
        .select('id,leave_type,start_date,end_date,total_days,reason,status,review_note,created_at')
        .eq('staff_id', session.staff_id)
        .order('start_date', { ascending: false })
        .limit(50),
      client.from('staff_onboarding_packages')
        .select('id,title,status,updated_at')
        .eq('staff_id', session.staff_id)
        .maybeSingle(),
      client.from('staff_notifications')
        .select('id,title,body,read_at,action_url,created_at')
        .eq('staff_id', session.staff_id)
        .order('created_at', { ascending: false })
        .limit(8),
      client.from('staff_documents')
        .select('id,title,signature_status,category,issued_at')
        .eq('staff_id', session.staff_id)
        .eq('status', 'issued')
        .order('issued_at', { ascending: false })
        .limit(20),
      client.from('staff_availability')
        .select('id,effective_from,full_time,part_time,days,nights,weekends,notes')
        .eq('staff_id', session.staff_id)
        .lte('effective_from', londonToday)
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client.from('payroll_entries')
        .select('id,payroll_period_id,approved_hours,hourly_rate,gross_amount,status,notes,created_at,updated_at,payroll_periods(period_start,period_end,pay_date,status)')
        .eq('staff_id', session.staff_id)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    const failed = [
      staffResult,
      assignmentsResult,
      timesheetsResult,
      leaveResult,
      onboardingPackageResult,
      notificationsResult,
      documentsResult,
      availabilityResult,
      payrollResult,
    ].find((result) => result.error);

    if (failed?.error || !staffResult.data) {
      return NextResponse.json({ error: 'Unable to load the staff workforce hub.' }, { status: 500 });
    }

    const staff = staffResult.data;
    const assignments = assignmentsResult.data || [];
    const timesheets = timesheetsResult.data || [];
    const leave = leaveResult.data || [];
    const payrollEntries = payrollResult.data || [];

    let onboarding: { package: Record<string, unknown>; tasks: unknown[] } | null = null;
    if (onboardingPackageResult.data) {
      const { data: tasks, error: taskError } = await client
        .from('staff_onboarding_tasks')
        .select('id,title,required,status,acknowledgement_required,acknowledged_at')
        .eq('package_id', onboardingPackageResult.data.id)
        .order('sort_order', { ascending: true });
      if (taskError) return NextResponse.json({ error: 'Unable to load onboarding tasks.' }, { status: 500 });
      onboarding = { package: onboardingPackageResult.data, tasks: tasks || [] };
    }

    const openAttendance = timesheets.filter((row: any) => row.clock_in && !row.clock_out);
    const scheduledIds = assignments.map((row: any) => row.id);
    let overdueAttendance = 0;
    if (openAttendance.length) {
      const openAssignmentIds = [...new Set(openAttendance.map((row: any) => row.assignment_id).filter(Boolean))];
      if (openAssignmentIds.length) {
        const { data: openAssignments, error: openAssignmentError } = await client
          .from('staff_assignments')
          .select('id,scheduled_end')
          .eq('staff_id', session.staff_id)
          .in('id', openAssignmentIds);
        if (openAssignmentError) return NextResponse.json({ error: 'Unable to validate attendance state.' }, { status: 500 });
        overdueAttendance = (openAssignments || []).filter((row: any) => new Date(row.scheduled_end).getTime() < now.getTime()).length;
      }
    }

    const latestPayrollEntry = payrollEntries[0] || null;
    const payrollMissingRate = latestPayrollEntry && (latestPayrollEntry.hourly_rate == null || latestPayrollEntry.gross_amount == null) ? 1 : 0;
    const payrollDraft = latestPayrollEntry?.status === 'draft' ? 1 : 0;

    const readiness = buildWorkforceReadiness({
      active: staff.employment_status === 'active',
      scheduledAssignments: assignments.length,
      openAttendance: openAttendance.length,
      overdueAttendance,
      submittedTimesheets: countByStatus(timesheets, 'submitted'),
      rejectedTimesheets: countByStatus(timesheets, 'rejected'),
      pendingLeave: countByStatus(leave, 'pending'),
      payrollEntryMissingRate: payrollMissingRate,
      payrollEntryDraft: payrollDraft,
    });

    const operationalState = buildStaffOperationalSnapshot({
      employmentStatus: staff.employment_status,
      assignments: assignmentsResult.data || [],
      timesheets,
      leaveRequests: leave,
      payrollEntries: payrollEntries.map((entry: any) => ({
        id: entry.id,
        status: entry.status,
      })),
      now,
    });

    const conversationIds = await participantConversationIds(client, session.staff_id);
    let messages: any[] = [];
    if (conversationIds.length) {
      const { data: conversations, error: conversationError } = await client
        .from('staff_message_conversations')
        .select('id,updated_at,last_message_at')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(6);
      if (conversationError) return NextResponse.json({ error: 'Unable to load staff messages.' }, { status: 500 });

      for (const conversation of conversations || []) {
        const [{ data: latest }, { data: participants }] = await Promise.all([
          client.from('staff_messages')
            .select('body,sender_staff_id,sender_admin_email,created_at')
            .eq('conversation_id', conversation.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          client.from('staff_message_participants')
            .select('staff_id,last_read_at')
            .eq('conversation_id', conversation.id),
        ]);
        const otherId = (participants || []).map((row: any) => row.staff_id).find((id: string) => id !== session.staff_id) || null;
        const { data: other } = otherId
          ? await client.from('staff_profiles').select('id,full_name,job_title').eq('id', otherId).maybeSingle()
          : { data: null };
        const ownParticipant = (participants || []).find((row: any) => row.staff_id === session.staff_id);
        messages.push({
          ...conversation,
          other: other ? { name: other.full_name, jobTitle: other.job_title } : { name: 'LAUREM Admin / HR', jobTitle: 'Recruitment & Staff Support' },
          latest,
          unread: Boolean(latest && latest.sender_staff_id !== session.staff_id && (!ownParticipant?.last_read_at || new Date(latest.created_at).getTime() > new Date(ownParticipant.last_read_at).getTime())),
        });
      }
    }

    const unreadNotifications = (notificationsResult.data || []).filter((notification: any) => !notification.read_at).length;
    const signaturePending = (documentsResult.data || []).filter((document: any) => document.signature_status === 'pending').length;
    const requiredTasks = ((onboarding?.tasks || []) as any[]).filter((task) => task.required);
    const completedRequired = requiredTasks.filter((task) => ['completed', 'waived'].includes(task.status) && (!task.acknowledgement_required || Boolean(task.acknowledged_at))).length;
    const onboardingProgress = requiredTasks.length ? Math.round((completedRequired / requiredTasks.length) * 100) : onboarding ? 100 : 0;

    const profileFields = [staff.phone, staff.address_line_1, staff.city, staff.postcode, staff.country, staff.profile_photo_path];
    const profileCompleteness = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100);

    const currentPayroll = latestPayrollEntry
      ? {
          id: latestPayrollEntry.id,
          status: latestPayrollEntry.status,
          approvedHours: latestPayrollEntry.approved_hours,
          hourlyRate: latestPayrollEntry.hourly_rate,
          grossAmount: latestPayrollEntry.gross_amount,
          period: latestPayrollEntry.payroll_periods || null,
        }
      : null;

    return NextResponse.json({
      staff: {
        ...staff,
        profile_photo_url: staff.profile_photo_path
          ? `/api/staff/me/photo?v=${encodeURIComponent(String(staff.profile_photo_updated_at || 'current'))}`
          : null,
      },
      shifts: assignments,
      timesheets,
      leave,
      messages,
      onboarding,
      notifications: notificationsResult.data || [],
      documents: documentsResult.data || [],
      availability: availabilityResult.data || null,
      payroll: {
        entries: payrollEntries,
        current: currentPayroll,
      },
      readiness,
      operationalState,
      summary: {
        upcomingShifts: assignments.length,
        submittedTimesheets: countByStatus(timesheets, 'submitted'),
        rejectedTimesheets: countByStatus(timesheets, 'rejected'),
        approvedHours: timesheets.filter((row: any) => ['approved', 'paid'].includes(row.status)).reduce((sum: number, row: any) => sum + (Number(row.total_hours) || 0), 0),
        pendingLeave: countByStatus(leave, 'pending'),
        unreadMessages: messages.filter((message) => message.unread).length,
        unreadNotifications,
        signaturePending,
        profileCompleteness,
        onboardingProgress,
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'staff.workforce_dashboard.load_failed',
      staffId: session.staff_id,
      reason: error instanceof Error ? error.message : String(error),
    }));
    return NextResponse.json({ error: 'Unable to load the staff workforce hub.' }, { status: 500 });
  }
}
