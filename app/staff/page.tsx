'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Staff = { laurem_id:string|null; employee_number:string; full_name:string; email:string; phone:string|null; job_title:string; employment_status:string; start_date:string|null; location:string|null; portal_address:string|null };
type Shift = { id:string; client_name:string|null; location:string; scheduled_start:string; scheduled_end:string; status:string; notes:string|null };
type Timesheet = { id:string; assignment_id:string|null; work_date:string; clock_in:string|null; clock_out:string|null; total_hours:number|null; status:string; notes:string|null };
type LeaveRequest = { id:string; leave_type:string; start_date:string; end_date:string; total_days:number; reason:string|null; status:string; review_note:string|null };
type MessageSummary = { id:string; subject:string|null; updated_at:string|null; latest_message?:{body:string|null;created_at:string|null;sender_name:string|null} };
type OnboardingTask = { id:string; title:string; required:boolean; status:string; acknowledgement_required:boolean; acknowledged_at:string|null };
type Onboarding = { title:string; status:string; tasks:OnboardingTask[] };

const shell: React.CSSProperties = { minHeight:'100vh', background:'#f4f7fb', color:'#102a43', fontFamily:'system-ui', padding:'24px 18px 60px' };
const card: React.CSSProperties = { background:'#fff', border:'1px solid #e5eaf0', borderRadius:16, padding:20 };
const muted: React.CSSProperties = { color:'#627d98' };
const btn = (primary=false): React.CSSProperties => ({ border:primary?'0':'1px solid #dbe5ea', background:primary?'#102a43':'#fff', color:primary?'#fff':'#102a43', borderRadius:10, padding:'10px 13px', fontWeight:800, cursor:'pointer', textDecoration:'none' });

function fmtDate(value:string|null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{dateStyle:'medium'}) : 'Not set'; }
function fmtDateTime(value:string|null) { return value ? new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}) : 'Not set'; }
function statusPill(value:string) { return <span style={{padding:'6px 9px',borderRadius:999,background:'#edf2f7',fontSize:12,fontWeight:800}}>{value.replaceAll('_',' ')}</span>; }

export default function StaffPortalHome() {
  const router = useRouter();
  const [staff,setStaff] = useState<Staff|null>(null);
  const [shifts,setShifts] = useState<Shift[]>([]);
  const [timesheets,setTimesheets] = useState<Timesheet[]>([]);
  const [leave,setLeave] = useState<LeaveRequest[]>([]);
  const [messages,setMessages] = useState<MessageSummary[]>([]);
  const [onboarding,setOnboarding] = useState<Onboarding|null>(null);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState('');
  const [leaveType,setLeaveType] = useState('Annual Leave');
  const [leaveStart,setLeaveStart] = useState('');
  const [leaveEnd,setLeaveEnd] = useState('');
  const [leaveReason,setLeaveReason] = useState('');
  const [submittingLeave,setSubmittingLeave] = useState(false);
  const [loggingOut,setLoggingOut] = useState(false);

  async function load(showSpinner=true) {
    if(showSpinner) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const [me,shiftRes,timesheetRes,leaveRes,messageRes,onboardingRes] = await Promise.all([
        fetch('/api/staff/me',{cache:'no-store'}),
        fetch('/api/staff/shifts',{cache:'no-store'}),
        fetch('/api/staff/timesheets',{cache:'no-store'}),
        fetch('/api/staff/leave',{cache:'no-store'}),
        fetch('/api/staff/messages',{cache:'no-store'}),
        fetch('/api/staff/onboarding',{cache:'no-store'}),
      ]);
      if(me.status===401 || [shiftRes,timesheetRes,leaveRes,messageRes,onboardingRes].some(r=>r.status===401)){ router.replace('/staff/login'); return; }
      const [meBody,shiftBody,timesheetBody,leaveBody,messageBody,onboardingBody] = await Promise.all([me.json(),shiftRes.json(),timesheetRes.json(),leaveRes.json(),messageRes.json(),onboardingRes.json()]);
      if(!me.ok) throw new Error(meBody.error||'Unable to load staff profile.');
      if(!shiftRes.ok || !timesheetRes.ok || !leaveRes.ok || !messageRes.ok || !onboardingRes.ok) throw new Error(shiftBody.error||timesheetBody.error||leaveBody.error||messageBody.error||onboardingBody.error||'Unable to load the staff dashboard.');
      setStaff(meBody.staff); setShifts(shiftBody.shifts||[]); setTimesheets(timesheetBody.timesheets||[]); setLeave(leaveBody.requests||[]); setMessages(messageBody.conversations||[]);
      setOnboarding(onboardingBody.package ? { title:onboardingBody.package.title, status:onboardingBody.package.status, tasks:onboardingBody.tasks||[] } : null);
    } catch(e) { setError(e instanceof Error?e.message:'Unable to load the staff dashboard.'); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(()=>{ void load(); },[]);

  async function logout() {
    setLoggingOut(true);
    try { await fetch('/api/staff/auth/logout',{method:'POST'}); } finally { router.replace('/staff/login'); }
  }

  async function submitLeave(event:React.FormEvent) {
    event.preventDefault();
    setSubmittingLeave(true); setError('');
    try {
      const response=await fetch('/api/staff/leave',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({leaveType,startDate:leaveStart,endDate:leaveEnd,reason:leaveReason})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to submit leave request.');
      setLeaveStart(''); setLeaveEnd(''); setLeaveReason(''); await load(false);
    } catch(e){ setError(e instanceof Error?e.message:'Unable to submit leave request.'); }
    finally { setSubmittingLeave(false); }
  }

  const metrics = useMemo(()=>({
    upcoming:shifts.filter(s=>['scheduled','confirmed'].includes(s.status)).length,
    submitted:timesheets.filter(t=>t.status==='submitted').length,
    approvedHours:timesheets.filter(t=>['approved','paid'].includes(t.status)).reduce((sum,t)=>sum+(Number(t.total_hours)||0),0),
    pendingLeave:leave.filter(r=>r.status==='pending').length,
  }),[shifts,timesheets,leave]);

  const onboardingProgress = useMemo(()=>{
    const required = onboarding?.tasks.filter(task=>task.required) || [];
    const done = required.filter(task=>(task.status==='completed'||task.status==='waived') && (!task.acknowledgement_required || Boolean(task.acknowledged_at))).length;
    return required.length ? Math.round((done/required.length)*100) : onboarding ? 100 : 0;
  },[onboarding]);

  if(loading || !staff) return <main style={shell}><div style={{maxWidth:1160,margin:'0 auto'}}><div style={card}><strong>LAUREM STAFF PORTAL</strong><p style={muted}>Loading your workspace…</p></div></div></main>;

  return <main style={shell}><div style={{maxWidth:1160,margin:'0 auto'}}>
    <header style={{...card,display:'flex',justifyContent:'space-between',gap:18,alignItems:'flex-start',flexWrap:'wrap'}}>
      <div><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>LAUREM CARE · STAFF PORTAL</div><h1 style={{margin:'8px 0 5px',fontSize:34}}>Welcome, {staff.full_name}</h1><div style={muted}>{staff.job_title} · {staff.location||'Location not set'} · LAUREM ID {staff.laurem_id||staff.employee_number}</div></div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>{statusPill(staff.employment_status)}<button disabled={refreshing} onClick={()=>void load(false)} style={btn()}>{refreshing?'Refreshing…':'Refresh'}</button><button disabled={loggingOut} onClick={()=>void logout()} style={btn()}>{loggingOut?'Signing out…':'Sign out'}</button></div>
    </header>

    {error&&<div role="alert" style={{...card,marginTop:14,color:'#b42318'}}>{error}</div>}

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginTop:14}}>
      <Metric label="Upcoming shifts" value={metrics.upcoming}/><Metric label="Timesheets submitted" value={metrics.submitted}/><Metric label="Approved hours" value={metrics.approvedHours.toFixed(2)}/><Metric label="Pending leave" value={metrics.pendingLeave}/>
    </section>

    {onboarding && <section style={{...card,marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:'.08em',color:'#0f766e'}}>ONBOARDING</div><h2 style={{margin:'5px 0 4px'}}>{onboarding.title}</h2><div style={muted}>{onboardingProgress}% of required items fully complete · {statusPill(onboarding.status)}</div></div><button onClick={()=>router.push('/staff/onboarding')} style={btn(true)}>Open onboarding</button></div><div style={{height:10,background:'#edf2f7',borderRadius:99,overflow:'hidden',marginTop:15}}><div style={{width:`${onboardingProgress}%`,height:'100%',background:'#102a43'}}/></div><div style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:10,fontSize:12}}><span style={muted}>{onboarding.tasks.filter(t=>t.required&&t.status!=='completed'&&t.status!=='waived').length} required items still open</span><span style={muted}>{onboarding.tasks.filter(t=>t.required&&t.acknowledgement_required&&!t.acknowledged_at).length} acknowledgements pending</span></div></section>}

    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(290px,.9fr)',gap:14,marginTop:14}}>
      <article style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><h2 style={{margin:'0 0 4px'}}>Next shift</h2><div style={muted}>Your nearest scheduled assignment</div></div><button onClick={()=>router.push('/staff/shifts')} style={btn()}>View shifts</button></div>{shifts[0]?<div style={{marginTop:18,padding:16,borderRadius:12,background:'#f7fafc'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{shifts[0].client_name||'LAUREM Assignment'}</strong>{statusPill(shifts[0].status)}</div><div style={{marginTop:7}}>{shifts[0].location}</div><div style={{...muted,marginTop:5}}>{fmtDateTime(shifts[0].scheduled_start)} → {fmtDateTime(shifts[0].scheduled_end)}</div>{shifts[0].notes&&<p style={{...muted,whiteSpace:'pre-wrap'}}>{shifts[0].notes}</p>}</div>:<Empty text="No upcoming shifts are currently scheduled."/>}</article>
      <article style={card}><h2 style={{margin:'0 0 4px'}}>Quick access</h2><div style={{...muted,marginBottom:14}}>Everything you use most often.</div><div style={{display:'grid',gap:9}}>{[['Onboarding','/staff/onboarding'],['Visa & Sponsorship','/staff/visa-sponsorship'],['Messages','/staff/messages'],['Timesheets','/staff/timesheets'],['Documents','/staff/documents'],['My Shifts','/staff/shifts']].map(([label,path])=><button key={path} onClick={()=>router.push(path)} style={{...btn(),textAlign:'left'}}>{label}<span style={{float:'right'}}>→</span></button>)}</div></article>
    </section>

    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(300px,.9fr)',gap:14,marginTop:14}}>
      <article style={card}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><h2 style={{margin:'0 0 4px'}}>Timesheets</h2><div style={muted}>Latest submissions and approvals</div></div><button onClick={()=>router.push('/staff/timesheets')} style={btn()}>Manage</button></div><div style={{display:'grid',gap:9,marginTop:15}}>{timesheets.slice(0,5).map(t=><div key={t.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'12px 0',borderTop:'1px solid #edf2f7'}}><div><strong>{fmtDate(t.work_date)}</strong><div style={muted}>{Number(t.total_hours||0).toFixed(2)} hours</div></div>{statusPill(t.status)}</div>)}{!timesheets.length&&<Empty text="No timesheets have been submitted yet."/>}</div></article>
      <article style={card}><h2 style={{margin:'0 0 4px'}}>My leave</h2><div style={muted}>Request time away and track decisions.</div><form onSubmit={submitLeave} style={{display:'grid',gap:9,marginTop:14}}><select value={leaveType} onChange={e=>setLeaveType(e.target.value)} style={input}><option>Annual Leave</option><option>Sick Leave</option><option>Emergency Leave</option><option>Other</option></select><input type="date" value={leaveStart} onChange={e=>setLeaveStart(e.target.value)} required style={input}/><input type="date" value={leaveEnd} onChange={e=>setLeaveEnd(e.target.value)} required style={input}/><textarea value={leaveReason} onChange={e=>setLeaveReason(e.target.value)} placeholder="Reason or additional context (optional)" rows={3} maxLength={2000} style={{...input,resize:'vertical'}}/><button disabled={submittingLeave} style={btn(true)}>{submittingLeave?'Submitting…':'Request leave'}</button></form><div style={{marginTop:16}}>{leave.slice(0,3).map(r=><div key={r.id} style={{padding:'10px 0',borderTop:'1px solid #edf2f7'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong>{r.leave_type}</strong>{statusPill(r.status)}</div><div style={{...muted,fontSize:13,marginTop:3}}>{fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {r.total_days} day{r.total_days===1?'':'s'}</div></div>)}</div></article>
    </section>

    <section style={{...card,marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><h2 style={{margin:'0 0 4px'}}>Recent messages</h2><div style={muted}>Internal communication</div></div><button onClick={()=>router.push('/staff/messages')} style={btn()}>Open messages</button></div><div style={{display:'grid',gap:8,marginTop:13}}>{messages.slice(0,4).map((m)=><div key={m.id} style={{padding:'11px 0',borderTop:'1px solid #edf2f7'}}><strong>{m.subject||'Conversation'}</strong>{m.latest_message?.body&&<div style={{...muted,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.latest_message.body}</div>}</div>)}{!messages.length&&<Empty text="No internal conversations yet."/>}</div></section>

    <section style={{...card,marginTop:14}}><div><h2 style={{margin:'0 0 5px'}}>Employment record</h2><div style={muted}>Basic details linked to your LAUREM staff identity.</div></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginTop:15}}><Info label="Email" value={staff.email}/><Info label="Phone" value={staff.phone||'Not set'}/><Info label="Start date" value={fmtDate(staff.start_date)}/><Info label="Internal address" value={staff.portal_address||'Provisioning…'}/></div></section>
  </div></main>;
}

function Metric({label,value}:{label:string;value:string|number}) { return <article style={card}><div style={{fontSize:27,fontWeight:900}}>{value}</div><div style={{...muted,fontSize:12,marginTop:3}}>{label}</div></article>; }
function Info({label,value}:{label:string;value:string}) { return <div><div style={{...muted,fontSize:12}}>{label}</div><strong style={{display:'block',marginTop:4,overflowWrap:'anywhere'}}>{value}</strong></div>; }
function Empty({text}:{text:string}) { return <div style={{...muted,padding:'14px 0'}}>{text}</div>; }
const input:React.CSSProperties={border:'1px solid #dbe5ea',borderRadius:10,padding:'10px 11px',font:'inherit',width:'100%',boxSizing:'border-box'};
