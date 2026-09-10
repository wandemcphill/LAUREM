'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface Staff { id:string; full_name:string; employee_number:string; job_title:string; employment_status:string; location:string|null }
interface Assignment { id:string; staff_id:string; client_name:string|null; location:string; scheduled_start:string; scheduled_end:string; status:string; notes:string|null; staff_profiles?:{full_name:string;employee_number:string;job_title:string;employment_status:string} }

const card:React.CSSProperties={background:'#fff',border:'1px solid var(--line)',borderRadius:16};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'10px 11px',border:'1px solid var(--line)',borderRadius:9,font:'inherit',background:'#fff'};
const button=(primary=false):React.CSSProperties=>({border:primary?'0':'1px solid var(--line)',background:primary?'var(--ink)':'#fff',color:primary?'#fff':'var(--ink)',padding:'9px 12px',borderRadius:9,fontWeight:800,cursor:'pointer',textDecoration:'none'});

function mondayOf(value:Date){const d=new Date(value); const day=d.getDay(); const delta=day===0?-6:1-day; d.setDate(d.getDate()+delta); d.setHours(0,0,0,0); return d;}
function isoDate(d:Date){return d.toISOString().slice(0,10);}
function displayDate(d:Date){return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function displayTime(v:string){return new Date(v).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function daysBetween(start:string,end:string){const a=new Date(start).getTime();const b=new Date(end).getTime();return Math.max(1,Math.ceil((b-a)/86400000));}
function statusPill(value:string){return <span style={{padding:'5px 8px',borderRadius:999,background:'var(--soft)',fontSize:11,fontWeight:800,textTransform:'capitalize'}}>{value.replaceAll('_',' ')}</span>;}

export default function WorkforceSchedulePage(){
  const [staff,setStaff]=useState<Staff[]>([]);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [week,setWeek]=useState(()=>mondayOf(new Date()));
  const [selectedStaff,setSelectedStaff]=useState('');
  const [clientName,setClientName]=useState('');
  const [location,setLocation]=useState('');
  const [start,setStart]=useState('09:00');
  const [end,setEnd]=useState('17:00');
  const [selectedDay,setSelectedDay]=useState(isoDate(new Date()));
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(week);d.setDate(d.getDate()+i);return d;}),[week]);

  async function load(){
    setError('');
    try{
      const [s,a]=await Promise.all([fetch('/api/admin/workforce/staff?status=active',{cache:'no-store'}),fetch('/api/admin/workforce/assignments',{cache:'no-store'})]);
      if(s.status===401||a.status===401){setError('Your admin session has expired. Please sign in again.');return;}
      const [sp,ap]=await Promise.all([s.json(),a.json()]);
      if(!s.ok||!a.ok)throw new Error(sp.error||ap.error||'Unable to load schedule.');
      setStaff((sp.staff||[]).filter((row:Staff)=>row.employment_status==='active')); setAssignments(ap.assignments||[]);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load schedule.');}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const visibleAssignments=useMemo(()=>{const from=new Date(week);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+7);return assignments.filter(a=>new Date(a.scheduled_end)>from&&new Date(a.scheduled_start)<to);},[assignments,week]);
  const selectedDayAssignments=useMemo(()=>assignments.filter(a=>a.scheduled_start.slice(0,10)===selectedDay),[assignments,selectedDay]);

  function moveWeek(amount:number){const next=new Date(week);next.setDate(next.getDate()+amount*7);setWeek(next);setSelectedDay(isoDate(next));}

  async function createShift(event:FormEvent){
    event.preventDefault();
    if(!selectedStaff||!location)return;
    const startDate=new Date(`${selectedDay}T${start}`);const endDate=new Date(`${selectedDay}T${end}`);
    if(!Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime())||endDate<=startDate){setError('End time must be later than start time.');return;}
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/workforce/assignments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({staffId:selectedStaff,clientName,location,scheduledStart:startDate.toISOString(),scheduledEnd:endDate.toISOString()})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to schedule shift.');
      setClientName('');setLocation('');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to schedule shift.');}finally{setBusy(false);}
  }

  async function changeStatus(id:string,status:string){
    setBusy(true);setError('');
    try{const response=await fetch(`/api/admin/workforce/assignments?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to update assignment.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to update assignment.');}finally{setBusy(false);}
  }

  return <main className="wrap" style={{padding:'30px 0 80px',maxWidth:1250}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-end',flexWrap:'wrap'}}>
      <div><Link href="/admin/workforce" style={{color:'var(--muted)',textDecoration:'none'}}>← Workforce operations</Link><p style={{color:'var(--accent)',fontWeight:800,letterSpacing:'.08em',margin:'18px 0 5px'}}>WORKFORCE SCHEDULE</p><h1 style={{fontSize:40,margin:'0 0 5px'}}>Weekly operations board</h1><p style={{color:'var(--muted)',margin:0}}>Plan active staff coverage, spot clashes and move shifts through the existing assignment lifecycle.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link href="/admin/workforce" style={button()}>Operations dashboard</Link><button onClick={()=>moveWeek(-1)} style={button()}>← Week</button><button onClick={()=>{setWeek(mondayOf(new Date()));setSelectedDay(isoDate(new Date()));}} style={button()}>Today</button><button onClick={()=>moveWeek(1)} style={button()}>Week →</button></div>
    </div>
    {error&&<div role="alert" className="card" style={{padding:14,marginTop:16,color:'#8a2323'}}>{error}</div>}

    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 330px',gap:16,marginTop:20,alignItems:'start'}}>
      <article style={{...card,overflow:'hidden'}}>
        <div style={{padding:16,borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{displayDate(days[0])} → {displayDate(days[6])}</strong><div style={{color:'var(--muted)',fontSize:12,marginTop:3}}>{visibleAssignments.length} assignment{visibleAssignments.length===1?'':'s'} in this week</div></div></div>
        {loading?<div style={{padding:24}}>Loading schedule…</div>:<div style={{display:'grid',gridTemplateColumns:'minmax(170px,.65fr) repeat(7,minmax(120px,1fr))',minWidth:1020,overflowX:'auto'}}>
          <div style={headCell}>Staff</div>{days.map(day=><button key={isoDate(day)} onClick={()=>setSelectedDay(isoDate(day))} style={{...headCell,textAlign:'left',border:0,cursor:'pointer',background:selectedDay===isoDate(day)?'var(--soft)':'#fff'}}>{displayDate(day)}</button>)}
          {staff.map(person=><div key={person.id} style={{display:'contents'}}><div style={{...cell,background:'#fbfcfd'}}><strong>{person.full_name}</strong><span style={{display:'block',color:'var(--muted)',fontSize:11,marginTop:3}}>{person.job_title}</span></div>{days.map(day=>{const date=isoDate(day);const shifts=visibleAssignments.filter(a=>a.staff_id===person.id&&a.scheduled_start.slice(0,10)===date);return <div key={`${person.id}-${date}`} style={{...cell,minHeight:104,cursor:'pointer'}} onClick={()=>{setSelectedStaff(person.id);setSelectedDay(date);}}>{shifts.map(a=><div key={a.id} style={{border:'1px solid var(--line)',borderRadius:10,padding:9,background:a.status==='cancelled'?'#fafafa':'var(--soft)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',gap:5}}><strong style={{fontSize:12}}>{a.client_name||'Assignment'}</strong>{statusPill(a.status)}</div><div style={{fontSize:11,marginTop:5}}>{displayTime(a.scheduled_start)} → {displayTime(a.scheduled_end)}</div><div style={{color:'var(--muted)',fontSize:11,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.location}</div></div>)}</div>;})}</div>)}
          {!staff.length&&<div style={{gridColumn:'1/-1',padding:28,color:'var(--muted)'}}>No active staff are currently available for scheduling.</div>}
        </div>}
      </article>

      <aside style={{display:'grid',gap:14}}>
        <article className="card" style={{padding:18}}><h2 style={{margin:'0 0 5px'}}>Schedule a shift</h2><p style={{color:'var(--muted)',fontSize:13,marginTop:0}}>New shifts go through the same server-side conflict checks as the main workforce workspace.</p><form onSubmit={createShift} style={{display:'grid',gap:10}}><select required value={selectedStaff} onChange={e=>setSelectedStaff(e.target.value)} style={input}><option value="">Select active staff</option>{staff.map(person=><option key={person.id} value={person.id}>{person.full_name} · {person.job_title}</option>)}</select><input type="date" required value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} style={input}/><input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client / service user" style={input}/><input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location" style={input}/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><label style={{fontSize:12,color:'var(--muted)'}}>Start<input type="time" value={start} onChange={e=>setStart(e.target.value)} style={{...input,marginTop:4}}/></label><label style={{fontSize:12,color:'var(--muted)'}}>End<input type="time" value={end} onChange={e=>setEnd(e.target.value)} style={{...input,marginTop:4}}/></label></div><button disabled={busy} style={button(true)}>{busy?'Saving…':'Schedule shift'}</button></form></article>
        <article className="card" style={{padding:18}}><h2 style={{margin:'0 0 5px'}}>Selected day</h2><div style={{color:'var(--muted)',fontSize:13,marginBottom:12}}>{new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-GB',{dateStyle:'full'})}</div><div style={{display:'grid',gap:8}}>{selectedDayAssignments.map(a=><div key={a.id} style={{padding:11,border:'1px solid var(--line)',borderRadius:10}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong>{a.staff_profiles?.full_name||a.staff_id}</strong>{statusPill(a.status)}</div><div style={{fontSize:12,marginTop:4}}>{displayTime(a.scheduled_start)} → {displayTime(a.scheduled_end)} · {a.location}</div>{a.status==='scheduled'&&<button disabled={busy} onClick={()=>void changeStatus(a.id,'confirmed')} style={{...button(),marginTop:8,fontSize:12}}>Confirm</button>}{(a.status==='scheduled'||a.status==='confirmed')&&<button disabled={busy} onClick={()=>void changeStatus(a.id,'cancelled')} style={{...button(),marginTop:8,marginLeft:6,fontSize:12}}>Cancel</button>}</div>)}{!selectedDayAssignments.length&&<div style={{color:'var(--muted)',fontSize:13}}>No assignments on this day.</div>}</div></article>
      </aside>
    </section>
  </main>;
}

const headCell:React.CSSProperties={padding:'12px 10px',borderBottom:'1px solid var(--line)',borderRight:'1px solid var(--line)',fontSize:12,fontWeight:900};
const cell:React.CSSProperties={padding:9,borderBottom:'1px solid var(--line)',borderRight:'1px solid var(--line)',minWidth:0};
