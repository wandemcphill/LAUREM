import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const applicationId = new URL(request.url).searchParams.get('applicationId');
  if (!applicationId) return NextResponse.json({ error: 'Application id is required.' }, { status: 400 });
  try {
    const { data, error } = await db().from('recruitment_documents').select('*').eq('application_id', applicationId).order('uploaded_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.documents.list_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to load documents.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as { status?: string; reviewNote?: string } | null;
  const status = body?.status || '';
  if (!['pending','approved','rejected'].includes(status)) return NextResponse.json({ error: 'Invalid document status.' }, { status: 400 });
  try {
    const client = db();
    const { data, error } = await client.from('recruitment_documents').update({ status, reviewed_by: session.email, reviewed_at: new Date().toISOString(), review_note: typeof body?.reviewNote === 'string' ? body.reviewNote : null }).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    if (data.document_request_id) await client.from('recruitment_document_requests').update({ status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'uploaded', reviewed_by: session.email, reviewed_at: new Date().toISOString(), review_note: typeof body?.reviewNote === 'string' ? body.reviewNote : null }).eq('id', data.document_request_id);
    return NextResponse.json({ document: data });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'admin.document.review_failed', actor: session.email, reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to review document.' }, { status: 500 });
  }
}
