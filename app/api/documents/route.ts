import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-invitation-token') || '';
  if (!token) return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 });
  try {
    const client = db();
    const { data: invite } = await client.from('recruitment_invites')
      .select('id,expires_at,used_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (!invite) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This recruitment invitation has expired.' }, { status: 410 });
    }

    const { data: application } = await client.from('recruitment_applications').select('id').eq('invite_id', invite.id).maybeSingle();
    if (!application) return NextResponse.json({ error: 'Submit your application before uploading documents.' }, { status: 409 });

    const form = await request.formData();
    const file = form.get('file');
    const documentType = String(form.get('documentType') || 'Supporting document').trim().slice(0, 120) || 'Supporting document';
    if (!(file instanceof File)) return NextResponse.json({ error: 'A document file is required.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Documents must be between 1 byte and 10 MB.' }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Unsupported document type. Upload PDF, JPG, PNG, DOC or DOCX.' }, { status: 400 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${application.id}/${crypto.randomUUID()}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const checksumSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const { error: uploadError } = await client.storage
      .from('laurem-private-documents')
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await client.from('recruitment_documents').insert({
      application_id: application.id,
      document_type: documentType,
      original_filename: file.name.slice(0, 255),
      storage_path: path,
      mime_type: file.type,
      file_size_bytes: file.size,
      checksum_sha256: checksumSha256,
      uploaded_by: 'candidate',
    }).select('id,document_type,original_filename,status,uploaded_at,checksum_sha256,superseded_at,superseded_by').single();
    if (error) {
      await client.storage.from('laurem-private-documents').remove([path]);
      throw error;
    }

    await client.from('recruitment_document_requests').upsert({
      application_id: application.id,
      document_type: documentType,
      status: 'uploaded',
    }, { onConflict: 'application_id,document_type' });

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'candidate.document.upload_failed', reason: error instanceof Error ? error.message : 'unknown' }));
    return NextResponse.json({ error: 'Unable to upload document.' }, { status: 500 });
  }
}
