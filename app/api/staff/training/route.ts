import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

export async function GET(request: NextRequest) {
  const session=await getStaffSession(request);
  if(!session)return NextResponse.json({error:'Unauthorised'},{status:401});
  const {data,error}=await db().from('laurem_staff_training_assignments')
    .select('id,training_type,mandatory,status,week_start,week_end,location,notes,assigned_by,assigned_at,completed_at,created_at,updated_at')
    .eq('staff_id',session.staff_id).order('created_at',{ascending:false}).limit(20);
  if(error)return NextResponse.json({error:'Unable to load your training schedule.'},{status:500});
  const rows=data||[];
  return NextResponse.json({current:rows.find((row:any)=>!['completed','waived','cancelled'].includes(row.status))||rows[0]||null,history:rows});
}
