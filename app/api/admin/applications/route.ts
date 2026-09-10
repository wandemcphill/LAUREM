import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendLauremEmail } from '@/lib/laurem-email';
import { lauremCompany } from '@/lib/laurem-company-config';

const allowedStatus = new Set(['Enquiry','Invited','Application','Screening','Interview','Second Interview','Documents','Sponsorship','Offer','Onboarding','Hired','Rejected','Withdrawn']);
function adminOrUnauthorized(request:NextRequest){return readAdminSession(request);}
function escapeHtml(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

export async function GET(request:NextRequest){
  const session=adminOrUnauthorized(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  try{
    const {data,error}=await db().from('recruitment_applications').select('id,full_name,preferred_name,email,phone,nationality,country_of_residence,role_applied,employment_type,start_date,living_in_uk,current_country,requires_sponsorship,status,created_at,updated_at').order('created_at',{ascending:false}).limit(250);
    if(error)throw error;
    return NextResponse.json({applications:data||[],recruiter:session.email});
  }catch(error){console.error(JSON.stringify({level:'error',event:'admin.applications.list_failed',reason:error instanceof Error?error.message:'unknown'}));return NextResponse.json({error:'Unable to load applications.'},{status:500});}
}

export async function PATCH(request:NextRequest){
  const session=adminOrUnauthorized(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return NextResponse.json({error:'Application id is required.'},{status:400});
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>32000)return NextResponse.json({error:'Request payload is too large.'},{status:413});
  let body:{status?:string;note?:string;override?:boolean;overrideReason?:string};
  try{body=JSON.parse(raw) as typeof body;}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  const status=body.status?.trim()||'';const note=typeof body.note==='string'?body.note.trim():null;const override=body.override===true;const overrideReason=typeof body.overrideReason==='string'?body.overrideReason.trim():null;
  if(!allowedStatus.has(status))return NextResponse.json({error:'Invalid recruitment status.'},{status:400});
  if(override&&!overrideReason)return NextResponse.json({error:'An override reason is required.'},{status:400});
  try{
    const client=db();
    const {data:current,error:currentError}=await client.from('recruitment_applications').select('id,full_name,email,status,role_applied').eq('id',id).maybeSingle();
    if(currentError)throw currentError;
    if(!current)return NextResponse.json({error:'Application not found.'},{status:404});
    if(current.status===status&&!note&&!override)return NextResponse.json({application:current,overridden:false,statusEmail:{status:'skipped',reason:'unchanged'}});
    const {data,error}=await client.rpc('laurem_transition_application_status',{p_application_id:id,p_to_status:status,p_actor:session.email,p_note:note,p_override:override,p_override_reason:overrideReason});
    if(error||!data){const message=error?.message||'';if(message.includes('APPLICATION_NOT_FOUND'))return NextResponse.json({error:'Application not found.'},{status:404});if(message.includes('STATUS_TRANSITION_BLOCKED'))return NextResponse.json({error:error?.details||'The requested transition is blocked by the current lifecycle controls.'},{status:409});if(message.includes('OVERRIDE_REASON_REQUIRED'))return NextResponse.json({error:'An override reason is required.'},{status:400});if(message.includes('INVALID_RECRUITMENT_STATUS'))return NextResponse.json({error:'Invalid recruitment status.'},{status:400});return NextResponse.json({error:'Unable to update application status.'},{status:500});}
    const safeName=escapeHtml(current.full_name);const safeRole=escapeHtml(current.role_applied||'your application');const safeStatus=escapeHtml(status);const transitionKey=typeof data?.updated_at==='string'?data.updated_at:new Date().toISOString();
    const email=await sendLauremEmail(client,{eventType:'application_status_change',entityId:id,idempotencyKey:`application-status:${id}:${status}:${transitionKey}`,payload:{from:lauremCompany.candidateCommunications.senderAddress,to:[current.email],reply_to:lauremCompany.candidateCommunications.replyToAddress,subject:`Recruitment update from ${lauremCompany.tradingName}`,text:`Dear ${current.full_name},\n\nYour recruitment application for ${current.role_applied||'the position'} has been updated to: ${status}.\n\nKind regards,\n${lauremCompany.tradingName} Recruitment`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">${escapeHtml(lauremCompany.tradingName.toUpperCase())} RECRUITMENT</p><h1 style="font-size:28px">Recruitment status update</h1><p>Dear ${safeName},</p><p>Your application for <strong>${safeRole}</strong> has been updated.</p><p style="font-size:18px"><strong>Current status:</strong> ${safeStatus}</p><p>If you have been asked to take an action, please use the private link previously provided to you.</p><p>Kind regards,<br>${escapeHtml(lauremCompany.tradingName)} Recruitment</p></div>`}});
    console.info(JSON.stringify({level:'info',event:'admin.application.status_changed',actor:session.email,applicationId:id,fromStatus:current.status,status,override}));
    return NextResponse.json({application:data,overridden:override,statusEmail:{status:email.status,attempts:email.attempts,providerId:'providerId' in email?email.providerId:null,deliveryId:email.deliveryId,...(email.status==='failed'?{error:email.error}:{}),...(email.status==='not_configured'?{reason:'not_configured'}:{})}});
  }catch(error){console.error(JSON.stringify({level:'error',event:'admin.application.status_change_failed',actor:session.email,reason:error instanceof Error?error.message:'unknown'}));return NextResponse.json({error:'Unable to update application status.'},{status:500});}
}
