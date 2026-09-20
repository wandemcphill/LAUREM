'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Shift={id:string;client_name:string|null;location:string;scheduled_start:string;scheduled_end:string;status:string;notes:string|null};
const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:18};
const muted:React.CSSProperties={color:'#627d98'};
function fmt(value:string){return new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});}
function pill(status:string){return <span style={{padding:'5px 8px',borderRadius:999,background:'#edf2f7',fontSize:11,fontWeight:900}}>{status.replaceAll('_',' ').toUpperCase()}</span>;}

export default function StaffShiftsPage(){
  const router=useRouter();
  const [shifts,setShifts]=useState<Shift[]>([]);
  const [history,setHistory]=useState<Shift[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  async function load(){
    setError('');
    try{const response=await fetch('/api/staff/shifts',{cache:'no-store'});if(response.status===401){router.replace('/staff/login');return;}const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load shifts.');setShifts(data.shifts||[]);setHistory(data.history||[]);}catch(e){setError(e instanceof Error?e.message:'Unable to load shifts.');}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[router]);

  return <main style={{minHeight:'100vh',background:'#f4f7fb',fontFamily:'system-ui',padding:24,color:'#102a43'}}><div style={{maxWidth:1050,margin:'0 auto'}}>
    <button onClick={()=>router.push('/staff')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:800}}>← Staff Portal</button>
    <header style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-end',flexWrap:'wrap',margin:'18px 0 20px'}}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>WORKFORCE SCHEDULE</div><h1 style={{margin:'5px 0'}}>My Shifts</h1><p style={{...muted,margin:0}}>Upcoming assignments and your recent completed shift record.</p></div><div style={{display:'flex',gap:8}}><button onClick={()=>router.push('/staff/availability')} style={{padding:'9px 12px',border:'1px solid #dbe5ea',background:'#fff',borderRadius:9,fontWeight:800}}>Availability</button><button onClick={()=>void load()} style={{padding:'9px 12px',border:0,background:'#102a43',color:'#fff',borderRadius:9,fontWeight:800}}>Refresh</button></div></header>
    {error&&<div role='alert' style={{...card,color:'#b42318',marginBottom:14}}>{error}</div>}
    {loading?<div style={card}>Loading shifts…</div>:<>
      <section><h2>Upcoming shifts</h2>{!shifts.length?<div style={card}>No upcoming shifts have been scheduled.</div>:<div style={{display:'grid',gap:12}}>{shifts.map(shift=><article key={shift.id} style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{shift.client_name||'LAUREM Assignment'}</strong>{pill(shift.status)}</div><p style={{marginBottom:6}}>{shift.location}</p><p style={{...muted,margin:0}}>{fmt(shift.scheduled_start)} → {fmt(shift.scheduled_end)}</p>{shift.notes&&<p style={{color:'#486581',whiteSpace:'pre-wrap'}}>{shift.notes}</p>}</article>)}</div>}</section>
      <section style={{marginTop:28}}><h2>Recent shift history</h2>{!history.length?<div style={card}>No completed or past shifts are recorded yet.</div>:<div style={{display:'grid',gap:10}}>{history.slice(0,30).map(shift=><article key={shift.id} style={{...card,padding:15}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{shift.client_name||'LAUREM Assignment'}</strong><div style={{...muted,fontSize:13,marginTop:4}}>{fmt(shift.scheduled_start)} → {fmt(shift.scheduled_end)} · {shift.location}</div></div>{pill(shift.status)}</div></article>)}</div>}</section>
    </>}
  </div></main>;
}
