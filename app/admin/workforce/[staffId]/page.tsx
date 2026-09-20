'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const tabs = ['Overview', 'Shifts', 'Timesheets', 'Leave', 'Payroll', 'Onboarding', 'Audit'] as const;
type Tab = typeof tabs[number];

type Staff = { id:string; application_id:string|null; employee_number:string; full_name:string; email:string; phone:string|null; job_title:string; employment_status:string; start_date:string|null; end_date:string|null; location:string|null; address_line_1:string|null; address_line_2:string|null; city:string|null; county:string|null; postcode:string|null; country:string|null; profile_photo_url:string|null; nmc_number:string|null; right_to_work_verified:boolean; dbs_verified:boolean; contract_id:string|null; created_at:string; updated_at:string };
type Assignment = { id:string; client_name:string|null; location:string; scheduled_start:string; scheduled_end:string; status:string; notes:string|null };
type Timesheet = { id:string; assignment_id:string|null; work_date:string; clock_in:string|null; clock_out:string|null; break_minutes:number; total_hours:number|null; status:string; notes:string|null; approved_by:string|null; approved_at:string|null };
type LeaveRequest = { id:string; leave_type:string; start_date:string; end_date:string; total_days:number; reason:string|null; status:string; reviewed_by:string|null; reviewed_at:string|null; review_note:string|null };
type PayrollEntry = { id:string; payroll_period_id:string; approved_hours:number|null; hourly_rate:number|null; gross_amount:number|null; status:string; notes:string|null };
type Task = { id:string; category:string; title:string; description:string|null; required:boolean; status:string; acknowledgement_required:boolean; acknowledged_at:string|null; completed_at:string|null; notes:string|null };
type Audit = { id:string; entity_type:string|null; entity_id:string|null; event_type:string; actor:string|null; details:Record<string, unknown>|null; created_at:string };

type StaffPayload = { staff:Staff; assignments:Assignment[]; timesheets:Timesheet[]; leaveRequests:LeaveRequest[]; payrollEntries:PayrollEntry[]; onboarding:{package:Record<string, unknown>;tasks:Task[]}|null; audit:Audit[] };

function dateTime(value:string|null) { return value ? new Date(value).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Not set'; }
function dateOnly(value:string|null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString([], { dateStyle:'medium' }) : 'Not set'; }
function money(value:number|null) { return value == null ? 'Not set' : `£${Number(value).toFixed(2)}`; }
function badge(status:string) { return { padding:'6px 9px', borderRadius:999, background:'var(--soft)', fontSize:12, fontWeight:800 } as const; }

export default function Staff360Page({ params }: { params:Promise<{ staffId:string }> }) {
  const [staffId,setStaffId] = useState('');
  const [data,setData] = useState<StaffPayload|null>(null);
  const [tab,setTab] = useState<Tab>('Overview');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);

  useEffect(()=>{ params.then(({staffId:id})=>setStaffId(id)); },[params]);
  async function load() {
    if(!staffId) return;
    setError('');
    try {
      const response=await fetch(`/api/admin/workforce/staff/${encodeURIComponent(staffId)}`,{cache:'no-store'});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to load staff workspace.');
      setData(body);
    } catch(e) { setError(e instanceof Error?e.message:'Unable to load staff workspace.'); }
  }
  useEffect(()=>{void load();},[staffId]);

  async function patchStaff(employmentStatus:string,endDate?:string) {
    if(!data) return;
    setBusy(true); setError('');
    try {
      const response=await fetch(`/api/admin/workforce/staff/${encodeURIComponent(staffId)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({employmentStatus,endDate})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to update staff status.');
      await load();
    } catch(e){setError(e instanceof Error?e.message:'Unable to update staff status.');} finally{setBusy(false);}
  }

  async function updateTask(id:string,status:string) {
    setBusy(true); setError('');
    try {
      const response=await fetch(`/api/admin/onboarding/tasks?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to update onboarding task.');
      await load();
    } catch(e){setError(e instanceof Error?e.message:'Unable to update onboarding task.');} finally{setBusy(false);}
  }

  const stats = useMemo(()=>{
    if(!data) return { upcoming:0, pendingTimesheets:0, pendingLeave:0, requiredDone:0, requiredTotal:0, openPayroll:0 };
    const now=Date.now();
    const upcoming=data.assignments.filter(a=>new Date(a.scheduled_start).getTime()>=now && ['scheduled','confirmed'].includes(a.status)).length;
    const pendingTimesheets=data.timesheets.filter(t=>t.status==='submitted').length;
    const pendingLeave=data.leaveRequests.filter(l=>l.status==='pending').length;
    const tasks=data.onboarding?.tasks||[];
    const requiredTotal=tasks.filter(t=>t.required).length;
    const requiredDone=tasks.filter(t=>t.required && ['completed','waived'].includes(t.status)).length;
    const openPayroll=data.payrollEntries.filter(e=>!['paid'].includes(e.status)).length;
    return {upcoming,pendingTimesheets,pendingLeave,requiredDone,requiredTotal,openPayroll};
  },[data]);

  if(!data) return <main className="wrap" style={{padding:'36px 0 80px',maxWidth:1120}}><Link href="/admin/workforce" style={{color:'var(--muted)',textDecoration:'none'}}>← Workforce</Link><h1 style={{marginTop:16}}>Staff workspace</h1>{error?<div role="alert" className="card" style={{padding:16,marginTop:18}}>{error}</div>:<div className="card" style={{padding:20,marginTop:18}}>Loading staff workspace…</div>}</main>;

  const s=data.staff;
  const onboardingProgress=stats.requiredTotal?Math.round((stats.requiredDone/stats.requiredTotal)*100):100;

  return <main className="wrap" style={{padding:'30px 0 80px',maxWidth:1180}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><Link href="/admin/workforce" style={{color:'var(--muted)',textDecoration:'none'}}>← Workforce operations</Link><p style={{color:'var(--accent)',fontWeight:800,letterSpacing:'.08em',margin:'18px 0 6px'}}>STAFF 360</p><h1 style={{fontSize:42,margin:'0 0 6px'}}>{s.full_name}</h1><div style={{color:'var(--muted)'}}>{s.employee_number} · {s.job_title} · {s.location||'Location not set'}</div></div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><span style={badge(s.employment_status)}>{s.employment_status}</span>{s.employment_status==='pending'&&<button disabled={busy} onClick={()=>void patchStaff('active')} style={buttonPrimary}>Activate</button>}{s.employment_status==='active'&&<><button disabled={busy} onClick={()=>void patchStaff('suspended')} style={buttonSecondary}>Suspend</button><button disabled={busy} onClick={()=>void patchStaff('leaver',new Date().toISOString().slice(0,10))} style={buttonSecondary}>Mark leaver</button></>}{s.employment_status==='suspended'&&<button disabled={busy} onClick={()=>void patchStaff('active')} style={buttonPrimary}>Reactivate</button>}<Link href={`/admin/onboarding/${encodeURIComponent(s.id)}`} style={buttonSecondary}>Full onboarding</Link><Link href={`/admin/workforce/${encodeURIComponent(s.id)}/documents`} style={buttonSecondary}>Employment documents</Link><Link href={`/admin/workforce/${encodeURIComponent(s.id)}/visa-sponsorship`} style={buttonSecondary}>Visa & sponsorship</Link></div>
    </div>
    {error&&<div role="alert" className="card" style={{padding:14,marginTop:16,color:'#8a2323'}}>{error}</div>}

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10,marginTop:22}}>
      <Metric label="Upcoming shifts" value={stats.upcoming}/><Metric label="Pending timesheets" value={stats.pendingTimesheets}/><Metric label="Pending leave" value={stats.pendingLeave}/><Metric label="Onboarding" value={`${onboardingProgress}%`}/><Metric label="Open payroll" value={stats.openPayroll}/>
    </section>

    <section className="card" style={{padding:6,marginTop:20,overflowX:'auto'}}><nav style={{display:'flex',minWidth:'max-content'}}>{tabs.map(item=><button key={item} onClick={()=>setTab(item)} style={{...tabButton,background:tab===item?'var(--ink)':'transparent',color:tab===item?'white':'var(--ink)'}}>{item}</button>)}</nav></section>

    {tab==='Overview'&&<Overview staff={s} data={data} stats={stats}/>} 
    {tab==='Shifts'&&<TableSection title="Shift history"><div style={gridStyle}>{data.assignments.map(a=><article key={a.id} className="card" style={{padding:16}}><div style={row}><div><strong>{a.client_name||'Unassigned client'}</strong><div style={muted}>{a.location}</div></div><span style={badge(a.status)}>{a.status}</span></div><div style={muted}>{dateTime(a.scheduled_start)} → {new Date(a.scheduled_end).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>{a.notes&&<div style={{marginTop:8}}>{a.notes}</div>}</article>)}</div></TableSection>}
    {tab==='Timesheets'&&<TableSection title="Timesheet history"><div style={gridStyle}>{data.timesheets.map(t=><article key={t.id} className="card" style={{padding:16}}><div style={row}><div><strong>{dateOnly(t.work_date)}</strong><div style={muted}>{t.total_hours??0} hours · break {t.break_minutes}m</div></div><span style={badge(t.status)}>{t.status}</span></div><div style={muted}>{dateTime(t.clock_in)} → {dateTime(t.clock_out)}</div>{t.notes&&<div style={{marginTop:8}}>{t.notes}</div>}{t.status==='submitted'&&<div style={{display:'flex',gap:8,marginTop:12}}><button disabled={busy} onClick={()=>void reviewTimesheet(t.id,'approved')} style={buttonPrimary}>Approve</button><button disabled={busy} onClick={()=>void reviewTimesheet(t.id,'rejected')} style={buttonSecondary}>Reject</button></div>}</article>)}</div></TableSection>}
    {tab==='Leave'&&<TableSection title="Leave history"><div style={gridStyle}>{data.leaveRequests.map(l=><article key={l.id} className="card" style={{padding:16}}><div style={row}><div><strong>{l.leave_type}</strong><div style={muted}>{dateOnly(l.start_date)} → {dateOnly(l.end_date)} · {l.total_days} day{l.total_days===1?'':'s'}</div></div><span style={badge(l.status)}>{l.status}</span></div>{l.reason&&<div style={{marginTop:8}}>{l.reason}</div>}{l.review_note&&<div style={{marginTop:8,color:'var(--muted)'}}>Review: {l.review_note}</div>}{l.status==='pending'&&<div style={{display:'flex',gap:8,marginTop:12}}><button disabled={busy} onClick={()=>void reviewLeave(l.id,'approved')} style={buttonPrimary}>Approve</button><button disabled={busy} onClick={()=>void reviewLeave(l.id,'rejected')} style={buttonSecondary}>Reject</button></div>}</article>)}</div></TableSection>}
    {tab==='Payroll'&&<TableSection title="Payroll history"><div style={gridStyle}>{data.payrollEntries.map(e=><article key={e.id} className="card" style={{padding:16}}><div style={row}><div><strong>{e.approved_hours??0} approved hours</strong><div style={muted}>Rate {money(e.hourly_rate)} · Gross {money(e.gross_amount)}</div></div><span style={badge(e.status)}>{e.status}</span></div>{e.notes&&<div style={{marginTop:8}}>{e.notes}</div>}</article>)}{!data.payrollEntries.length&&<Empty label="No payroll entries for this staff member."/>}</div></TableSection>}
    {tab==='Onboarding'&&<TableSection title={String(data.onboarding?.package?.title||'Onboarding package')}><div className="card" style={{padding:18,marginBottom:12}}><div style={row}><div><strong>Package status</strong><div style={muted}>{String(data.onboarding?.package?.status||'not created')}</div></div><span style={badge(`${onboardingProgress}% complete`)}>{stats.requiredDone}/{stats.requiredTotal} required</span></div><div style={{height:9,background:'var(--soft)',borderRadius:99,marginTop:14,overflow:'hidden'}}><div style={{height:'100%',width:`${onboardingProgress}%`,background:'var(--ink)'}}/></div></div><div style={gridStyle}>{(data.onboarding?.tasks||[]).map(task=><article key={task.id} className="card" style={{padding:16}}><div style={row}><div><span style={{fontSize:11,fontWeight:800,color:'var(--accent)'}}>{task.category.toUpperCase()}</span><h3 style={{margin:'6px 0'}}>{task.title}</h3><p style={{margin:0,color:'var(--muted)'}}>{task.description}</p></div><span style={badge(task.status)}>{task.status}</span></div><div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>{task.status!=='completed'&&<button disabled={busy} onClick={()=>void updateTask(task.id,'completed')} style={buttonPrimary}>Complete</button>}{task.status==='completed'&&<button disabled={busy} onClick={()=>void updateTask(task.id,'pending')} style={buttonSecondary}>Reopen</button>}{task.required&&task.status!=='waived'&&<button disabled={busy} onClick={()=>void updateTask(task.id,'waived')} style={buttonSecondary}>Waive</button>}</div></article>)}{!data.onboarding?.tasks?.length&&<Empty label="No onboarding package has been created yet."/>}</div></TableSection>}
    {tab==='Audit'&&<TableSection title="Staff audit trail"><div style={gridStyle}>{data.audit.map(event=><article key={event.id} className="card" style={{padding:16}}><div style={row}><strong>{event.event_type}</strong><span style={muted}>{dateTime(event.created_at)}</span></div><div style={muted}>{event.actor||'System'}{event.entity_type?` · ${event.entity_type}`:''}</div>{event.details&&<pre style={{whiteSpace:'pre-wrap',fontSize:12,margin:'10px 0 0',color:'var(--muted)'}}>{JSON.stringify(event.details,null,2)}</pre>}</article>)}{!data.audit.length&&<Empty label="No audit events recorded for this staff member."/>}</div></TableSection>}

    <p style={{marginTop:18,color:'var(--muted)',fontSize:12}}>Staff data is read through the LAUREM namespace. Actions remain subject to the existing workforce state and payroll controls.</p>
  </main>;

  async function reviewTimesheet(id:string,status:string) { await action(`/api/admin/workforce/timesheets?id=${encodeURIComponent(id)}`,{status}); }
  async function reviewLeave(id:string,status:string) { await action(`/api/admin/workforce/leave?id=${encodeURIComponent(id)}`,{status,reviewNote:status==='rejected'?'Rejected in Staff 360':'Approved in Staff 360'}); }
  async function action(url:string,body:Record<string,unknown>) {
    setBusy(true);setError('');
    try { const response=await fetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); const result=await response.json(); if(!response.ok) throw new Error(result.error||'Unable to update record.'); await load(); }
    catch(e){setError(e instanceof Error?e.message:'Unable to update record.');}
    finally{setBusy(false);}
  }
}

function Metric({label,value}:{label:string;value:string|number}) { return <article className="card" style={{padding:'15px 16px'}}><div style={{fontSize:26,fontWeight:900}}>{value}</div><div style={{marginTop:3,color:'var(--muted)',fontSize:12}}>{label}</div></article>; }
function TableSection({title,children}:{title:string;children:React.ReactNode}) { return <section style={{marginTop:20}}><h2>{title}</h2>{children}</section>; }
function Empty({label}:{label:string}) { return <div className="card" style={{padding:20,color:'var(--muted)'}}>{label}</div>; }
function Overview({staff,data,stats}:{staff:Staff;data:StaffPayload;stats:{upcoming:number;pendingTimesheets:number;pendingLeave:number;requiredDone:number;requiredTotal:number;openPayroll:number}}) {
  const address = [staff.address_line_1, staff.address_line_2, staff.city, staff.county, staff.postcode, staff.country].filter(Boolean).join(', ');
  return <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(300px,1fr)',gap:16,marginTop:20}}>
    <article className="card" style={{padding:20}}>
      <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:18}}>
        {staff.profile_photo_url ? <img src={staff.profile_photo_url} alt={`${staff.full_name} profile`} style={{width:88,height:88,borderRadius:18,objectFit:'cover',border:'1px solid var(--line)'}} /> : <div aria-hidden="true" style={{width:88,height:88,borderRadius:18,background:'var(--soft)',display:'grid',placeItems:'center',fontSize:28,fontWeight:900}}>{staff.full_name.split(/\\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</div>}
        <div><h2 style={{margin:0}}>Employment profile</h2><div style={{marginTop:5,color:'var(--muted)',fontSize:13}}>Current staff identity and contact record</div></div>
      </div>
      <dl style={dl}><Row label="Employee number" value={staff.employee_number}/><Row label="Role" value={staff.job_title}/><Row label="Email" value={staff.email}/><Row label="Phone" value={staff.phone||'Not set'}/><Row label="Location" value={staff.location||'Not set'}/><Row label="Start date" value={dateOnly(staff.start_date)}/><Row label="End date" value={dateOnly(staff.end_date)}/><Row label="NMC number" value={staff.nmc_number||'Not applicable / not recorded'}/></dl>
      <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid var(--line)'}}><h3 style={{margin:'0 0 10px'}}>UK contact address</h3><p style={{margin:0,color:address?'var(--ink)':'var(--muted)',lineHeight:1.6}}>{address || 'No address has been provided by the staff member.'}</p></div>
    </article>
    <article className="card" style={{padding:20}}><h2 style={{marginTop:0}}>Compliance snapshot</h2><div style={compliance}><Check label="Right to work verified" value={staff.right_to_work_verified}/><Check label="DBS verified" value={staff.dbs_verified}/><Check label="Accepted contract linked" value={Boolean(staff.contract_id)}/><Check label="Application linked" value={Boolean(staff.application_id)}/></div><div style={{marginTop:18,paddingTop:16,borderTop:'1px solid var(--line)',color:'var(--muted)',fontSize:13}}>{stats.requiredDone}/{stats.requiredTotal} required onboarding tasks complete · {stats.openPayroll} open payroll entries</div></article>
  </section>;
}
function Row({label,value}:{label:string;value:string}) { return <div style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:12,padding:'8px 0',borderBottom:'1px solid var(--line)'}}><dt style={{color:'var(--muted)',fontSize:13}}>{label}</dt><dd style={{margin:0}}>{value}</dd></div>; }
function Check({label,value}:{label:string;value:boolean}) { return <div style={{display:'flex',justifyContent:'space-between',gap:12,padding:'11px 0',borderBottom:'1px solid var(--line)'}}><span>{label}</span><strong>{value?'Verified':'Outstanding'}</strong></div>; }
const buttonPrimary={background:'var(--ink)',color:'white',border:0,padding:'10px 13px',borderRadius:9,fontWeight:800,textDecoration:'none',cursor:'pointer'};
const buttonSecondary={background:'white',color:'var(--ink)',border:'1px solid var(--line)',padding:'10px 13px',borderRadius:9,fontWeight:800,textDecoration:'none',cursor:'pointer'};
const tabButton={border:0,padding:'10px 14px',borderRadius:8,fontWeight:800,cursor:'pointer'};
const row={display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'} as const;
const muted={marginTop:5,color:'var(--muted)',fontSize:13};
const gridStyle={display:'grid',gap:10};
const dl={margin:0};
const compliance={display:'grid'};
