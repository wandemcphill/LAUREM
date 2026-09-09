import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readAdminSession } from '@/lib/admin-auth';

const statuses = new Set(['open','processing','closed']);

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const periods = await db().from('payroll_periods').select('id,period_start,period_end,pay_date,status,notes,created_by,created_at,updated_at').order('period_start',{ascending:false}).limit(50);
  if (periods.error) return NextResponse.json({ error: 'Unable to load payroll periods.' }, { status: 500 });
  const periodId = new URL(request.url).searchParams.get('periodId');
  let entriesQuery = db().from('payroll_entries').select('id,payroll_period_id,staff_id,approved_hours,hourly_rate,gross_amount,status,notes,created_at,updated_at,staff_profiles(employee_number,full_name,job_title)');
  if (periodId) entriesQuery = entriesQuery.eq('payroll_period_id', periodId);
  const entries = await entriesQuery.order('created_at',{ascending:false}).limit(1000);
  if (entries.error) return NextResponse.json({ error: 'Unable to load payroll entries.' }, { status: 500 });
  return NextResponse.json({ periods: periods.data || [], entries: entries.data || [] });
}

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const start = typeof body?.periodStart === 'string' ? body.periodStart : '';
  const end = typeof body?.periodEnd === 'string' ? body.periodEnd : '';
  const payDate = typeof body?.payDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.payDate) ? body.payDate : null;
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return NextResponse.json({ error: 'Valid period start and end dates are required.' }, { status: 400 });
  const client = db();
  const { data: period, error } = await client.from('payroll_periods').insert({ period_start:start, period_end:end, pay_date:payDate, notes:notes||null, created_by:session.email }).select('id,period_start,period_end,pay_date,status,notes,created_by,created_at,updated_at').single();
  if (error || !period) return NextResponse.json({ error: error?.code === '23505' ? 'That payroll period already exists.' : 'Unable to create payroll period.' }, { status: 500 });

  const { data: timesheets, error: tsError } = await client.from('staff_timesheets').select('staff_id,total_hours').gte('work_date',start).lte('work_date',end).eq('status','approved');
  if (tsError) return NextResponse.json({ error: 'Payroll period created, but approved timesheets could not be read.' }, { status: 500 });
  const totals = new Map<string, number>();
  for (const row of timesheets || []) totals.set(row.staff_id, (totals.get(row.staff_id) || 0) + Number(row.total_hours || 0));
  const staffIds = [...totals.keys()];
  if (staffIds.length) {
    const { data: staffRows } = await client.from('staff_profiles').select('id,contract_id').in('id',staffIds);
    const contractIds = (staffRows||[]).map(s=>s.contract_id).filter((v): v is string=>Boolean(v));
    const { data: contracts } = contractIds.length ? await client.from('recruitment_contracts').select('id,hourly_rate').in('id',contractIds) : { data: [] as {id:string;hourly_rate:number|null}[] };
    const rateByContract = new Map((contracts||[]).map(c=>[c.id,Number(c.hourly_rate||0)]));
    const staffById = new Map((staffRows||[]).map(s=>[s.id,s]));
    for (const staffId of staffIds) {
      const hours = Number((totals.get(staffId)||0).toFixed(2));
      const contractId = staffById.get(staffId)?.contract_id || null;
      const rate = contractId ? Number((rateByContract.get(contractId)||0).toFixed(2)) : 0;
      await client.from('payroll_entries').upsert({ payroll_period_id:period.id, staff_id:staffId, approved_hours:hours, hourly_rate:rate || null, gross_amount:rate ? Number((hours*rate).toFixed(2)) : null, status:'draft' }, { onConflict:'payroll_period_id,staff_id' });
    }
  }
  await client.from('workforce_audit_events').insert({ event_type:'payroll.period_created', actor:session.email, details:{ periodId:period.id, periodStart:start, periodEnd:end, generatedStaffCount:staffIds.length } });
  return NextResponse.json({ period, generatedEntries:staffIds.length }, { status:201 });
}

export async function PATCH(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Payroll period id is required.' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!statuses.has(status)) return NextResponse.json({ error:'Invalid payroll period status.' }, { status:400 });
  const { data: current } = await db().from('payroll_periods').select('id,status').eq('id',id).maybeSingle();
  if (!current) return NextResponse.json({ error:'Payroll period not found.' }, { status:404 });
  const allowed: Record<string,string[]> = { open:['processing'], processing:['closed'], closed:[] };
  if (!allowed[current.status]?.includes(status)) return NextResponse.json({ error:`Transition from ${current.status} to ${status} is not allowed.` }, { status:409 });
  const { data, error } = await db().from('payroll_periods').update({ status, updated_at:new Date().toISOString() }).eq('id',id).select('id,period_start,period_end,pay_date,status,notes,created_at,updated_at').single();
  if (error) return NextResponse.json({ error:'Unable to update payroll period.' }, { status:500 });
  await db().from('workforce_audit_events').insert({ event_type:'payroll.period_status_changed', actor:session.email, details:{ periodId:id, from:current.status, to:status } });
  return NextResponse.json({ period:data });
}
