'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Shift={id:string;client_name:string|null;location:string;scheduled_start:string;scheduled_end:string;status:string;notes:string|null};

function fmt(value:string){return new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});}
function day(value:string){return new Date(value).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function shiftDuration(start:string,end:string){const mins=Math.max(0,Math.round((new Date(end).getTime()-new Date(start).getTime())/60000));return Math.floor(mins/60)+'h '+(mins%60)+'m';}
function badge(status:string){const cls=status==='confirmed'?'staff-badge staff-badge--live':status==='cancelled'?'staff-badge staff-badge--danger':'staff-badge staff-badge--attention';return <span className={cls}>{status.replaceAll('_',' ')}</span>;}

export default function StaffShiftsPage(){
  const router=useRouter();
  const [shifts,setShifts]=useState<Shift[]>([]);
  const [history,setHistory]=useState<Shift[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');

  async function load(showSpinner=true){
    if(showSpinner)setLoading(true);else setRefreshing(true);
    setError('');
    try{
      const response=await fetch('/api/staff/shifts',{cache:'no-store'});
      if(response.status===401){router.replace('/staff/login');return;}
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Unable to load shifts.');
      setShifts(data.shifts||[]);setHistory(data.history||[]);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load shifts.');}
    finally{setLoading(false);setRefreshing(false);}
  }

  useEffect(()=>{void load();},[router]);

  const nextShift=shifts[0]||null;
  const upcomingHours=useMemo(()=>shifts.reduce((sum,shift)=>sum+(new Date(shift.scheduled_end).getTime()-new Date(shift.scheduled_start).getTime())/3600000,0),[shifts]);

  return <main className="staff-page--workforce">
    <div className="staff-page-inner">
      <header className="staff-workforce-header">
        <div>
          <p className="staff-eyebrow">Workforce schedule</p>
          <h1 className="staff-page-title">My Shifts</h1>
          <p className="staff-page-subtitle">See your upcoming assignments, locations and recent shift history in one place.</p>
        </div>
        <div className="staff-workforce-actions">
          <button className="staff-action" onClick={()=>router.push('/staff/availability')}>Work preferences</button>
          <button className="staff-action" onClick={()=>void load(false)} disabled={refreshing}>{refreshing?'Refreshing...':'Refresh'}</button>
        </div>
      </header>

      {error&&<div role="alert" className="staff-workforce-card" style={{marginBottom:14,color:'#991b1b',borderColor:'#f3cccc'}}>{error}</div>}

      <section className="staff-workforce-grid">
        <article className="staff-workforce-card staff-workforce-card--hero">
          <p className="staff-eyebrow" style={{color:'#b9e1d2'}}>Next shift</p>
          {nextShift ? <>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div>
                <h2 className="staff-card-heading" style={{fontSize:24}}>{nextShift.client_name||'LAUREM Assignment'}</h2>
                <div style={{color:'#d9ece5',marginTop:6}}>{nextShift.location}</div>
              </div>
              {badge(nextShift.status)}
            </div>
            <div style={{fontSize:18,fontWeight:900,marginTop:20}}>{day(nextShift.scheduled_start)}</div>
            <div style={{fontSize:28,fontWeight:950,marginTop:4}}>{new Date(nextShift.scheduled_start).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} to {new Date(nextShift.scheduled_end).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
            <div style={{color:'#b9e1d2',marginTop:6}}>{shiftDuration(nextShift.scheduled_start,nextShift.scheduled_end)} scheduled</div>
            {nextShift.notes&&<p style={{color:'#d9ece5',lineHeight:1.5,whiteSpace:'pre-wrap',marginTop:14}}>{nextShift.notes}</p>}
            <div className="staff-shift-actions" style={{marginTop:18}}>
              <button className="staff-action-primary" style={{background:'#fff',color:'#173a31'}} onClick={()=>router.push('/staff/attendance')}>Open attendance</button>
            </div>
          </> : <><h2 className="staff-card-heading" style={{fontSize:24}}>No upcoming shift</h2><p className="staff-card-copy">There is no scheduled assignment currently visible in your portal.</p><button className="staff-action-primary" style={{marginTop:15,background:'#fff',color:'#173a31'}} onClick={()=>router.push('/staff/availability')}>Review work preferences</button></>}
        </article>

        <aside className="staff-workforce-card">
          <p className="staff-eyebrow">Schedule snapshot</p>
          <div className="staff-stat-grid">
            <div className="staff-stat"><div className="staff-stat-value">{shifts.length}</div><div className="staff-stat-label">Upcoming shifts</div></div>
            <div className="staff-stat"><div className="staff-stat-value">{Math.round(upcomingHours*10)/10}</div><div className="staff-stat-label">Scheduled hours</div></div>
            <div className="staff-stat"><div className="staff-stat-value">{history.length}</div><div className="staff-stat-label">Recent records</div></div>
          </div>
          <div style={{marginTop:14,padding:13,borderRadius:13,background:'#f7fafc',color:'var(--muted)',fontSize:13,lineHeight:1.5}}>
            Attendance opens within the permitted window for each active assignment.
          </div>
        </aside>
      </section>

      <section className="staff-workforce-card" style={{marginTop:14}}>
        <div className="staff-workforce-header" style={{marginBottom:10}}>
          <div><p className="staff-eyebrow">Upcoming assignments</p><h2 className="staff-card-heading">Your schedule</h2></div>
          <span className="staff-badge">{shifts.length} upcoming</span>
        </div>
        {loading?<div className="staff-empty">Loading your schedule...</div>:!shifts.length?<div className="staff-empty">No upcoming shifts have been scheduled.</div>:<div>
          {shifts.map(shift=><article className="staff-shift-item" key={shift.id}>
            <div className="staff-shift-topline">
              <div>
                <div className="staff-shift-client">{shift.client_name||'LAUREM Assignment'}</div>
                <div className="staff-shift-meta">{shift.location}</div>
              </div>
              {badge(shift.status)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,marginTop:12}}>
              <div><div className="staff-eyebrow" style={{fontSize:9,marginBottom:3}}>Date</div><strong>{day(shift.scheduled_start)}</strong></div>
              <div><div className="staff-eyebrow" style={{fontSize:9,marginBottom:3}}>Time</div><strong>{new Date(shift.scheduled_start).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} to {new Date(shift.scheduled_end).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</strong></div>
              <div><div className="staff-eyebrow" style={{fontSize:9,marginBottom:3}}>Duration</div><strong>{shiftDuration(shift.scheduled_start,shift.scheduled_end)}</strong></div>
            </div>
            {shift.notes&&<p className="staff-shift-meta" style={{whiteSpace:'pre-wrap',marginBottom:0}}>{shift.notes}</p>}
            <div className="staff-shift-actions" style={{marginTop:12}}>
              <button className="staff-action" onClick={()=>router.push('/staff/attendance')}>Attendance</button>
            </div>
          </article>)}
        </div>}
      </section>

      <section className="staff-workforce-card" style={{marginTop:14}}>
        <div className="staff-workforce-header" style={{marginBottom:10}}>
          <div><p className="staff-eyebrow">History</p><h2 className="staff-card-heading">Recent shifts</h2></div>
          <span className="staff-badge">Latest {Math.min(history.length,30)}</span>
        </div>
        {!history.length?<div className="staff-empty">No completed or past shifts are recorded yet.</div>:<div>{history.slice(0,30).map(shift=><article className="staff-shift-item" key={shift.id}>
          <div className="staff-shift-topline"><div><div className="staff-shift-client">{shift.client_name||'LAUREM Assignment'}</div><div className="staff-shift-meta">{fmt(shift.scheduled_start)} to {fmt(shift.scheduled_end)} · {shift.location}</div></div>{badge(shift.status)}</div>
        </article>)}</div>}
      </section>
    </div>
  </main>;
}
