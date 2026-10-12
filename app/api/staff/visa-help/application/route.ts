import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

const STAFF_TRACKING_FIELDS = [
  'id','visa_help_case_id','staff_id',
  'cos_status','cos_reference','cos_requested_at','cos_issued_at',
  'application_status','application_reference','application_submitted_at',
  'identity_status','identity_method','identity_appointment_at','identity_completed_at',
  'decision_status','decision_reference','decision_date',
  'right_to_work_status','right_to_work_checked_at',
  'created_at','updated_at',
].join(',');

export async function GET(){
  const session=await getStaffSession();
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  try{
    const client=db();
    const {data:caseRow,error:caseError}=await client.from('laurem_staff_visa_help_cases')
      .select('id,staff_id,status,selected_route,confirmed_route,target_role,submitted_at')
      .eq('staff_id',session.staff_id)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(caseError && caseError.code!=='PGRST116')throw caseError;
    if(!caseRow)return NextResponse.json({tracking:null,case:null});
    const {data:tracking,error:trackingError}=await client.from('laurem_staff_visa_help_application_tracking')
      .select(STAFF_TRACKING_FIELDS)
      .eq('visa_help_case_id',caseRow.id)
      .maybeSingle();
    if(trackingError)throw trackingError;
    if(tracking)return NextResponse.json({tracking,case:caseRow});
    const {data:created,error:createError}=await client.from('laurem_staff_visa_help_application_tracking')
      .insert({visa_help_case_id:caseRow.id,staff_id:session.staff_id})
      .select(STAFF_TRACKING_FIELDS)
      .single();
    if(createError)throw createError;
    return NextResponse.json({tracking:created,case:caseRow});
  }catch(error){
    console.error(JSON.stringify({level:'error',event:'staff.visa_help.application_load_failed',staffId:session.staff_id,reason:error instanceof Error?error.message:String(error)}));
    return NextResponse.json({error:'Unable to load application tracking.'},{status:500});
  }
}
