import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';
import { createLauremStaffNotification } from '@/lib/laurem-staff-notifications';
import {
  cleanTrackingChanges,
  deriveVisaHelpApplicationMilestones,
  validateVisaHelpApplicationTrackingPatch,
} from '@/lib/laurem-visa-help-application';

const TRACKING_FIELDS = [
  'id','visa_help_case_id','staff_id',
  'cos_status','cos_reference','cos_requested_at','cos_issued_at',
  'application_status','application_reference','application_submitted_at',
  'identity_status','identity_method','identity_appointment_at','identity_completed_at',
  'decision_status','decision_reference','decision_date','decision_notes',
  'right_to_work_status','right_to_work_checked_at','right_to_work_checked_by',
  'sponsor_notes','created_at','updated_at',
].join(',');

async function ensureTracking(client:any, caseId:string, staffId:string){
  const {data,error}=await client.from('laurem_staff_visa_help_application_tracking')
    .select(TRACKING_FIELDS)
    .eq('visa_help_case_id',caseId)
    .maybeSingle();
  if(error)throw error;
  if(data)return data;
  const {data:created,error:createError}=await client.from('laurem_staff_visa_help_application_tracking')
    .insert({visa_help_case_id:caseId,staff_id:staffId})
    .select(TRACKING_FIELDS)
    .single();
  if(createError)throw createError;
  return created;
}

export async function GET(request:NextRequest){
  const session=readAdminSession(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  const caseId=new URL(request.url).searchParams.get('caseId')||'';
  if(!caseId)return NextResponse.json({error:'Case id is required.'},{status:400});
  try{
    const client=db();
    const {data:caseRow,error:caseError}=await client.from('laurem_staff_visa_help_cases').select('id,staff_id,status,selected_route,confirmed_route,target_role,submitted_at').eq('id',caseId).maybeSingle();
    if(caseError)throw caseError;
    if(!caseRow)return NextResponse.json({error:'Visa Help case not found.'},{status:404});
    const tracking=await ensureTracking(client,caseRow.id,caseRow.staff_id);
    return NextResponse.json({tracking,case:caseRow});
  }catch(error){
    console.error(JSON.stringify({level:'error',event:'admin.visa_help.application_load_failed',caseId,reason:error instanceof Error?error.message:String(error)}));
    return NextResponse.json({error:'Unable to load application tracking.'},{status:500});
  }
}

export async function PATCH(request:NextRequest){
  const session=readAdminSession(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const caseId=typeof body?.caseId==='string'?body.caseId:'';
  if(!caseId)return NextResponse.json({error:'Case id is required.'},{status:400});
  const patch={...(body||{})};
  delete patch.caseId;
  const errors=validateVisaHelpApplicationTrackingPatch(patch);
  if(errors.length)return NextResponse.json({error:errors[0],errors},{status:422});
  const changes=cleanTrackingChanges(patch);
  if(!Object.keys(changes).length)return NextResponse.json({error:'No tracking fields were supplied.'},{status:400});

  try{
    const client=db();
    const {data:caseRow,error:caseError}=await client.from('laurem_staff_visa_help_cases').select('id,staff_id').eq('id',caseId).maybeSingle();
    if(caseError)throw caseError;
    if(!caseRow)return NextResponse.json({error:'Visa Help case not found.'},{status:404});

    const current=await ensureTracking(client,caseId,caseRow.staff_id);
    const {data:updated,error:updateError}=await client.from('laurem_staff_visa_help_application_tracking')
      .update({...changes,updated_at:new Date().toISOString()})
      .eq('id',current.id)
      .select(TRACKING_FIELDS)
      .single();
    if(updateError)throw updateError;

    const previous:any=current;
    const changedFields=Object.keys(changes).filter(key=>String(previous[key]??'')!==String((updated as any)[key]??''));
    const milestoneStatuses=deriveVisaHelpApplicationMilestones({
      cosStatus:updated.cos_status,
      applicationStatus:updated.application_status,
      identityStatus:updated.identity_status,
      decisionStatus:updated.decision_status,
      rightToWorkStatus:updated.right_to_work_status,
    });
    const milestoneUpdates = Object.entries(milestoneStatuses).map(([milestone_type,status]) =>
      client.from('laurem_staff_visa_help_milestones')
        .update({
          status,
          completed_at:status==='completed'?new Date().toISOString():null,
          completed_by:status==='completed'?session.email:null,
          updated_at:new Date().toISOString(),
        })
        .eq('visa_help_case_id',caseId)
        .eq('milestone_type',milestone_type)
    );
    await Promise.all(milestoneUpdates);

    await client.from('laurem_staff_visa_help_events').insert({
      visa_help_case_id:caseId,
      staff_id:caseRow.staff_id,
      event_type:'visa_application_tracking_updated',
      actor_type:'admin',
      actor:session.email,
      metadata:{changedFields,trackingId:updated.id},
    });

    const meaningful = changedFields.some(key=>key.endsWith('_status') || key.endsWith('_date') || key.endsWith('_at'));
    if(meaningful){
      await createLauremStaffNotification(client,{
        staffId:caseRow.staff_id,
        category:'compliance',
        title:'Visa application tracking updated',
        body:'LAUREM updated the sponsor-side application tracker. Open Visa Help to review the current application progress.',
        actionUrl:'/staff/visa-help',
      });
    }

    return NextResponse.json({tracking:updated});
  }catch(error){
    console.error(JSON.stringify({level:'error',event:'admin.visa_help.application_update_failed',caseId,reason:error instanceof Error?error.message:String(error)}));
    return NextResponse.json({error:'Unable to update application tracking.'},{status:500});
  }
}
