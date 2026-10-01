import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

const MAX_FILE_BYTES=10*1024*1024;
const ALLOWED_MIME=new Set(['application/pdf','text/plain','text/markdown','image/png','image/jpeg']);

export async function POST(request:NextRequest){
  const session=await getStaffSession(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});

  try{
    const form=await request.formData();
    const title=typeof form.get('title')==='string'?String(form.get('title')).trim().slice(0,160):'';
    const fileEntry=form.get('file');
    const file=fileEntry instanceof File && fileEntry.size>0?fileEntry:null;
    if(!title)return NextResponse.json({error:'Document title is required.'},{status:400});
    if(!file)return NextResponse.json({error:'Select a document to upload.'},{status:400});
    if(file.size>MAX_FILE_BYTES)return NextResponse.json({error:'Visa documents must be 10 MB or smaller.'},{status:400});
    if(!ALLOWED_MIME.has(file.type))return NextResponse.json({error:'Upload a PDF, text, Markdown, PNG or JPEG document.'},{status:400});

    const client=db();
    const {data:staff,error:staffError}=await client.from('laurem_staff_profiles').select('id,full_name,email,job_title').eq('id',session.staff_id).maybeSingle();
    if(staffError)throw staffError;
    if(!staff)return NextResponse.json({error:'Staff profile not found.'},{status:404});

    const bytes=new Uint8Array(await file.arrayBuffer());
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,180);
    const storagePath='visa-help/'+session.staff_id+'/'+randomUUID()+'-'+safeName;
    const {error:uploadError}=await client.storage.from('laurem-private-documents').upload(storagePath,bytes,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;

    const documentHash=createHash('sha256').update(bytes).digest('hex');
    const {data:document,error:documentError}=await client.from('laurem_staff_documents').insert({
      staff_id:session.staff_id,
      category:'visa_help',
      title,
      description:'Private immigration-support document provided by staff for Visa Help review.',
      original_filename:safeName,
      mime_type:file.type,
      file_size_bytes:file.size,
      storage_path:storagePath,
      content_text:null,
      document_sha256:documentHash,
      source_type:'staff_visa_help',
      source_key:randomUUID(),
      status:'issued',
      requires_signature:false,
      signature_status:'not_required',
      issued_by_actor:session.email,
      issued_at:new Date().toISOString(),
    }).select('id,title,description,original_filename,mime_type,file_size_bytes,issued_at').single();
    if(documentError)throw documentError;

    await client.from('laurem_staff_document_events').insert({
      document_id:document.id,
      staff_id:session.staff_id,
      event_type:'created',
      actor_type:'staff',
      actor:session.email,
      metadata:{category:'visa_help',document_sha256:documentHash},
    });

    return NextResponse.json({document},{status:201});
  }catch(error){
    console.error(JSON.stringify({level:'error',event:'staff.visa_help.document_upload_failed',staffId:session.staff_id,reason:error instanceof Error?error.message:String(error)}));
    return NextResponse.json({error:'Unable to upload the visa document.'},{status:500});
  }
}
