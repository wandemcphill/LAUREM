'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Staff = { id:string; employee_number:string; full_name:string; email:string; job_title:string; employment_status:string; start_date:string|null; end_date:string|null; location:string|null };
type Assignment = { id:string; staff_id:string; client_name:string|null; location:string; scheduled_start:string; scheduled_end:string; status:string; notes:string|null; staff_profiles?: { employee_number:string; full_name:string; email:string; job_title:string; employment_status:string } };
type Timesheet = { id:string; work_date:string; total_hours:number|null; status:string; staff_profiles?:{employee_number:string;full_name:string;job_title:string} };
type LeaveRequest = { id:string; staff_id:string; leave_type:string; start_date:string; end_date:string; total_days:number; status:string; reason:string|null; staff_profiles?:{employee_number:string;full_name:string;job_title:string} };
type WorkforceReadiness = { summary:{totalStaff:number;activeStaff:number;ready:number;attention:number;blocked:number;latestPayrollPeriod:any|null;generatedAt:string}; staff:{id:string;full_name:string;employee_number:string;job_title:string;readiness:{overall:'ready'|'attention'|'blocked';nextAction:string|null;lanes:{key:string;level:'ready'|'attention'|'blocked';label:string;detail:string;count:number}[]}}[] };

function localInput(date: Date) { const d = new Date(date.getTime() - date.getTimezoneOffset()*60000); return d.toISOString().slice(0,16); }

export default function WorkforcePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState('');
  const [workforceReadiness, setWorkforceReadiness] = useState<WorkforceReadiness|null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledStart, setScheduledStart] = useState(localInput(new Date()));
  const [scheduledEnd, setScheduledEnd] = useState(localInput(new Date(Date.now()+4*3600000)));

  async function load() {
    setError('');
    try {
      const [s,a,t,l,r] = await Promise.all([
        fetch('/api/admin/workforce/staff',{cache:'no-store'}),
        fetch('/api/admin/workforce/assignments',{cache:'no-store'}),
        fetch('/api/admin/workforce/timesheets',{cache:'no-store'}),
        fetch('/api/admin/workforce/leave',{cache:'no-store'}),
        fetch('/api/admin/workforce/readiness',{cache:'no-store'}),
      ]);
      const [sp,ap,tp,lp,rp] = await Promise.all([s.json(),a.json(),t.json(),l.json(),r.json()]);
      if (!s.ok || !a.ok || !t.ok || !l.ok) throw new Error(sp.error || ap.error || tp.error || lp.error || 'Unable to load workforce data.');
      setStaff(sp.staff||[]); setAssignments(ap.assignments||[]); setTimesheets(tp.timesheets||[]); setLeave(lp.requests||lp.leaveRequests||[]); setWorkforceReadiness(r.ok ? rp : null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load workforce data.'); }
  }
  useEffect(()=>{void load();},[]);

  const activeStaff = useMemo(()=>staff.filter(s=>s.employment_status==='active'),[staff]);
  async function updateStaff(id:string, employmentStatus:string, endDate?:string, note?:string) {
    setBusy(true); setError('');
    try { const r=await fetch(`/api/admin/workforce/staff?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({employmentStatus,endDate,note})}); const p=await r.json(); if(!r.ok) throw new Error(p.error||'Unable to update staff.'); await load(); }
    catch(e){setError(e instanceof Error?e.message:'Unable to update staff.');} finally{setBusy(false);}
  }
  async function addAssignment(e:React.FormEvent) {
    e.preventDefault(); if(!selectedStaff) return;
    setBusy(true); setError('');
    try { const r=await fetch('/api/admin/workforce/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staffId:selectedStaff,clientName,location,scheduledStart:new Date(scheduledStart).toISOString(),scheduledEnd:new Date(scheduledEnd).toISOString()})}); const p=await r.json(); if(!r.ok) throw new Error(p.error||'Unable to create assignment.'); setClientName(''); setLocation(''); await load(); }
    catch(e){setError(e instanceof Error?e.message:'Unable to create assignment.');} finally{setBusy(false);}
  }
  async function patch(path:string,id:string,body:Record<string,unknown>) {
    setBusy(true); setError('');
    try { const r=await fetch(`${path}?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const p=await r.json(); if(!r.ok) throw new Error(p.error||'Update failed.'); await load(); }
    catch(e){setError(e instanceof Error?e.message:'Update failed.');} finally{setBusy(false);}
  }

  const pendingTimesheets=timesheets.filter(t=>t.status==='submitted');
  const pendingLeave=leave.filter(l=>l.status==='pending');

  return <main className="wrap" style={{padding:'36px 0 80px'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap',alignItems:'center'}}><div><Link href="/admin" style={{textDecoration:'none',color:'var(--muted)'}}>← Recruitment workspace</Link><h1 style={{fontSize:40,margin:'8px 0'}}>Workforce operations</h1><p style={{color:'var(--muted)',margin:0}}>Live staff status, assignments, timesheets and leave.</p></div><div style={{display:'flex',gap:8,alignItems:'center'}}><Link href="/admin/workforce/schedule" style={{padding:'9px 12px',border:'1px solid var(--line)',borderRadius:9,textDecoration:'none',color:'var(--ink)',fontWeight:800}}>Weekly schedule</Link><Link href="/admin/workforce/staff-account" style={{padding:'9px 12px',border:'1px solid var(--line)',borderRadius:9,textDecoration:'none',color:'var(--ink)',fontWeight:800}}>Staff account lifecycle</Link><span style={{padding:'8px 11px',borderRadius:999,background:'var(--soft)',fontWeight:800,fontSize:12}}>{activeStaff.length} active staff</span></div></div>
    {error && <div role="alert" className="card" style={{marginTop:18,padding:14,color:'#8a2323'}}>{error}</div>}

    {workforceReadiness && <section style={{marginTop:24}}><div className="card" style={{padding:20}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:'.08em',color:'var(--accent)'}}>WORKFORCE ACCEPTANCE</div><h2 style={{margin:'6px 0 4px'}}>Operational readiness</h2><div style={{color:'var(--muted)'}}>One view of assignment, attendance, timesheet, leave and payroll exceptions.</div></div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}><span style={{padding:'7px 10px',borderRadius:999,background:'#e8f7ee',color:'#166534',fontSize:12,fontWeight:800}}>{workforceReadiness.summary.ready} ready</span><span style={{padding:'7px 10px',borderRadius:999,background:'#fff4e5',color:'#9a3412',fontSize:12,fontWeight:800}}>{workforceReadiness.summary.attention} attention</span><span style={{padding:'7px 10px',borderRadius:999,background:'#fdecec',color:'#991b1b',fontSize:12,fontWeight:800}}>{workforceReadiness.summary.blocked} blocked</span></div></div><div style={{display:'grid',gap:8,marginTop:14}}>{workforceReadiness.staff.filter(row=>row.readiness.overall!=='ready').slice(0,8).map(row=><div key={row.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'10px 0',borderTop:'1px solid var(--line)',flexWrap:'wrap'}}><div><Link href={`/admin/workforce/${encodeURIComponent(row.id)}`} style={{fontWeight:850,color:'var(--ink)',textDecoration:'none'}}>{row.full_name}</Link><div style={{color:'var(--muted)',fontSize:12}}>{row.employee_number} · {row.job_title}</div></div><div style={{fontSize:12,fontWeight:800,color:row.readiness.overall==='blocked'?'#991b1b':'#9a3412',maxWidth:620}}>{row.readiness.nextAction||row.readiness.overall}</div></div>)}{!workforceReadiness.staff.some(row=>row.readiness.overall!=='ready')&&<div style={{color:'var(--muted)',padding:'12px 0'}}>No active staff have operational exceptions.</div>}</div></div></section>}

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginTop:24}}>
      <article className="card" style={{padding:20}}><h2 style={{marginTop:0}}>Create assignment</h2><form onSubmit={addAssignment} style={{display:'grid',gap:10}}>
        <select value={selectedStaff} onChange={e=>setSelectedStaff(e.target.value)} required style={{padding:11,border:'1px solid var(--line)',borderRadius:9}}><option value="">Select active staff</option>{activeStaff.map(s=><option key={s.id} value={s.id}>{s.full_name} · {s.job_title}</option>)}</select>
        <input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client / service user (optional)" style={{padding:11,border:'1px solid var(--line)',borderRadius:9}} />
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location" required style={{padding:11,border:'1px solid var(--line)',borderRadius:9}} />
        <label style={{fontSize:12,color:'var(--muted)'}}>Start<input type="datetime-local" value={scheduledStart} onChange={e=>setScheduledStart(e.target.value)} required style={{width:'100%',marginTop:4,padding:10,border:'1px solid var(--line)',borderRadius:9}}/></label>
        <label style={{fontSize:12,color:'var(--muted)'}}>End<input type="datetime-local" value={scheduledEnd} onChange={e=>setScheduledEnd(e.target.value)} required style={{width:'100%',marginTop:4,padding:10,border:'1px solid var(--line)',borderRadius:9}}/></label>
        <button disabled={busy} style={{padding:11,border:0,borderRadius:9,fontWeight:800,cursor:'pointer'}}>Schedule shift</button>
      </form></article>
      <article className="card" style={{padding:20}}><h2 style={{marginTop:0}}>Approval queue</h2><div style={{fontSize:30,fontWeight:900}}>{pendingTimesheets.length}</div><div style={{color:'var(--muted)'}}>timesheets awaiting review</div><div style={{fontSize:30,fontWeight:900,marginTop:16}}>{pendingLeave.length}</div><div style={{color:'var(--muted)'}}>leave requests awaiting review</div></article>
    </section>

    <section style={{marginTop:28}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><h2>Staff</h2><Link href="/admin/workforce" style={{fontSize:13,color:'var(--muted)'}}>Directory</Link></div><div style={{display:'grid',gap:10}}>{staff.map(s=><article className="card" key={s.id} style={{padding:16,display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap',alignItems:'center'}}><div><Link href={`/admin/workforce/${encodeURIComponent(s.id)}`} style={{fontSize:16,fontWeight:850,color:'var(--ink)',textDecoration:'none'}}>{s.full_name}</Link><div style={{color:'var(--muted)',fontSize:13}}>{s.employee_number} · {s.job_title} · {s.location||'Location not set'}</div></div><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{padding:'6px 9px',borderRadius:999,background:'var(--soft)',fontSize:12,fontWeight:800}}>{s.employment_status}</span>{s.employment_status==='pending'&&<Link href="/admin/workforce/staff-account" style={{padding:'7px 10px',border:'1px solid var(--line)',borderRadius:8,textDecoration:'none',fontWeight:800}}>Manage account</Link>}{s.employment_status==='active'&&<><button disabled={busy} onClick={()=>{const reason=window.prompt('Reason for suspending this staff member?')?.trim()||'';if(reason)void updateStaff(s.id,'suspended',undefined,reason)}} style={{padding:'7px 10px'}}>Suspend</button><button disabled={busy} onClick={()=>{const reason=window.prompt('Reason for marking this staff member as a leaver?')?.trim()||'';if(reason)void updateStaff(s.id,'leaver',new Date().toISOString().slice(0,10),reason)}} style={{padding:'7px 10px'}}>Mark leaver</button></>}{s.employment_status==='suspended'&&<button disabled={busy} onClick={()=>{const reason=window.prompt('Reason for reactivating this staff member?')?.trim()||'';if(reason)void updateStaff(s.id,'active',undefined,reason)}} style={{padding:'7px 10px'}}>Reactivate</button>}</div></article>)}</div></section>

    <section style={{marginTop:28}}><h2>Assignments</h2><div style={{display:'grid',gap:10}}>{assignments.map(a=><article className="card" key={a.id} style={{padding:16}}><div style={{display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}><div><strong>{a.staff_profiles?.full_name||a.staff_id}</strong><div style={{color:'var(--muted)',fontSize:13}}>{a.location} · {a.client_name||'No client'} · {new Date(a.scheduled_start).toLocaleString()} to {new Date(a.scheduled_end).toLocaleTimeString()}</div></div><div style={{display:'flex',gap:7,alignItems:'center'}}><span style={{padding:'6px 9px',borderRadius:999,background:'var(--soft)',fontSize:12,fontWeight:800}}>{a.status}</span>{a.status==='scheduled'&&<button disabled={busy} onClick={()=>void patch('/api/admin/workforce/assignments',a.id,{status:'confirmed'})}>Confirm</button>}{(a.status==='scheduled'||a.status==='confirmed')&&<button disabled={busy} onClick={()=>void patch('/api/admin/workforce/assignments',a.id,{status:'cancelled'})}>Cancel</button>}</div></div></article>)}</div></section>

    <section style={{marginTop:28}}><h2>Timesheet review</h2><div style={{display:'grid',gap:10}}>{pendingTimesheets.map(t=><article className="card" key={t.id} style={{padding:16,display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><div><strong>{t.staff_profiles?.full_name||'Staff'}</strong><div style={{color:'var(--muted)',fontSize:13}}>{t.work_date} · {t.total_hours??0} hours</div></div><div style={{display:'flex',gap:8}}><button disabled={busy} onClick={()=>void patch('/api/admin/workforce/timesheets',t.id,{status:'approved'})}>Approve</button><button disabled={busy} onClick={()=>void patch('/api/admin/workforce/timesheets',t.id,{status:'rejected',note:'Rejected in workforce operations'})}>Reject</button></div></article>)}</div></section>

    <section style={{marginTop:28}}><h2>Leave review</h2><div style={{display:'grid',gap:10}}>{pendingLeave.map(l=><article className="card" key={l.id} style={{padding:16,display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><div><strong>{l.staff_profiles?.full_name||'Staff'}</strong><div style={{color:'var(--muted)',fontSize:13}}>{l.leave_type} · {l.start_date} to {l.end_date} · {l.total_days} day{l.total_days===1?'':'s'}</div></div><div style={{display:'flex',gap:8}}><button disabled={busy} onClick={()=>void patch('/api/admin/workforce/leave',l.id,{status:'approved',reviewNote:'Approved in workforce operations'})}>Approve</button><button disabled={busy} onClick={()=>void patch('/api/admin/workforce/leave',l.id,{status:'rejected',reviewNote:'Rejected in workforce operations'})}>Reject</button></div></article>)}</div></section>
  </main>;
}
