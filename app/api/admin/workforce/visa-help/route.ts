import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(request:NextRequest){
 const session=readAdminSession(request);
 if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
 try{
  const client=db();
  const {data:cases,error}=await client.from('laurem_staff_visa_help_cases')
   .select('id,staff_id,application_id,status,current_visa_type,current_visa_start_date,current_visa_end_date,living_in_uk,target_role,target_work_location,selected_route,recommendation,answers,dependants,document_checklist,legal_team_requested,self_complete_selected,consent_to_legal_support,assigned_to,staff_message,legal_notes,submitted_at,reviewed_at,created_at,updated_at')
   .not('status','in','(closed,submitted)')
   .order('updated_at',{ascending:false})
   .limit(200);
  if(error)throw error;
  const rows=cases||[];
  const staffIds=[...new Set(rows.map((x:any)=>x.staff_id))];
  const {data:staff,error:staffError}=staffIds.length?await client.from('laurem_staff_profiles').select('id,laurem_id,employee_number,full_name,email,job_title,employment_status,location,start_date').in('id',staffIds):{data:[],error:null};
  if(staffError)throw staffError;
  const caseIds=rows.map((x:any)=>x.id);
  const {data:documents,error:docError}=caseIds.length?await client.from('laurem_staff_documents').select('id,staff_id,title,original_filename,issued_at').eq('category','visa_help').eq('status','issued').in('staff_id',staffIds).order('issued_at',{ascending:false}):{data:[],error:null};
  if(docError)throw docError;
  return NextResponse.json({cases:rows.map((row:any)=>({...row,staff:(staff||[]).find((s:any)=>s.id===row.staff_id)||null,documents:(documents||[]).filter((d:any)=>d.staff_id===row.staff_id)})),counts:{
   open:rows.length,
   legal:rows.filter((x:any)=>x.legal_team_requested).length,
   awaitingDocuments:rows.filter((x:any)=>x.status==='awaiting_documents').length,
   ready:rows.filter((x:any)=>x.status==='ready_for_submission').length,
  }});
 }catch(error){
  console.error(JSON.stringify({level:'error',event:'admin.visa_help.load_failed',reason:error instanceof Error?error.message:String(error)}));
  return NextResponse.json({error:'Unable to load Visa Help queue.'},{status:500});
 }
}

export async function PATCH(request:NextRequest){
 const session=readAdminSession(request);
 if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
 const body=await request.json().catch(()=>null) as Record<string,any>|null;
 const caseId=typeof body?.caseId==='string'?body.caseId:'';
 const status=typeof body?.status==='string'?body.status:'';
 const legalNotes=typeof body?.legalNotes==='string'?body.legalNotes.trim().slice(0,5000):null;
 const assignedTo=typeof body?.assignedTo==='string'?body.assignedTo.trim().slice(0,240):null;
 const allowed=new Set(['draft','triaged','awaiting_staff','legal_review','awaiting_documents','ready_for_submission','submitted','closed']);
 if(!caseId)return NextResponse.json({error:'Case id is required.'},{status:400});
 if(status&&!allowed.has(status))return NextResponse.json({error:'Invalid Visa Help status.'},{status:400});
 try{
  const client=db();
  const {data:existing,error:loadError}=await client.from('laurem_staff_visa_help_cases').select('id,staff_id,status').eq('id',caseId).maybeSingle();
  if(loadError)throw loadError;
  if(!existing)return NextResponse.json({error:'Visa Help case not found.'},{status:404});
  const patch:any={updated_at:new Date().toISOString()};
  if(status)patch.status=status;
  if(legalNotes!==null)patch.legal_notes=legalNotes;
  if(assignedTo!==null)patch.assigned_to=assignedTo;
  if(['legal_review','awaiting_documents','ready_for_submission'].includes(status))patch.reviewed_at=new Date().toISOString();
  if(status==='submitted')patch.submitted_at=new Date().toISOString();
  const {data,error}=await client.from('laurem_staff_visa_help_cases').update(patch).eq('id',caseId).select('*').single();
  if(error)throw error;
  await client.from('laurem_staff_visa_help_events').insert({
   visa_help_case_id:caseId,staff_id:existing.staff_id,event_type:'admin_case_update',actor_type:'admin',actor:session.email,
   metadata:{from:existing.status,to:status||existing.status,assignedTo,hasNotes:Boolean(legalNotes)}
  });
  return NextResponse.json({case:data});
 }catch(error){
  console.error(JSON.stringify({level:'error',event:'admin.visa_help.update_failed',caseId,reason:error instanceof Error?error.message:String(error)}));
  return NextResponse.json({error:'Unable to update Visa Help case.'},{status:500});
 }
}
