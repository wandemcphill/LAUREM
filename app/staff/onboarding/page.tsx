'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  task_key: string;
  category: string;
  title: string;
  description: string | null;
  required: boolean;
  status: 'pending' | 'completed' | 'waived';
  document_path: string | null;
  acknowledgement_required: boolean;
  acknowledged_at: string | null;
  completed_at: string | null;
}

interface PackageRow {
  id: string;
  audience: string;
  title: string;
  status: 'pending' | 'in_progress' | 'complete';
  assigned_at: string;
  completed_at: string | null;
}

const card: React.CSSProperties = { background:'#fff', border:'1px solid #e5eaf0', borderRadius:16, padding:20 };
const muted: React.CSSProperties = { color:'#627d98' };
const button = (primary=false): React.CSSProperties => ({ border:primary?'0':'1px solid #dbe5ea', background:primary?'#102a43':'#fff', color:primary?'#fff':'#102a43', borderRadius:10, padding:'10px 13px', fontWeight:800, cursor:'pointer', textDecoration:'none' });

function fmtDate(value:string|null) { return value ? new Date(value).toLocaleDateString('en-GB',{dateStyle:'medium'}) : 'Not set'; }

const complianceGuidance: Record<string, { heading: string; text: string }> = {
  identity_and_rtw: {
    heading: 'LAUREM verification required',
    text: 'LAUREM Compliance/HR must complete and record this identity and right-to-work verification. You do not need to self-certify this item in the Staff Portal.',
  },
  pvG_or_disclosure: {
    heading: 'LAUREM disclosure check required',
    text: 'LAUREM must confirm the applicable Scottish disclosure/PVG requirement and record its status before regulated work. You do not need to mark this item complete yourself.',
  },
};

export default function StaffOnboardingPage() {
  const router = useRouter();
  const [packageRow,setPackageRow] = useState<PackageRow|null>(null);
  const [tasks,setTasks] = useState<Task[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState<string|null>(null);
  const [error,setError] = useState('');

  async function load() {
    setError('');
    try {
      const response = await fetch('/api/staff/onboarding',{cache:'no-store'});
      if(response.status===401){router.replace('/staff/login');return;}
      const body = await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to load onboarding.');
      setPackageRow(body.package||null); setTasks(body.tasks||[]);
    } catch(e){setError(e instanceof Error?e.message:'Unable to load onboarding.');}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[router]);

  async function acknowledge(taskId:string) {
    setBusy(taskId); setError('');
    try {
      const response = await fetch('/api/staff/onboarding',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({taskId,action:'acknowledge'})});
      const body = await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to acknowledge task.');
      setPackageRow(body.package); setTasks(current=>current.map(task=>task.id===taskId?body.task:task));
    } catch(e){setError(e instanceof Error?e.message:'Unable to acknowledge task.');}
    finally{setBusy(null);}
  }

  const pendingComplianceTasks = tasks.filter(task => complianceGuidance[task.task_key] && task.status === 'pending');

  const progress = useMemo(()=>{
    const required = tasks.filter(task=>task.required);
    const complete = required.filter(task=>task.status==='completed'||task.status==='waived').length;
    const acknowledged = required.filter(task=>!task.acknowledgement_required||Boolean(task.acknowledged_at)).length;
    const done = required.filter(task=>(task.status==='completed'||task.status==='waived')&&(!task.acknowledgement_required||Boolean(task.acknowledged_at))).length;
    return {total:required.length,complete,acknowledged,done,percent:required.length?Math.round((done/required.length)*100):100};
  },[tasks]);

  if(loading) return <main style={{padding:24,fontFamily:'system-ui',background:'#f4f7fb',minHeight:'100vh'}}><div style={{maxWidth:1050,margin:'0 auto',...card}}>Loading onboarding centre…</div></main>;

  return <main style={{padding:'24px 18px 60px',fontFamily:'system-ui',background:'#f4f7fb',minHeight:'100vh',color:'#102a43'}}><div style={{maxWidth:1050,margin:'0 auto'}}>
    <button onClick={()=>router.push('/staff')} style={{...button(),border:0,padding:0,color:'#0f766e'}}>← Staff Portal</button>
    <header style={{margin:'18px 0 20px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>STAFF ONBOARDING</div><h1 style={{margin:'7px 0 4px'}}>Your onboarding centre</h1><p style={{...muted,margin:0}}>Read your assigned materials and acknowledge the items that require your confirmation.</p></header>
    {error&&<div role="alert" style={{...card,marginBottom:14,color:'#b42318'}}>{error}</div>}
    {!packageRow?<div style={card}><h2 style={{marginTop:0}}>Nothing assigned yet</h2><p style={muted}>Your onboarding package has not been assigned. Please contact LAUREM if you expected one.</p></div>:<>
      {pendingComplianceTasks.length>0&&<section role="status" style={{...card,marginBottom:14,border:'1px solid #f3d29a',background:'#fffaf0'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:'.06em',color:'#8a5a00'}}>COMPLIANCE NOTICE</div><h2 style={{margin:'7px 0 6px',fontSize:18}}>Some verification items are still with LAUREM</h2><p style={{...muted,margin:0,lineHeight:1.55}}>These items are controlled by LAUREM Compliance/HR and do not require an employee acknowledgement in this portal. Your onboarding can continue while they are being reviewed, but they must be recorded before the relevant regulated work can begin.</p></section>}
      <section style={{...card,marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 5px'}}>{packageRow.title}</h2><div style={muted}>Assigned {fmtDate(packageRow.assigned_at)} · {packageRow.audience.replaceAll('_',' ')}</div></div><strong>{progress.percent}%</strong></div><div style={{height:10,background:'#edf2f7',borderRadius:99,overflow:'hidden',marginTop:16}}><div style={{height:'100%',width:`${progress.percent}%`,background:'#102a43'}}/></div><div style={{...muted,fontSize:12,marginTop:8}}>{progress.done}/{progress.total} required tasks fully complete · {progress.acknowledged}/{progress.total} acknowledged</div></section>
      <section style={{display:'grid',gap:12}}>{tasks.map(task=>{
        const guidance = complianceGuidance[task.task_key];
        const isPendingCompliance = Boolean(guidance && task.status === 'pending');
        return <article key={task.id} style={card}><div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}><div style={{maxWidth:720}}><div style={{fontSize:11,fontWeight:900,letterSpacing:'.06em',color:'#0f766e'}}>{task.category.toUpperCase()}</div><h2 style={{fontSize:18,margin:'7px 0 6px'}}>{task.title}</h2><p style={{...muted,margin:0,lineHeight:1.55}}>{task.description||'Review this onboarding item and complete the required action.'}</p>{guidance&&<div style={{marginTop:13,padding:'12px 14px',border:'1px solid #f3d29a',background:'#fffaf0',borderRadius:12}}><div style={{fontSize:12,fontWeight:900,color:'#8a5a00'}}>{guidance.heading}</div><div style={{marginTop:4,fontSize:13,lineHeight:1.5,color:'#5f6c7b'}}>{guidance.text}</div></div>}{task.document_path&&<a href={`/${task.document_path}`} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:11,color:'#0f766e',fontWeight:800}}>Open assigned material ↗</a>}</div><div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}><span style={{padding:'6px 9px',borderRadius:999,background:isPendingCompliance?'#fff3d6':'#edf2f7',fontSize:12,fontWeight:800,color:isPendingCompliance?'#8a5a00':undefined}}>{isPendingCompliance?'Awaiting LAUREM verification':task.status}</span>{task.required&&<span style={{fontSize:11,color:'#627d98'}}>Required</span>}</div></div><div style={{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap',marginTop:16,paddingTop:14,borderTop:'1px solid #edf2f7'}}>{task.acknowledgement_required&&<span style={{fontSize:13,color:task.acknowledged_at?'#0f766e':'#8a5a00',fontWeight:800}}>{task.acknowledged_at?`Acknowledged ${fmtDate(task.acknowledged_at)}`:'Employee acknowledgement required'}</span>}{task.acknowledgement_required&&!task.acknowledged_at&&<button disabled={busy===task.id} onClick={()=>void acknowledge(task.id)} style={button(true)}>{busy===task.id?'Saving…':'I have read and acknowledge'}</button>}{!task.acknowledgement_required&&<span style={{...muted,fontWeight:isPendingCompliance?800:undefined,color:isPendingCompliance?'#8a5a00':undefined}}>{isPendingCompliance?'Awaiting LAUREM to complete this verification':'No employee acknowledgement required'}</span>}</div></article>;
      })}</section>
    </>}
  </div></main>;
}
