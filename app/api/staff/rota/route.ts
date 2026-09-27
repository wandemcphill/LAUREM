import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';
import { recordLauremAuditEvent } from '@/lib/laurem-audit';
import { LAUREM_CARE_SETTINGS, LAUREM_SHIFT_PREFERENCES, LAUREM_WORK_REGIONS } from '@/lib/laurem-staff-operations';

function cleanList(value: unknown, allowed: readonly string[]) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => allowed.includes(item)))];
}
function parseDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isNaN(parsed.getTime()) ? null : value;
}
const careSettingKeys = LAUREM_CARE_SETTINGS.map((item) => item.key);

export async function GET(request: NextRequest) {
  const session = await getStaffSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data, error } = await db().from('laurem_staff_rota_requests')
    .select('id,effective_from,stable_shift_preference,regions,shift_preferences,care_settings,driver_available,notes,status,review_note,reviewed_at,created_at,updated_at')
    .eq('staff_id', session.staff_id).order('effective_from',{ascending:false}).order('created_at',{ascending:false}).limit(50);
  if (error) return NextResponse.json({ error: 'Unable to load your rota preferences.' }, { status: 500 });
  return NextResponse.json({ current:(data||[])[0]||null, history:data||[] });
}

export async function POST(request: NextRequest) {
  const session=await getStaffSession(request);
  if (!session) return NextResponse.json({error:'Unauthorised'},{status:401});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
  const effectiveFrom=parseDate(body?.effectiveFrom)||today;
  if(effectiveFrom<today)return NextResponse.json({error:'Rota preferences cannot be backdated.'},{status:400});
  const regions=cleanList(body?.regions,LAUREM_WORK_REGIONS);
  const shiftPreferences=cleanList(body?.shiftPreferences,LAUREM_SHIFT_PREFERENCES.map((item)=>item.key));
  const careSettings=cleanList(body?.careSettings,careSettingKeys);
  const stableShift=body?.stableShift!==false, driverAvailable=body?.driverAvailable===true;
  const notes=typeof body?.notes==='string'?body.notes.trim().slice(0,3000):null;
  if(!regions.length)return NextResponse.json({error:'Select at least one LAUREM work region.'},{status:400});
  if(!shiftPreferences.length)return NextResponse.json({error:'Select at least one shift preference.'},{status:400});
  if(!careSettings.length)return NextResponse.json({error:'Select at least one care setting.'},{status:400});
  const client=db();
  const {data:existing}=await client.from('laurem_staff_rota_requests').select('id').eq('staff_id',session.staff_id).eq('effective_from',effectiveFrom).maybeSingle();
  const payload={staff_id:session.staff_id,effective_from:effectiveFrom,stable_shift_preference:stableShift,regions,shift_preferences:shiftPreferences,care_settings:careSettings,driver_available:driverAvailable,notes,status:'requested',reviewed_by:null,reviewed_at:null,review_note:null,updated_at:new Date().toISOString()};
  const result=existing?.id
    ? await client.from('laurem_staff_rota_requests').update(payload).eq('id',existing.id).select('id,effective_from,stable_shift_preference,regions,shift_preferences,care_settings,driver_available,notes,status,review_note,reviewed_at,created_at,updated_at').single()
    : await client.from('laurem_staff_rota_requests').insert(payload).select('id,effective_from,stable_shift_preference,regions,shift_preferences,care_settings,driver_available,notes,status,review_note,reviewed_at,created_at,updated_at').single();
  if(result.error||!result.data)return NextResponse.json({error:'Unable to save your rota request.'},{status:500});
  const saved=result.data;
  await client.from('workforce_audit_events').insert({staff_id:session.staff_id,event_type:'staff.rota_request_updated',actor:session.email,details:{effectiveFrom,stableShift,regions,shiftPreferences,careSettings,driverAvailable}});
  await recordLauremAuditEvent({lifecycleArea:'workforce',entityType:'laurem_staff_rota_requests',entityId:saved.id,staffId:session.staff_id,actorType:'staff',actor:session.email,action:existing?.id?'rota_request_updated':'rota_request_created',newState:saved.status,metadata:{effectiveFrom,regions,shiftPreferences,careSettings,stableShift,driverAvailable}});
  return NextResponse.json({rota:saved},{status:existing?.id?200:201});
}
