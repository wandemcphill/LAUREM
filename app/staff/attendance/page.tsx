'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Shift = { id:string; client_name:string|null; location:string; scheduled_start:string; scheduled_end:string; status:string; notes:string|null };
type Attendance = { id:string; assignment_id:string|null; work_date:string; clock_in:string|null; clock_out:string|null; break_minutes:number; total_hours:number|null; status:string; notes:string|null; };

const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20};
const muted:React.CSSProperties={color:'#627d98'};
function fmtDate(value:string){return new Date(value).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}
function fmtDateTime(value:string|null){return value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';}
function duration(row:Attendance){if(!row.clock_in||!row.clock_out)return 'Open'; const mins=Math.max(0,Math.round((new Date(row.clock_out).getTime()-new Date(row.clock_in).getTime())/60000)-Number(row.break_minutes||0)); return Math.floor(mins/60)+'h '+(mins%60)+'m';}

export default function StaffAttendancePage(){
  const router=useRouter();
  const [shifts,setShifts]=useState<Shift[]>([]);
  const [rows,setRows]=useState<Attendance[]>([]);
  const [breakMinutes,setBreakMinutes]=useState('30');
  const [notes,setNotes]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  async function load(){
    setError('');
    const response=await fetch('/api/staff/attendance',{cache:'no-store'});
    if(response.status===401){router.replace('/staff/login');return;}
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(body.error||'Unable to load attendance.');return;}
    setShifts(body.shifts||[]);setRows(body.attendance||[]);
  }
  useEffect(()=>{void load();},[router]);
  async function act(assignmentId:string,action:'clock_in'|'clock_out'){
    setBusy(action+assignmentId);setError('');
    const response=await fetch('/api/staff/attendance',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,assignmentId,breakMinutes:action==='clock_out'?Number(breakMinutes||0):undefined,notes:action==='clock_out'?notes:undefined})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(body.error||'Attendance action failed.');setBusy('');return;}
    setNotes('');await load();setBusy('');
  }
  const open=useMemo(()=>rows.find(r=>r.clock_in&&!r.clock_out),[rows]);
  return <main style={{minHeight:'100vh',background:'#f4f7fb',fontFamily:'system-ui',color:'#102a43',padding:'28px 18px 60px'}}><div style={{maxWidth:1120,margin:'0 auto'}}>
    <button onClick={()=>router.push('/staff')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:900}}>← Staff Portal</button>
    <header style={{margin:'18px 0 20px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>LAUREM CARE</div><h1 style={{margin:'5px 0'}}>Time & Attendance</h1><p style={{margin:0,...muted}}>Clock against assigned shifts and submit the resulting timesheet for payroll review.</p></header>
    {error&&<div role='alert' style={{...card,marginBottom:16,color:'#b42318',borderColor:'#fed7d7'}}>{error}</div>}
    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(280px,.7fr)',gap:16}}>
      <div style={card}><h2 style={{marginTop:0}}>Eligible shifts</h2>{!shifts.length?<p style={muted}>No current or upcoming assignments are eligible for attendance.</p>:shifts.map(shift=>{const row=rows.find(item=>item.assignment_id===shift.id);const canIn=!row?.clock_in;const canOut=Boolean(row?.clock_in&&!row?.clock_out);return <article key={shift.id} style={{border:'1px solid #e5eaf0',borderRadius:12,padding:15,marginBottom:10}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{shift.client_name||'LAUREM Assignment'}</strong><span style={{fontSize:12,fontWeight:900}}>{row?.status||'Not started'}</span></div><div style={{marginTop:6}}>{shift.location}</div><div style={{...muted,fontSize:13,marginTop:4}}>{fmtDate(shift.scheduled_start)} · {fmtDateTime(shift.scheduled_start)} → {fmtDateTime(shift.scheduled_end)}</div>{row?.clock_in&&<div style={{marginTop:8,fontSize:13}}>Clocked in {fmtDateTime(row.clock_in)}</div>}{shift.notes&&<p style={{...muted,whiteSpace:'pre-wrap'}}>{shift.notes}</p>}<div style={{marginTop:11}}>{canIn&&<button onClick={()=>void act(shift.id,'clock_in')} disabled={busy==='clock_in'+shift.id} style={{padding:'9px 13px',border:0,borderRadius:9,background:'#0f766e',color:'#fff',fontWeight:900}}>{busy==='clock_in'+shift.id?'Clocking in…':'Clock in'}</button>}{canOut&&<div style={{display:'grid',gridTemplateColumns:'130px 1fr auto',gap:8,alignItems:'center'}}><input type='number' min='0' max='480' value={breakMinutes} onChange={e=>setBreakMinutes(e.target.value)} style={{padding:9,border:'1px solid #d9e2ec',borderRadius:8}} aria-label='Break minutes'/><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder='Optional attendance note' style={{padding:9,border:'1px solid #d9e2ec',borderRadius:8}} aria-label='Attendance note'/><button onClick={()=>void act(shift.id,'clock_out')} disabled={busy==='clock_out'+shift.id} style={{padding:'9px 13px',border:0,borderRadius:9,background:'#334e68',color:'#fff',fontWeight:900}}>{busy==='clock_out'+shift.id?'Clocking out…':'Clock out'}</button></div>}</div></article>})}</div>
      <aside style={card}><h2 style={{marginTop:0}}>Live status</h2>{open?<><div style={{...muted,fontSize:13}}>Currently clocked in</div><div style={{fontSize:28,fontWeight:950,marginTop:4}}>{fmtDateTime(open.clock_in)}</div><div style={{...muted,marginTop:5}}>Complete the active assignment from its shift card.</div></>:<><div style={{...muted,fontSize:13}}>Status</div><div style={{fontSize:28,fontWeight:950,marginTop:4}}>Not clocked in</div><div style={{...muted,marginTop:5}}>Eligible assignments appear here when their attendance window opens.</div></>}<div style={{borderTop:'1px solid #edf2f7',marginTop:22,paddingTop:16}}><div style={{...muted,fontSize:13}}>Submitted attendance</div><div style={{fontSize:30,fontWeight:950}}>{rows.filter(r=>['submitted','approved','paid'].includes(r.status)).length}</div></div></aside>
    </section>
    <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Attendance history</h2>{!rows.length?<p style={muted}>No attendance records yet.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left',padding:10}}>Date</th><th style={{textAlign:'left',padding:10}}>In</th><th style={{textAlign:'left',padding:10}}>Out</th><th style={{textAlign:'left',padding:10}}>Hours</th><th style={{textAlign:'left',padding:10}}>Status</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} style={{borderTop:'1px solid #edf2f7'}}><td style={{padding:10}}>{fmtDate(row.work_date+'T12:00:00')}</td><td style={{padding:10}}>{fmtDateTime(row.clock_in)}</td><td style={{padding:10}}>{fmtDateTime(row.clock_out)}</td><td style={{padding:10,fontWeight:900}}>{duration(row)}</td><td style={{padding:10}}>{row.status}</td></tr>)}</tbody></table></div>}</section>
  </div></main>;
}