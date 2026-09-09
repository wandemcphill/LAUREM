import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const client = db();
  const { data: staff } = await client.from('staff_profiles').select('application_id').eq('id', session.staff_id).maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Staff profile not found.' }, { status: 404 });
  if (!staff.application_id) return NextResponse.json({ documents: [] });
  const { data, error } = await client.from('recruitment_documents')
    .select('id,document_type,original_filename,mime_type,file_size_bytes,status,uploaded_at,reviewed_at,review_note')
    .eq('application_id', staff.application_id).order('uploaded_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load documents.' }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}
