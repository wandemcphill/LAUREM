import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

const PHOTO_BUCKET = 'laurem-staff-photos';

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: staff, error } = await db().from('staff_profiles')
    .select('profile_photo_path')
    .eq('id', session.staff_id)
    .maybeSingle();

  if (error || !staff?.profile_photo_path) {
    return NextResponse.json({ error: 'Staff photograph not found.' }, { status: 404 });
  }

  const { data, error: downloadError } = await db().storage
    .from(PHOTO_BUCKET)
    .download(staff.profile_photo_path);

  if (downloadError || !data) {
    return NextResponse.json({ error: 'Unable to load your photograph.' }, { status: 404 });
  }

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}
