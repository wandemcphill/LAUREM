import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { makeToken, hashToken } from '@/lib/token';
import { lauremCompany } from '@/lib/laurem-company-config';
import { sendLauremEmail } from '@/lib/laurem-email';

function escapeHtml(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function appUrl(){return(process.env.NEXT_PUBLIC_APP_URL||'https://recruitment.lauremcare.com').replace(/\/$/,'');}

export async function POST(request:NextRequest){
  const session=readAdminSession(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>32000)return NextResponse.json({error:'Request payload is too large.'},{status:413});
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw) as Record<string,unknown>;}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400});}
  const applicationId=typeof body.applicationId==='string'?body.applicationId.trim():'';
  if(!applicationId)return NextResponse.json({error:'Application id is required.'},{status:400});
  try{
    const client=db();
    const {data:app,error:appError}=await client.from('recruitment_applications').select('id,full_name,email,role_applied').eq('id',applicationId).maybeSingle();
    if(appError)throw appError;
    if(!app)return NextResponse.json({error:'Application not found.'},{status:404});
    const token=makeToken();
    const expiresAt=new Date(Date.now()+14*24*60*60*1000).toISOString();
    const {data:created,error}=await client.rpc('laurem_create_second_interview_invitation',{p_application_id:applicationId,p_token_hash:hashToken(token),p_sent_by:session.email,p_expires_at:expiresAt});
    if(error){
      if(error.code==='P0001' || error.message==='active_second_interview_exists')return NextResponse.json({error:'An active second-interview invitation already exists for this candidate.'},{status:409});
      if(error.code==='P0002' || error.message==='application_not_found')return NextResponse.json({error:'Application not found.'},{status:404});
      throw error;
    }
    const data=Array.isArray(created)?created[0]:created;
    if(!data?.id)throw new Error('Atomic second-interview invitation RPC returned no row.');
    const link=`${appUrl()}/second-interview/${token}`;
    const safeName=escapeHtml(app.full_name);const safeLink=escapeHtml(link);const safeRole=escapeHtml(app.role_applied||'the position');
    const email=await sendLauremEmail(client,{eventType:'second_interview_invitation',entityId:data.id,idempotencyKey:`second-interview:${data.id}`,payload:{from:lauremCompany.candidateCommunications.senderAddress,to:[app.email],reply_to:lauremCompany.candidateCommunications.replyToAddress,subject:`Second interview invitation from ${lauremCompany.tradingName}`,text:`Dear ${app.full_name},\n\nYou have been invited to complete the second interview for ${app.role_applied||'the position'} with ${lauremCompany.tradingName}.\n\nUse your private link:\n${link}\n\nThis link expires on ${new Date(data.expires_at).toLocaleDateString('en-GB',{dateStyle:'medium'})}.\n\nKind regards,\n${lauremCompany.tradingName} Recruitment`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173a31;max-width:620px;margin:0 auto"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1f705e">${escapeHtml(lauremCompany.tradingName.toUpperCase())} RECRUITMENT</p><h1 style="font-size:28px">Second interview invitation</h1><p>Dear ${safeName},</p><p>We would like you to complete the second interview for <strong>${safeRole}</strong>.</p><p>This stage includes practical and safeguarding-focused questions:</p><p><a href="${safeLink}" style="display:inline-block;background:#173a31;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Start your second interview</a></p><p style="font-size:13px;color:#5c6c67">This private link expires on ${new Date(data.expires_at).toLocaleDateString('en-GB',{dateStyle:'medium'})}. Please do not forward it.</p><p>Kind regards,<br>${escapeHtml(lauremCompany.tradingName)} Recruitment</p></div>`}});
    return NextResponse.json({secondInterview:data,link,email:{status:email.status,attempts:email.attempts,providerId:'providerId' in email?email.providerId:null,deliveryId:email.deliveryId,...(email.status==='failed'?{error:email.error}:{})}},{status:201});
  }catch(error){console.error(JSON.stringify({level:'error',event:'admin.second_interview.create_failed',actor:session.email,reason:error instanceof Error?error.message:'unknown'}));return NextResponse.json({error:'Unable to create second-interview invitation.'},{status:500});}
}
