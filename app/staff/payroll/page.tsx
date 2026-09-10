'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Period = { period_start:string; period_end:string; pay_date:string|null; status:string };
type Entry = { id:string; payroll_period_id:string; approved_hours:number|null; hourly_rate:number|null; gross_amount:number|null; status:string; notes:string|null; payroll_periods?:Period|null };

const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20};
const muted:React.CSSProperties={color:'#627d98'};
const btn:React.CSSProperties={border:'1px solid #dbe5ea',background:'#fff',color:'#102a43',borderRadius:10,padding:'10px 13px',fontWeight:800,cursor:'pointer'};
function money(value:number|null){return value==null?'Not set':`£${Number(value).toFixed(2)}`;}
function date(value:string|null){return value?new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{dateStyle:'medium'}):'Not set';}
function status(value:string){return <span style={{padding:'6px 9px',borderRadius:999,background:'#edf2f7',fontSize:12,fontWeight:800}}>{value.replaceAll('_',' ')}</span>;}

export default function StaffPayrollPage(){
  const router=useRouter();
  const [entries,setEntries]=useState<Entry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{fetch('/api/staff/payroll',{cache:'no-store'}).then(async response=>{if(response.status===401){router.replace('/staff/login');return;}const body=await response.json().catch(()=>({}));if(!response.ok)setError(body.error||'Unable to load payroll information.');else setEntries(body.entries||[]);setLoading(false);}).catch(()=>{setError('Unable to load payroll information.');setLoading(false);});},[router]);

  const totals=useMemo(()=>({gross:entries.reduce((sum,e)=>sum+(Number(e.gross_amount)||0),0),hours:entries.reduce((sum,e)=>sum+(Number(e.approved_hours)||0),0),paid:entries.filter(e=>e.status==='paid').length}),[entries]);
  if(loading)return <main style={{padding:24,minHeight:'100vh',background:'#f4f7fb',fontFamily:'system-ui'}}><div style={{maxWidth:1050,margin:'0 auto',...card}}>Loading payroll workspace…</div></main>;

  return <main style={{padding:'24px 18px 60px',minHeight:'100vh',background:'#f4f7fb',fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:1050,margin:'0 auto'}}>
    <button onClick={()=>router.push('/staff')} style={{...btn,border:0,padding:0,color:'#0f766e'}}>← Staff Portal</button>
    <header style={{margin:'18px 0 20px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>PAYROLL</div><h1 style={{margin:'7px 0 4px'}}>My payroll</h1><p style={{...muted,margin:0}}>Approved hours, pay rates and gross payroll records available on your staff account.</p></header>
    {error&&<div role="alert" style={{...card,color:'#b42318',marginBottom:14}}>{error}</div>}
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:14}}><Metric label="Records" value={entries.length}/><Metric label="Approved hours" value={totals.hours.toFixed(2)}/><Metric label="Gross shown" value={money(totals.gross)}/><Metric label="Paid periods" value={totals.paid}/></section>
    {!entries.length?<div style={card}><h2 style={{marginTop:0}}>No payroll records yet</h2><p style={muted}>Payroll entries will appear here once your approved hours are included in a payroll period.</p></div>:<section style={{display:'grid',gap:12}}>{entries.map(entry=>{const period=entry.payroll_periods;return <article key={entry.id} style={card}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 5px'}}>{period?`${date(period.period_start)} to ${date(period.period_end)}`:'Payroll period'}</h2><div style={muted}>Pay date: {date(period?.pay_date||null)}</div></div>{status(entry.status)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginTop:17,paddingTop:15,borderTop:'1px solid #edf2f7'}}><Info label="Approved hours" value={entry.approved_hours==null?'Not set':Number(entry.approved_hours).toFixed(2)}/><Info label="Hourly rate" value={money(entry.hourly_rate)}/><Info label="Gross amount" value={money(entry.gross_amount)}/><Info label="Payroll state" value={period?.status||'Not set'}/></div>{entry.notes&&<div style={{...muted,marginTop:14,whiteSpace:'pre-wrap'}}>{entry.notes}</div>}</article>;})}</section>}
  </div></main>;
}
function Metric({label,value}:{label:string;value:string|number}){return <article style={card}><div style={{fontSize:27,fontWeight:900}}>{value}</div><div style={{...muted,fontSize:12,marginTop:3}}>{label}</div></article>;}
function Info({label,value}:{label:string;value:string}){return <div><div style={{...muted,fontSize:12}}>{label}</div><strong style={{display:'block',marginTop:4}}>{value}</strong></div>;}
