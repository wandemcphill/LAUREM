'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type LeaveRequest = {
  id:string;
  leave_type:string;
  start_date:string;
  end_date:string;
  total_days:number;
  reason:string|null;
  status:string;
  review_note:string|null;
  reviewed_at:string|null;
  created_at:string;
};

const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20};
const muted:React.CSSProperties={color:'#627d98'};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'10px 11px',border:'1px solid #dbe5ea',borderRadius:9,font:'inherit'};
const button=(primary=false):React.CSSProperties=>({border:primary?'0':'1px solid #dbe5ea',background:primary?'#102a43':'#fff',color:primary?'#fff':'#102a43',borderRadius:10,padding:'10px 13px',fontWeight:800,cursor:'pointer'});

function fmtDate(value:string){return new Date(value+'T00:00:00').toLocaleDateString('en-GB',{dateStyle:'medium'});}
function statusLabel(value:string){return value.replaceAll('_',' ').toUpperCase();}

export default function StaffLeavePage(){
  const router=useRouter();
  const [rows,setRows]=useState<LeaveRequest[]>([]);
  const [leaveType,setLeaveType]=useState('Annual Leave');
  const [startDate,setStartDate]=useState('');
  const [endDate,setEndDate]=useState('');
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);

  async function load(){
    setError('');
    try{
      const response=await fetch('/api/staff/leave',{cache:'no-store'});
      if(response.status===401){router.replace('/staff/login');return;}
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to load leave requests.');
      setRows(body.requests||[]);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load leave requests.');}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[router]);

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy('submit');setSaved(false);setError('');
    try{
      const response=await fetch('/api/staff/leave',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({leaveType,startDate,endDate,reason}),
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to submit leave request.');
      setStartDate('');setEndDate('');setReason('');setSaved(true);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to submit leave request.');}
    finally{setBusy('');}
  }

  async function cancel(id:string){
    setBusy(id);setError('');
    try{
      const response=await fetch('/api/staff/leave?id='+encodeURIComponent(id),{method:'PATCH'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to cancel leave request.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to cancel leave request.');}
    finally{setBusy('');}
  }

  return <main style={{minHeight:'100vh',background:'#f4f7fb',fontFamily:'system-ui',padding:'28px 18px 60px',color:'#102a43'}}>
    <div style={{maxWidth:1050,margin:'0 auto'}}>
      <button onClick={()=>router.push('/staff')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:900}}>← Staff Portal</button>
      <header style={{margin:'18px 0 20px'}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>WORKFORCE LEAVE</div>
        <h1 style={{margin:'6px 0'}}>My Leave</h1>
        <p style={{...muted,margin:0,lineHeight:1.55}}>Request time away from work and track LAUREM's decisions. Approved leave that has started or is due today must be managed with LAUREM HR.</p>
      </header>

      {error&&<div role='alert' style={{...card,marginBottom:14,color:'#b42318',borderColor:'#fed7d7'}}>{error}</div>}
      {saved&&<div role='status' style={{...card,marginBottom:14,color:'#166534',borderColor:'#b7ead0',background:'#f8fffc'}}>Your leave request has been submitted to LAUREM for review.</div>}

      <section style={{display:'grid',gridTemplateColumns:'minmax(0,.85fr) minmax(0,1.15fr)',gap:14,alignItems:'start'}}>
        <form onSubmit={submit} style={card}>
          <h2 style={{marginTop:0}}>Request leave</h2>
          <div style={{display:'grid',gap:11}}>
            <label style={{fontSize:13,fontWeight:900}}>Leave type
              <select value={leaveType} onChange={e=>setLeaveType(e.target.value)} style={{...input,marginTop:7}}>
                <option>Annual Leave</option><option>Sick Leave</option><option>Family Leave</option><option>Unpaid Leave</option><option>Other Leave</option>
              </select>
            </label>
            <label style={{fontSize:13,fontWeight:900}}>Start date
              <input type='date' value={startDate} onChange={e=>setStartDate(e.target.value)} required style={{...input,marginTop:7}}/>
            </label>
            <label style={{fontSize:13,fontWeight:900}}>End date
              <input type='date' value={endDate} onChange={e=>setEndDate(e.target.value)} required style={{...input,marginTop:7}}/>
            </label>
            <label style={{fontSize:13,fontWeight:900}}>Reason or additional context
              <textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000} rows={5} style={{...input,marginTop:7,resize:'vertical'}} placeholder='Optional'/>
            </label>
            <button disabled={busy==='submit'} style={button(true)}>{busy==='submit'?'Submitting…':'Submit leave request'}</button>
          </div>
        </form>

        <section style={card}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <div><h2 style={{margin:'0 0 4px'}}>Leave history</h2><div style={muted}>Your submitted requests and LAUREM review decisions.</div></div>
            <button onClick={()=>void load()} disabled={loading} style={button()}>{loading?'Loading…':'Refresh'}</button>
          </div>
          {loading?<p style={muted}>Loading leave requests…</p>:!rows.length?<div style={{...muted,padding:'22px 0'}}>No leave requests have been submitted yet.</div>:<div style={{display:'grid',gap:10,marginTop:15}}>
            {rows.map(row=><article key={row.id} style={{border:'1px solid #e5eaf0',borderRadius:12,padding:14}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                <strong>{row.leave_type.replaceAll('_',' ')}</strong>
                <span style={{padding:'5px 8px',borderRadius:999,background:row.status==='approved'?'#e8f7ee':row.status==='rejected'?'#fdecec':row.status==='pending'?'#fff4d8':'#edf2f7',fontSize:11,fontWeight:900}}>{statusLabel(row.status)}</span>
              </div>
              <div style={{...muted,fontSize:13,marginTop:6}}>{fmtDate(row.start_date)} → {fmtDate(row.end_date)} · {row.total_days} day{row.total_days===1?'':'s'}</div>
              {row.reason&&<p style={{margin:'8px 0 0',whiteSpace:'pre-wrap',color:'#486581'}}>{row.reason}</p>}
              {row.review_note&&<div style={{marginTop:9,padding:10,borderRadius:9,background:'#f7fafc'}}><strong>LAUREM note:</strong><div style={{...muted,marginTop:3,whiteSpace:'pre-wrap'}}>{row.review_note}</div></div>}
              {['pending','approved'].includes(row.status)&&<button disabled={busy===row.id} onClick={()=>void cancel(row.id)} style={{...button(),marginTop:10,color:'#8a2323',borderColor:'#f3cccc'}}>{busy===row.id?'Cancelling…':'Cancel request'}</button>}
            </article>)}
          </div>}
        </section>
      </section>
    </div>
  </main>;
}
