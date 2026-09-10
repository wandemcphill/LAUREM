import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    try { return JSON.stringify(error); } catch { return 'unserializable_error'; }
  }
  return String(error);
}

async function checked<T extends { data: any; error: any }>(label: string, query: PromiseLike<T>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${describeError(result.error)}`);
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });

  try {
    const client = db();
    const applicationResult = await checked(
      'application',
      client.from('recruitment_applications').select('*').eq('id', id).maybeSingle(),
    );
    const application = applicationResult.data;
    if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });

    const inviteResult = application.invite_id
      ? await checked(
          'invite',
          client.from('recruitment_invites').select('id,candidate_name,candidate_email,role,expires_at,used_at,created_at').eq('id', application.invite_id).maybeSingle(),
        )
      : { data: null };

    const [interviewResult, secondResult, assessmentResult, nurseResult, documentRequestResult, documentResult, evidenceResult, readinessResult, contractResult, statusHistoryResult, adminActionResult, staffResult] = await Promise.all([
      checked('interviews', client.from('recruitment_interviews').select('id,scheduled_at,duration_minutes,location,meeting_link,interviewer,candidate_instructions,status,reschedule_count,cancelled_at,cancellation_reason,created_at,updated_at').eq('application_id', id).order('scheduled_at', { ascending: false }).limit(20)),
      checked('second_interviews', client.from('recruitment_second_interviews').select('id,status,answers,sent_by,sent_at,completed_at,expires_at,created_at').eq('application_id', id).order('created_at', { ascending: false }).limit(20)),
      checked('assessments', client.from('interview_attempts').select('id,round,role,pathway,question_ids,status,score,total_questions,pass_percent,percent,second_interview_id,started_at,submitted_at,created_at,updated_at').eq('application_id', id).order('round', { ascending: true })),
      checked('nurse_interview', client.from('recruitment_nurse_interview_responses').select('id,invite_id,application_id,pathway,answers,created_at').eq('application_id', id).maybeSingle()),
      checked('document_requests', client.from('recruitment_document_requests').select('id,document_type,description,required,status,requested_by,requested_at,reviewed_by,reviewed_at,review_note,required_for_readiness,readiness_item_key,expires_at,created_at').eq('application_id', id).order('created_at', { ascending: false })),
      checked('documents', client.from('recruitment_documents').select('id,application_id,document_request_id,document_type,original_filename,mime_type,file_size_bytes,status,uploaded_by,uploaded_at,reviewed_by,reviewed_at,review_note,superseded_at,superseded_by,checksum_sha256').eq('application_id', id).order('uploaded_at', { ascending: false })),
      checked('evidence_reviews', client.from('recruitment_evidence_reviews').select('id,evidence_type,document_id,status,reviewed_by,reviewed_at,review_note,metadata,created_at,updated_at').eq('application_id', id).order('created_at', { ascending: false }).limit(100)),
      checked('readiness', client.from('recruitment_onboarding_checklist').select('id,item_key,title,description,required,status,completed_at,completed_by,notes,created_at,updated_at').eq('application_id', id).order('created_at', { ascending: true })),
      checked('contracts', client.from('recruitment_contracts').select('id,application_id,version,job_title,start_date,contract_end_date,minimum_weekly_hours,hourly_rate,work_locations,client_or_assignment_details,notice_period_employee,notice_period_employer,holiday_entitlement,pension_scheme,status,issued_at,viewed_at,accepted_at,accepted_by_name,declined_at,decline_reason,created_by,contract_type,annual_salary,weekly_hours,visa_route,sponsorship_occupation_code,nmc_status,registration_deadline,pre_registration_salary,post_registration_salary,relocation_support,repayable_costs,repayment_schedule,contract_source,created_at,updated_at').eq('application_id', id).order('version', { ascending: false })),
      checked('status_history', client.from('recruitment_status_history').select('id,from_status,to_status,changed_by,note,created_at').eq('application_id', id).order('created_at', { ascending: false }).limit(100)),
      checked('admin_actions', client.from('recruitment_admin_actions').select('id,actor,action_type,from_status,to_status,outcome,reason,metadata,created_at').eq('application_id', id).order('created_at', { ascending: false }).limit(100)),
      checked('staff', client.from('staff_profiles').select('*').eq('application_id', id).maybeSingle()),
    ]);

    let audit: any[] = [];
    if (staffResult.data?.id) {
      const staffAudit = await checked(
        'workforce_audit',
        client.from('workforce_audit_events').select('id,staff_id,assignment_id,entity_type,entity_id,event_type,actor,details,created_at').eq('staff_id', staffResult.data.id).order('created_at', { ascending: false }).limit(100),
      );
      audit = staffAudit.data || [];
    }

    return NextResponse.json({
      application,
      invite: inviteResult.data,
      interviews: interviewResult.data || [],
      secondInterviews: secondResult.data || [],
      assessments: assessmentResult.data || [],
      nurseInterview: nurseResult.data,
      documentRequests: documentRequestResult.data || [],
      documents: documentResult.data || [],
      evidenceReviews: evidenceResult.data || [],
      readiness: readinessResult.data || [],
      contracts: contractResult.data || [],
      statusHistory: statusHistoryResult.data || [],
      adminActions: adminActionResult.data || [],
      staff: staffResult.data,
      audit,
      recruiter: session.email,
    });
  } catch (error) {
    const reason = describeError(error);
    console.error(JSON.stringify({ level: 'error', event: 'admin.application.detail_failed', actor: session.email, applicationId: id, reason }));
    return NextResponse.json({ error: 'Unable to load candidate record.' }, { status: 500 });
  }
}
