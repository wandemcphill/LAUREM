'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Availability = { id:string; effective_from:string; full_time:boolean; part_time:boolean; days:boolean; nights:boolean; weekends:boolean; notes:string|null; created_at:string };

const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20};
const muted:React.CSSProperties={color:'#627d98'};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'10px 11px',border:'1px solid #dbe5ea',borderRadius:9,font:'inherit'};
const button=(primary=false):React.CSSProperties=>({border:primary?'0':'1px solid #dbe5ea',background:primary?'#102a43':'#fff',color:primary?'#fff':'#102a43',borderRadius:10,padding:'10px 13px',fontWeight:800,cursor:'pointer'});
function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());}
function summary(item:Availability){return [item.full_time?'Full-time':item.part_time?'Part-time':null,item.days?'Day shifts':null,item.nights?'Night shifts':null,item.weekends?'Weekends':null].filter(Boolean).join(' · ');}
function date(value:string){return new Date(value+'T00:00:00').toLocaleDateString('en-GB',{dateStyle:'medium'});}

export default function StaffAvailabilityPage(){
  const router=useRouter();
  const [current,setCurrent]=useState<Availability|null>(null);
  const [history,setHistory]=useState<Availability[]>([]);
  const [effectiveFrom,setEffectiveFrom]=useState(localDate());
  const [fullTime,setFullTime]=useState(false),[partTime,setPartTime]=useState(false),[days,setDays]=useState(true),[nights,setNights]=useState(false),[weekends,setWeekends]=useState(false);
  const [notes,setNotes]=useState('');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');

  async function load(){
    setError('');
    try{const response=await fetch('/api/staff/availability',{cache:'no-store'});if(response.status===401){router.replace('/staff/login');return;}const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to load availability.');setCurrent(body.current||null);setHistory(body.history||[]);const next=body.current;if(next){setEffectiveFrom(next.effective_from);setFullTime(Boolean(next.full_time));setPartTime(Boolean(next.part_time));setDays(Boolean(next.days));setNights(Boolean(next.nights));setWeekends(Boolean(next.weekends));setNotes(next.notes||'');}}catch(e){setError(e instanceof Error?e.message:'Unable to load availability.');}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[router]);

  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setSaved(false);setError('');
    try{const response=await fetch('/api/staff/availability',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({effectiveFrom,fullTime,partTime,days,nights,weekends,notes})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to save availability.');setCurrent(body.availability);await load();setSaved(true);}catch(e){setError(e instanceof Error?e.message:'Unable to save availability.');}finally{setBusy(false);}
  }

  if(loading)return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:24,fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:950,margin:'0 auto',...card}}>Loading availability…</div></main>;

  return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:'24px 18px 60px',fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:950,margin:'0 auto'}}>
    <button onClick={()=>router.push('/staff')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:800}}>← Staff Portal</button>
    <header style={{margin:'18px 0 20px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>WORKFORCE PREFERENCES</div><h1 style={{margin:'5px 0'}}>Availability & preferences</h1><p style={{...muted,margin:0}}>Tell LAUREM when and how you prefer to work. These preferences help the workforce team plan shifts and are not a guarantee of assignment.</p></header>
    {error&&<div role="alert" style={{...card,color:'#b42318',marginBottom:14}}>{error}</div>}
    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(280px,.75fr)',gap:14,alignItems:'start'}}>
      <form onSubmit={save} style={card}><h2 style={{marginTop:0}}>Current availability</h2><label style={{display:'grid',gap:7,fontSize:13,fontWeight:900}}>Effective from<input type="date" value={effectiveFrom} onChange={e=>setEffectiveFrom(e.target.value)} required style={input}/></label>
        <div style={{marginTop:18}}><div style={{fontSize:13,fontWeight:900,marginBottom:9}}>Work pattern</div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}><label style={{display:'flex',gap:9,alignItems:'center',padding:13,border:'1px solid #e5eaf0',borderRadius:12}}><input type='checkbox' checked={fullTime} onChange={e=>setFullTime(e.target.checked)}/> Full-time</label><label style={{display:'flex',gap:9,alignItems:'center',padding:13,border:'1px solid #e5eaf0',borderRadius:12}}><input type='checkbox' checked={partTime} onChange={e=>setPartTime(e.target.checked)}/> Part-time</label></div></div>
        <div style={{marginTop:18}}><div style={{fontSize:13,fontWeight:900,marginBottom:9}}>Preferred working pattern</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}><label style={{display:'flex',gap:9,alignItems:'center',padding:13,border:'1px solid #e5eaf0',borderRadius:12}}><input type='checkbox' checked={days} onChange={e=>setDays(e.target.checked)}/> Day shifts</label><label style={{display:'flex',gap:9,alignItems:'center',padding:13,border:'1px solid #e5eaf0',borderRadius:12}}><input type='checkbox' checked={nights} onChange={e=>setNights(e.target.checked)}/> Night shifts</label><label style={{display:'flex',gap:9,alignItems:'center',padding:13,border:'1px solid #e5eaf0',borderRadius:12}}><input type='checkbox' checked={weekends} onChange={e=>setWeekends(e.target.checked)}/> Weekends</label></div></div>
        <label style={{display:'grid',gap:7,fontSize:13,fontWeight:900,marginTop:18}}>Additional notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000} rows={5} placeholder='For example: preferred locations, recurring constraints or other scheduling context.' style={{...input,resize:'vertical'}}/></label>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginTop:16}}><button disabled={busy} style={button(true)}>{busy?'Saving…':'Save availability'}</button>{saved&&<span style={{color:'#0f766e',fontWeight:800}}>Saved.</span>}</div>
      </form>
      <aside style={{display:'grid',gap:14}}><article style={card}><h2 style={{marginTop:0}}>Current summary</h2>{current?<><strong>{summary(current)}</strong><div style={{...muted,fontSize:13,marginTop:7}}>Effective {date(current.effective_from)}</div>{current.notes&&<p style={{...muted,whiteSpace:'pre-wrap'}}>{current.notes}</p>}</>:<p style={muted}>No availability has been recorded yet.</p>}</article><article style={card}><h2 style={{marginTop:0}}>Change history</h2>{!history.length?<p style={muted}>No previous updates.</p>:<div style={{display:'grid',gap:10}}>{history.map(item=><div key={item.id} style={{borderTop:'1px solid #edf2f7',paddingTop:10}}><strong>{summary(item)}</strong><div style={{...muted,fontSize:12,marginTop:4}}>Effective {date(item.effective_from)}</div>{item.notes&&<div style={{...muted,fontSize:12,marginTop:4}}>{item.notes}</div>}</div>)}</div>}</article></aside>
    </section>
  </div></main>;
}
