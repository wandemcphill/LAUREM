import {NextResponse} from 'next/server';import{clearStaffSession}from'@/lib/laurem-staff-auth';export async function POST(){const r=NextResponse.json({ok:true});clearStaffSession(r);return r;}
