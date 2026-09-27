'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20};
const muted:React.CSSProperties={color:'#627d98'};
function fmt(value:string|null){return value?new Date(value+'T00:00:00').toLocaleDateString('en-GB',{dateStyle:'medium'}):'Not scheduled';}
export default function StaffTrainingPage(){
 const router=useRouter(); const [data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){try{const r=await fetch('/api/staff/training',{cache:'no-store'});if(r.status===401){router.replace('/staff/login');return;}const p=await r.json();if(!r.ok)throw new Error(p.error||'Unable to load training.');setData(p);}catch(e){setError(e instanceof Error?e.message:'Unable to load training.');}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 if(loading)return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:24,fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:900,margin:'0 auto',...card}}>Loading training…</div></main>;
 const current=data?.current;
 return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:'24px 18px 60px',fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:900,margin:'0 auto'}}>
  <button onClick={()=>router.push('/staff')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:800}}>← Staff Portal</button>
  <header style={{margin:'18px 0 20px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>STAFF TRAINING</div><h1 style={{margin:'5px 0'}}>Mandatory one-week training</h1><p style={{...muted,lineHeight:1.55,margin:0}}>Training is part of your LAUREM workforce readiness. Your mandatory one-week training week will be communicated here once scheduled.</p></header>
  {error&&<div role="alert" style={{...card,color:'#b42318',marginBottom:14}}>{error}</div>}
  <section style={{...card,border:'2px solid #0f766e'}}>{!current?<><strong style={{display:'inline-block',padding:'7px 10px',borderRadius:999,background:'#fff4e5',color:'#9a3412'}}>TRAINING DUE</strong><h2 style={{margin:'12px 0 5px'}}>Your training week has not been scheduled yet</h2><p style={{...muted,lineHeight:1.55}}>LAUREM will communicate the week, location and practical instructions here. Keep checking your notifications and messages.</p></>:<><strong style={{display:'inline-block',padding:'7px 10px',borderRadius:999,background:current.status==='completed'?'#e8f7ee':current.status==='in_progress'?'#fff4e5':'#edf2f7',color:current.status==='completed'?'#166534':current.status==='in_progress'?'#9a3412':'#102a43'}}>{String(current.status).replaceAll('_',' ').toUpperCase()}</strong><h2 style={{margin:'12px 0 5px'}}>{current.training_type}</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:15}}><div><div style={muted}>Training week starts</div><strong>{fmt(current.week_start)}</strong></div><div><div style={muted}>Training week ends</div><strong>{fmt(current.week_end)}</strong></div><div><div style={muted}>Location</div><strong>{current.location||'To be communicated'}</strong></div><div><div style={muted}>Mandatory</div><strong>{current.mandatory?'Yes':'No'}</strong></div></div>{current.notes&&<p style={{...muted,whiteSpace:'pre-wrap'}}>{current.notes}</p>}</>}</section>
  <section style={{...card,marginTop:14}}><h2 style={{marginTop:0}}>Training history</h2>{!(data?.history||[]).length?<p style={muted}>No training records yet.</p>:<div style={{display:'grid',gap:9}}>{data.history.map((item:any)=><div key={item.id} style={{padding:'10px 0',borderTop:'1px solid #edf2f7'}}><strong>{item.training_type}</strong><div style={{...muted,fontSize:12,marginTop:4}}>{String(item.status).replaceAll('_',' ')} · {fmt(item.week_start)} to {fmt(item.week_end)}</div></div>)}</div>}</section>
 </div></main>;
}
