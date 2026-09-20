'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Staff = { laurem_id:string|null; employee_number:string; full_name:string; email:string; phone:string|null; job_title:string; employment_status:string; start_date:string|null; location:string|null; portal_address:string|null; address_line_1:string|null; city:string|null; postcode:string|null; country:string|null; profile_photo_path:string|null; profile_photo_url?:string|null };
type Shift = { id:string; client_name:string|null; location:string; scheduled_start:string; scheduled_end:string; status:string; notes:string|null };
type Timesheet = { id:string; assignment_id:string|null; work_date:string; clock_in:string|null; clock_out:string|null; total_hours:number|null; status:string; notes:string|null };
type LeaveRequest = { id:string; leave_type:string; start_date:string; end_date:string; total_days:number; reason:string|null; status:string; review_note:string|null };
type MessageSummary = { id:string; subject:string|null; updated_at:string|null; latest_message?:{body:string|null;created_at:string|null;sender_name:string|null} };
type OnboardingTask = { id:string; title:string; required:boolean; status:string; acknowledgement_required:boolean; acknowledged_at:string|null };
type Onboarding = { title:string; status:string; tasks:OnboardingTask[] };
type NotificationSummary = { id:string; title:string; body:string; read_at:string|null; action_url:string|null; created_at:string };
type StaffDocument = { id:string; title:string; signature_status:string; category:string; issued_at:string };
type AvailabilitySummary = { id:string; effective_from:string; full_time:boolean; part_time:boolean; days:boolean; nights:boolean; weekends:boolean; notes:string|null };
type WorkforceReadiness = { overall:'ready'|'attention'|'blocked'; nextAction:string|null; lanes:{key:string;level:'ready'|'attention'|'blocked';label:string;detail:string;count:number}[] };
type PayrollEntry = { id:string; payroll_period_id:string; approved_hours:number|null; hourly_rate:number|null; gross_amount:number|null; status:string; notes:string|null; created_at:string; updated_at:string; payroll_periods?:{period_start:string;period_end:string;pay_date:string|null;status:string}|null };
type OperationalState = { level:'clear'|'active'|'attention'|'blocked'; status:string; label:string; detail:string; currentAssignmentId:string|null; upcomingAssignmentId:string|null; openAttendanceTimesheetId:string|null; counts:{upcomingAssignments:number;pendingTimesheets:number;rejectedTimesheets:number;pendingLeave:number;openPayrollEntries:number} };

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
  const [notifications,setNotifications] = useState<NotificationSummary[]>([]);
  const [documents,setDocuments] = useState<StaffDocument[]>([]);
  const [availability,setAvailability] = useState<AvailabilitySummary|null>(null);
  const [workforceReadiness,setWorkforceReadiness] = useState<WorkforceReadiness|null>(null);
  const [operationalState,setOperationalState] = useState<OperationalState|null>(null);
  const [payroll,setPayroll] = useState<PayrollEntry[]>([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState('');
  const [leaveType,setLeaveType] = useState('Annual Leave');
  const [leaveStart,setLeaveStart] = useState('');
  const [leaveEnd,setLeaveEnd] = useState('');
  const [leaveReason,setLeaveReason] = useState('');
  const [submittingLeave,setSubmittingLeave] = useState(false);
  const [loggingOut,setLoggingOut] = useState(false);
  const [photoFailed,setPhotoFailed] = useState(false);

  async function load(showSpinner=true) {
    if(showSpinner) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/staff/workforce-dashboard',{cache:'no-store'});
      if(response.status===401){ router.replace('/staff/login'); return; }
      const body = await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to load the staff dashboard.');

      setStaff(body.staff);
      setPhotoFailed(false);
      setShifts(body.shifts||[]);
      setTimesheets(body.timesheets||[]);
      setLeave(body.leave||[]);
      setMessages(body.messages||[]);
      setNotifications(body.notifications||[]);
      setDocuments(body.documents||[]);
      setAvailability(body.availability||null);
      setWorkforceReadiness(body.readiness||null);
      setOperationalState(body.operationalState||null);
      setPayroll(body.payroll?.entries||[]);
      setOnboarding(body.onboarding ? { title:String(body.onboarding.package?.title||'Onboarding'), status:String(body.onboarding.package?.status||'active'), tasks:body.onboarding.tasks||[] } : null);
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
    unreadMessages:messages.filter(m=>Boolean(m.latest_message?.created_at)).length,
    unreadNotifications:notifications.filter(n=>!n.read_at).length,
    openPayroll:payroll.filter(p=>!['paid','void'].includes(p.status)).length,
  }),[shifts,timesheets,leave,messages,notifications,payroll]);

  const readiness = useMemo(()=>{
    if(!staff) return { profile:0, availability:Boolean(availability), documents:documents.length>0, notifications:notifications.some(n=>!n.read_at) };
    const fields=[staff.phone,staff.address_line_1,staff.city,staff.postcode,staff.country,staff.profile_photo_path];
    return { profile:Math.round(fields.filter(Boolean).length/fields.length*100), availability:Boolean(availability), documents:documents.length>0, notifications:notifications.some(n=>!n.read_at) };
  },[staff,availability,documents,notifications]);

  const onboardingProgress = useMemo(()=>{
    const required = onboarding?.tasks.filter(task=>task.required) || [];
    const done = required.filter(task=>(task.status==='completed'||task.status==='waived') && (!task.acknowledgement_required || Boolean(task.acknowledged_at))).length;
    return required.length ? Math.round((done/required.length)*100) : onboarding ? 100 : 0;
  },[onboarding]);

  if(loading || !staff) return <main style={shell}><div style={{maxWidth:1160,margin:'0 auto'}}><div style={card}><strong>LAUREM STAFF PORTAL</strong><p style={muted}>Loading your workspace…</p></div></div></main>;

  return <main style={shell}><div style={{maxWidth:1160,margin:'0 auto'}}>
    <header style={{...card,display:'flex',justifyContent:'space-between',gap:18,alignItems:'center',flexWrap:'wrap'}}>
      <div style={{display:'flex',gap:14,alignItems:'center',minWidth:0}}>
        <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',background:'#e6fffb',display:'grid',placeItems:'center',flexShrink:0}}>
          {staff.profile_photo_url&&!photoFailed ? <img src={staff.profile_photo_url} alt='LAUREM staff photograph' onError={()=>setPhotoFailed(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontWeight:900,color:'#0f766e',fontSize:24}}>{staff.full_name.split(' ').map((part)=>part[0]).filter(Boolean).slice(0,2).join('').toUpperCase()}</span>}
        </div>
        <div><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>LAUREM CARE · STAFF PORTAL</div><h1 style={{margin:'8px 0 5px',fontSize:34}}>Welcome, {staff.full_name}</h1><div style={muted}>{staff.job_title} · {staff.location||'Location not set'} · LAUREM ID {staff.laurem_id||staff.employee_number}</div></div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>{statusPill(staff.employment_status)}<button disabled={refreshing} onClick={()=>void load(false)} style={btn()}>{refreshing?'Refreshing…':'Refresh'}</button><button disabled={loggingOut} onClick={()=>void logout()} style={btn()}>{loggingOut?'Signing out…':'Sign out'}</button></div>
    </header>

    {error&&<div role="alert" style={{...card,marginTop:14,color:'#b42318'}}>{error}</div>}

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginTop:14}}>
      <Metric label="Upcoming shifts" value={metrics.upcoming}/><Metric label="Timesheets submitted" value={metrics.submitted}/><Metric label="Approved hours" value={metrics.approvedHours.toFixed(2)}/><Metric label="Pending leave" value={metrics.pendingLeave}/><Metric label="Open payroll" value={metrics.openPayroll}/>
    </section>

    {workforceReadiness && <section style={{...card,marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:'.08em',color:'#0f766e'}}>OPERATIONS STATUS</div><h2 style={{margin:'5px 0 4px'}}>Workforce operations</h2><div style={muted}>{workforceReadiness.nextAction || 'No operational exceptions detected.'}</div></div><span style={{padding:'7px 10px',borderRadius:999,background:workforceReadiness.overall==='ready'?'#e8f7ee':workforceReadiness.overall==='attention'?'#fff4e5':'#fdecec',color:workforceReadiness.overall==='ready'?'#166534':workforceReadiness.overall==='attention'?'#9a3412':'#991b1b',fontSize:12,fontWeight:900}}>{workforceReadiness.overall.toUpperCase()}</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:9,marginTop:14}}>{workforceReadiness.lanes.map(lane=><div key={lane.key} style={{padding:12,border:'1px solid #e5eaf0',borderRadius:12}}><div style={{fontSize:12,fontWeight:900,color:'#0f766e'}}>{lane.label}</div><strong style={{display:'block',marginTop:4}}>{lane.level==='ready'?'Ready':lane.level==='attention'?'Needs attention':'Blocked'}</strong><div style={{...muted,fontSize:12,marginTop:4,lineHeight:1.45}}>{lane.detail}</div></div>)}</div></section>}

    {operationalState && <section style={{...card,marginTop:14,borderLeft:`5px solid ${operationalState.level==='blocked'?'#991b1b':operationalState.level==='attention'?'#9a3412':operationalState.level==='active'?'#166534':'#0f766e'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:12,fontWeight:900,letterSpacing:'.08em',color:'#0f766e'}}>TODAY'S WORKFORCE STATE</div>
          <h2 style={{margin:'5px 0 4px'}}>{operationalState.label}</h2>
          <div style={muted}>{operationalState.detail}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {operationalState.status==='on_shift' && <button onClick={()=>router.push('/staff/attendance')} style={btn(true)}>Open attendance</button>}
          {['awaiting_timesheet_review','timesheet_resubmission'].includes(operationalState.status) && <button onClick={()=>router.push('/staff/timesheets')} style={btn(true)}>Review timesheets</button>}
          {operationalState.status==='leave_pending' && <button onClick={()=>router.push('/staff/leave')} style={btn(true)}>View leave</button>}
          {operationalState.status==='payroll_open' && <button onClick={()=>router.push('/staff/payroll')} style={btn(true)}>View payroll</button>}
          {operationalState.status==='upcoming_shift' && <button onClick={()=>router.push('/staff/shifts')} style={btn(true)}>View next shift</button>}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginTop:14}}>
        <MiniMetric label="Upcoming" value={operationalState.counts.upcomingAssignments}/>
        <MiniMetric label="Pending timesheets" value={operationalState.counts.pendingTimesheets}/>
        <MiniMetric label="Rejected timesheets" value={operationalState.counts.rejectedTimesheets}/>
        <MiniMetric label="Pending leave" value={operationalState.counts.pendingLeave}/>
        <MiniMetric label="Open payroll" value={operationalState.counts.openPayrollEntries}/>
      </div>
    </section>}

    <section style={{...card,marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:'.08em',color:'#0f766e'}}>WORKFORCE READINESS</div><h2 style={{margin:'5px 0 4px'}}>Your staff record at a glance</h2><div style={muted}>Keep these four areas current so your Staff Portal stays complete and useful.</div></div><button onClick={()=>router.push('/staff/profile')} style={btn()}>Open profile</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginTop:15}}><ReadinessCard title='Profile' value={readiness.profile===100?'Complete':readiness.profile+'% complete'} text={readiness.profile===100?'Phone, address and photograph are present.':'Add missing contact/address/photo details.'} href='/staff/profile'/><ReadinessCard title='Availability' value={readiness.availability?'Recorded':'Not set'} text={readiness.availability?'Current work preferences are recorded.':'Tell LAUREM how you prefer to work.'} href='/staff/availability'/><ReadinessCard title='Documents' value={documents.length?documents.length+' issued':'None issued'} text={documents.some(d=>d.signature_status==='pending')?'A document needs your signature.':'Review your employment documents.'} href='/staff/documents'/><ReadinessCard title='Notifications' value={notifications.filter(n=>!n.read_at).length?notifications.filter(n=>!n.read_at).length+' unread':'All caught up'} text='Keep track of workforce updates and decisions.' href='/staff/notifications'/></div></section>

    {onboarding && <section style={{...card,marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:'.08em',color:'#0f766e'}}>ONBOARDING</div><h2 style={{margin:'5px 0 4px'}}>{onboarding.title}</h2><div style={muted}>{onboardingProgress}% of required items fully complete · {statusPill(onboarding.status)}</div></div><button onClick={()=>router.push('/staff/onboarding')} style={btn(true)}>Open onboarding</button></div><div style={{height:10,background:'#edf2f7',borderRadius:99,overflow:'hidden',marginTop:15}}><div style={{width:`${onboardingProgress}%`,height:'100%',background:'#102a43'}}/></div><div style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:10,fontSize:12}}><span style={muted}>{onboarding.tasks.filter(t=>t.required&&t.status!=='completed'&&t.status!=='waived').length} required items still open</span><span style={muted}>{onboarding.tasks.filter(t=>t.required&&t.acknowledgement_required&&!t.acknowledged_at).length} acknowledgements pending</span></div></section>}

    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(290px,.9fr)',gap:14,marginTop:14}}>
      <article style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><h2 style={{margin:'0 0 4px'}}>Next shift</h2><div style={muted}>Your nearest scheduled assignment</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={()=>router.push('/staff/shifts')} style={btn()}>View shifts</button><button onClick={()=>router.push('/staff/availability')} style={btn()}>Availability</button></div></div>{shifts[0]?<div style={{marginTop:18,padding:16,borderRadius:12,background:'#f7fafc'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{shifts[0].client_name||'LAUREM Assignment'}</strong>{statusPill(shifts[0].status)}</div><div style={{marginTop:7}}>{shifts[0].location}</div><div style={{...muted,marginTop:5}}>{fmtDateTime(shifts[0].scheduled_start)} → {fmtDateTime(shifts[0].scheduled_end)}</div>{shifts[0].notes&&<p style={{...muted,whiteSpace:'pre-wrap'}}>{shifts[0].notes}</p>}</div>:<Empty text="No upcoming shifts are currently scheduled."/>}</article>
      <article style={card}><h2 style={{margin:'0 0 4px'}}>Quick access</h2><div style={{...muted,marginBottom:14}}>Everything you use most often.</div><div style={{display:'grid',gap:9}}>{[['Onboarding','/staff/onboarding'],['Visa & Sponsorship','/staff/visa-sponsorship'],['Notifications',notifications.some(n=>!n.read_at)?'/staff/notifications · New':'/staff/notifications'],['Messages','/staff/messages'],['Attendance','/staff/attendance'],['Timesheets','/staff/timesheets'],['Payroll','/staff/payroll'],['My Profile','/staff/profile'],['Documents','/staff/documents'],['Availability & Preferences','/staff/availability'],['My Shifts','/staff/shifts']].map(([label,path])=><button key={path} onClick={()=>router.push(path)} style={{...btn(),textAlign:'left'}}>{label}<span style={{float:'right'}}>→</span></button>)}</div></article>
    </section>

    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(300px,.9fr)',gap:14,marginTop:14}}>
      <article style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><h2 style={{margin:'0 0 4px'}}>Payroll</h2><div style={muted}>Latest approved hours, rate and gross amount</div></div><button onClick={()=>router.push('/staff/payroll')} style={btn()}>Open payroll</button></div>{payroll[0]?<div style={{marginTop:15,padding:15,borderRadius:12,background:'#f7fafc'}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{payroll[0].approved_hours ?? 0} approved hours</strong>{statusPill(payroll[0].status)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginTop:10}}><Info label="Hourly rate" value={payroll[0].hourly_rate==null?'Not set':`£${Number(payroll[0].hourly_rate).toFixed(2)}`}/><Info label="Gross" value={payroll[0].gross_amount==null?'Not set':`£${Number(payroll[0].gross_amount).toFixed(2)}`}/><Info label="Pay date" value={payroll[0].payroll_periods?.pay_date ? fmtDate(payroll[0].payroll_periods.pay_date) : 'Not set'}/></div></div>:<Empty text="No payroll entry has been published yet."/>}</article>
      <article style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><h2 style={{margin:'0 0 4px'}}>Notifications</h2><div style={muted}>Latest decisions and workforce updates</div></div><button onClick={()=>router.push('/staff/notifications')} style={btn()}>View all</button></div><div style={{display:'grid',gap:9,marginTop:13}}>{notifications.slice(0,4).map(n=><button key={n.id} onClick={()=>router.push(n.action_url||'/staff/notifications')} style={{textAlign:'left',border:0,borderTop:'1px solid #edf2f7',background:'#fff',padding:'11px 0',cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong>{n.title}</strong>{!n.read_at&&<span style={{fontSize:10,fontWeight:900,color:'#b42318'}}>NEW</span>}</div><div style={{...muted,fontSize:12,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.body}</div></button>)}{!notifications.length&&<Empty text="No notifications yet."/>}</div></article>
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
function MiniMetric({label,value}:{label:string;value:string|number}) { return <div style={{padding:11,border:'1px solid #e5eaf0',borderRadius:10}}><div style={{fontSize:20,fontWeight:900}}>{value}</div><div style={{...muted,fontSize:11,marginTop:2}}>{label}</div></div>; }
function Info({label,value}:{label:string;value:string}) { return <div><div style={{...muted,fontSize:12}}>{label}</div><strong style={{display:'block',marginTop:4,overflowWrap:'anywhere'}}>{value}</strong></div>; }
function ReadinessCard({title,value,text,href}:{title:string;value:string;text:string;href:string}) { return <button onClick={()=>{window.location.href=href;}} style={{textAlign:'left',border:'1px solid #e5eaf0',background:'#fff',borderRadius:12,padding:14,cursor:'pointer'}}><div style={{fontSize:12,fontWeight:900,color:'#0f766e'}}>{title}</div><strong style={{display:'block',fontSize:18,marginTop:5}}>{value}</strong><div style={{...muted,fontSize:12,marginTop:5,lineHeight:1.45}}>{text}</div><div style={{marginTop:10,color:'#0f766e',fontSize:12,fontWeight:900}}>Open →</div></button>; }
function Empty({text}:{text:string}) { return <div style={{...muted,padding:'14px 0'}}>{text}</div>; }
const input:React.CSSProperties={border:'1px solid #dbe5ea',borderRadius:10,padding:'10px 11px',font:'inherit',width:'100%',boxSizing:'border-box'};
