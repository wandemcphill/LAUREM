import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { sendLauremEmail } from '@/lib/laurem-email';
import { lauremCompany } from '@/lib/laurem-company-config';

const allowedStatus = new Set(['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-show']);

function adminOrUnauthorized(request: NextRequest) {
  return readAdminSession(request);
}

function escapeHtml(value: string) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });
}

async function sendInterviewEmail(input: { id:string; candidateName:string; candidateEmail:string; scheduledAt:string; durationMinutes:number; location:string; meetingLink:string|null; interviewer:string|null; candidateInstructions:string|null; event:'scheduled'|'rescheduled'|'cancelled' }) {
  const safeName=escapeHtml(input.candidateName);
  const safeDate=escapeHtml(formatDate(input.scheduledAt));
  const safeLocation=escapeHtml(input.location);
  const safeInterviewer=escapeHtml(input.interviewer||lauremCompany.tradingName);
  const safeMeeting=input.meetingLink?escapeHtml(input.meetingLink):'';
  const safeInstructions=escapeHtml(input.candidateInstructions||'');
  const subject=input.event==='scheduled'?`Interview scheduled with ${lauremCompany.tradingName}`:input.event==='rescheduled'?`Your interview has been rescheduled: ${lauremCompany.tradingName}`:`Interview update from ${lauremCompany.tradingName}`;
  const title=input.event==='scheduled'?'Your interview is scheduled':input.event==='rescheduled'?'Your interview has been rescheduled':'Your interview has been cancelled';
  const text=input.event==='cancelled'
    ?`Dear ${input.candidateName},\n\nYour interview with ${lauremCompany.tradingName} has been cancelled. Please contact ${lauremCompany.publicEmails.recruitment} if you need further information.\n\nKind regards,\n${lauremCompany.tradingName} Recruitment`
    :`Dear ${input.candidateName},\n\n${title}.\n\nDate and time: ${formatDate(input.scheduledAt)}\nDuration: ${input.durationMinutes} minutes\nLocation: ${input.location}\nInterviewer: ${input.interviewer||lauremCompany.tradingName}\n${input.meetingLink?`Meeting link: ${input.meetingLink}\n`:''}${input.candidateInstructions?`Instructions: ${input.candidateInstructions}\n`:''}\nKind regards,\n${lauremCompany.tradingName} Recruitment`;
  return sendLauremEmail(db(),{
    eventType:`interview_${input.event}`,
    entityId:input.id,
    idempotencyKey:`interview:${input.id}:${input.event}:${new Date(input.scheduledAt).toISOString()}`,
    payload:{from:lauremCompany.candidateCommunications.senderAddress,to:[input.candidateEmail],reply_to:lauremCompany.candidateCommunications.replyToAddress,subject,text,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">${escapeHtml(lauremCompany.tradingName.toUpperCase())} RECRUITMENT</p><h1 style="font-size:28px">${title}</h1><p>Dear ${safeName},</p>${input.event==='cancelled'?`<p>Your interview with ${escapeHtml(lauremCompany.tradingName)} has been cancelled. Please contact <a href="mailto:${escapeHtml(lauremCompany.publicEmails.recruitment)}">${escapeHtml(lauremCompany.publicEmails.recruitment)}</a> if you need further information.</p>`:`<p>Here are the interview details:</p><ul><li><strong>Date and time:</strong> ${safeDate}</li><li><strong>Duration:</strong> ${input.durationMinutes} minutes</li><li><strong>Location:</strong> ${safeLocation}</li><li><strong>Interviewer:</strong> ${safeInterviewer}</li></ul>${safeMeeting?`<p><a href="${safeMeeting}" style="display:inline-block;background:#173a31;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open meeting link</a></p>`:''}${safeInstructions?`<p><strong>Candidate instructions</strong><br>${safeInstructions.replaceAll('\n','<br>')}</p>`:''}`}<p>Kind regards,<br>${escapeHtml(lauremCompany.tradingName)} Recruitment</p></div>`}
  });
}

export async function POST(request: NextRequest) {
  const session = adminOrUnauthorized(request);
  if (!session) return NextResponse.json({ error:'Unauthorised' },{status:401});
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>32000)return NextResponse.json({error:'Request payload is too large.'},{status:413});
  const body=JSON.parse(raw) as Record<string,unknown>;
  const applicationId=typeof body.applicationId==='string'?body.applicationId:'';
  const scheduledAt=typeof body.scheduledAt==='string'?body.scheduledAt:'';
  const durationMinutes=Number(body.durationMinutes||60);
  if(!applicationId||!scheduledAt||!Number.isFinite(new Date(scheduledAt).getTime()))return NextResponse.json({error:'Application and valid interview date/time are required.'},{status:400});
  if(!Number.isInteger(durationMinutes)||durationMinutes<15||durationMinutes>240)return NextResponse.json({error:'Interview duration must be between 15 and 240 minutes.'},{status:400});
  try{
    const client=db();
    const {data:application,error:appError}=await client.from('recruitment_applications').select('id,full_name,email').eq('id',applicationId).maybeSingle();
    if(appError)throw appError;
    if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    const location=typeof body.location==='string'&&body.location.trim()?body.location.trim():'Online';
    const interviewer=typeof body.interviewer==='string'&&body.interviewer.trim()?body.interviewer.trim():session.email;
    const candidateInstructions=typeof body.candidateInstructions==='string'?body.candidateInstructions.trim().slice(0,4000):null;
    const meetingLink=typeof body.meetingLink==='string'&&body.meetingLink.trim()?body.meetingLink.trim():null;
    const {data,error}=await client.from('recruitment_interviews').insert({application_id:applicationId,scheduled_at:new Date(scheduledAt).toISOString(),duration_minutes:durationMinutes,location,meeting_link:meetingLink,interviewer,candidate_instructions:candidateInstructions,status:'Scheduled'}).select('*').single();
    if(error)throw error;
    const email=await sendInterviewEmail({id:data.id,candidateName:application.full_name,candidateEmail:application.email,scheduledAt:data.scheduled_at,durationMinutes:data.duration_minutes||durationMinutes,location:data.location||location,meetingLink:data.meeting_link,interviewer:data.interviewer,candidateInstructions:data.candidate_instructions,event:'scheduled'});
    return NextResponse.json({interview:data,email:{status:email.status,attempts:email.attempts,providerId:'providerId' in email?email.providerId:null,deliveryId:email.deliveryId,...(email.status==='failed'?{error:email.error}: {})}},{status:201});
  }catch(error){console.error(JSON.stringify({level:'error',event:'admin.interview.schedule_failed',actor:session.email,reason:error instanceof Error?error.message:'unknown'}));return NextResponse.json({error:'Unable to schedule interview.'},{status:500});}
}

export async function PATCH(request: NextRequest) {
  const session=adminOrUnauthorized(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return NextResponse.json({error:'Interview id is required.'},{status:400});
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>32000)return NextResponse.json({error:'Request payload is too large.'},{status:413});
  const body=JSON.parse(raw) as Record<string,unknown>;
  const client=db();
  const {data:current,error:currentError}=await client.from('recruitment_interviews').select('*,application:recruitment_applications(id,full_name,email)').eq('id',id).maybeSingle();
  if(currentError) return NextResponse.json({error:'Unable to load interview.'},{status:500});
  if(!current)return NextResponse.json({error:'Interview not found.'},{status:404});
  const status=typeof body.status==='string'?body.status:undefined;
  if(status&&!allowedStatus.has(status))return NextResponse.json({error:'Invalid interview status.'},{status:400});
  const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
  const nextScheduled=typeof body.scheduledAt==='string'?body.scheduledAt:current.scheduled_at;
  if(!Number.isFinite(new Date(nextScheduled).getTime()))return NextResponse.json({error:'Invalid interview date/time.'},{status:400});
  if(typeof body.scheduledAt==='string')patch.scheduled_at=new Date(body.scheduledAt).toISOString();
  if(typeof body.meetingLink==='string')patch.meeting_link=body.meetingLink.trim()||null;
  if(typeof body.interviewer==='string')patch.interviewer=body.interviewer.trim()||null;
  if(typeof body.candidateInstructions==='string')patch.candidate_instructions=body.candidateInstructions.trim().slice(0,4000)||null;
  if(typeof body.cancellationReason==='string')patch.cancellation_reason=body.cancellationReason.trim().slice(0,2000)||null;
  if(status)patch.status=status;
  if(status==='Cancelled')patch.cancelled_at=new Date().toISOString();
  if(status==='Rescheduled')patch.reschedule_count=Number(current.reschedule_count||0)+1;
  const {data,error}=await client.from('recruitment_interviews').update(patch).eq('id',id).select('*').maybeSingle();
  if(error) return NextResponse.json({error:'Unable to update interview.'},{status:500});
  if(!data)return NextResponse.json({error:'Interview not found.'},{status:404});
  const application=Array.isArray(current.application)?current.application[0]:current.application;
  let emailStatus:null|Record<string,unknown>=null;
  if(application?.email && (status==='Cancelled'||status==='Rescheduled'||typeof body.scheduledAt==='string')){
    const event=status==='Cancelled'?'cancelled':'rescheduled';
    const email=await sendInterviewEmail({id:data.id,candidateName:application.full_name,candidateEmail:application.email,scheduledAt:data.scheduled_at,durationMinutes:data.duration_minutes||60,location:data.location||'Online',meetingLink:data.meeting_link,interviewer:data.interviewer,candidateInstructions:data.candidate_instructions,event});
    emailStatus={status:email.status,attempts:email.attempts,providerId:'providerId' in email?email.providerId:null,deliveryId:email.deliveryId,...(email.status==='failed'?{error:email.error}:{})};
  }
  return NextResponse.json({interview:data,email:emailStatus});
}
