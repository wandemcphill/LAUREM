'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { recruitmentConfig } from '@/lib/recruitment-config';

type Candidate = Record<string, any> & {
  id: string;
  full_name: string;
  email: string;
  role_applied: string | null;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
};
type Assessment = Record<string, any> & {
  id: string;
  round: number;
  role: string;
  pathway: string;
  status: string;
  score: number | null;
  total_questions: number | null;
  pass_percent: number | null;
  percent: number | null;
  second_interview_id: string | null;
  started_at: string;
  submitted_at: string | null;
};
type Detail = {
  application: Candidate;
  invite: any;
  interviews: any[];
  secondInterviews: any[];
  assessments: Assessment[];
  nurseInterview: any;
  documentRequests: any[];
  documents: any[];
  evidenceReviews: any[];
  readiness: any[];
  contracts: any[];
  statusHistory: any[];
  adminActions: any[];
  staff: any;
  audit: any[];
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5eaf0', borderRadius: 16, padding: 20, boxShadow: '0 8px 28px rgba(15,23,42,.04)',
};
const subcard: React.CSSProperties = { border: '1px solid #edf2f7', borderRadius: 12, padding: 14, background: '#fbfcfe' };
const buttonBase: React.CSSProperties = { border: '1px solid #d9e2ec', background: '#fff', color: '#102a43', padding: '10px 13px', borderRadius: 9, fontWeight: 800, textDecoration: 'none', cursor: 'pointer' };
const primary: React.CSSProperties = { ...buttonBase, border: 0, background: '#102a43', color: '#fff' };
const muted: React.CSSProperties = { color: '#627d98' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 };
const statusTransitions: Record<string, string[]> = {
  Enquiry: ['Invited', 'Rejected', 'Withdrawn'], Invited: ['Application', 'Rejected', 'Withdrawn'], Application: ['Screening', 'Rejected', 'Withdrawn'], Screening: ['Interview', 'Documents', 'Rejected', 'Withdrawn'], Interview: ['Second Interview', 'Documents', 'Offer', 'Rejected', 'Withdrawn'], 'Second Interview': ['Documents', 'Offer', 'Rejected', 'Withdrawn'], Documents: ['Sponsorship', 'Offer', 'Onboarding', 'Rejected', 'Withdrawn'], Sponsorship: ['Offer', 'Rejected', 'Withdrawn'], Offer: ['Onboarding', 'Rejected', 'Withdrawn'], Onboarding: ['Hired', 'Rejected', 'Withdrawn'], Hired: [], Rejected: [], Withdrawn: [],
};
const pre: React.CSSProperties = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f7fafc', border: '1px solid #edf2f7', borderRadius: 10, padding: 12, overflowX: 'auto', fontSize: 12 };
function fmt(value: any) { if (!value) return 'Not set'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); }
function badge(value: string) { return <span style={{ display: 'inline-block', padding: '6px 9px', borderRadius: 999, background: '#edf2f7', fontSize: 12, fontWeight: 800 }}>{value}</span>; }

export default function Candidate360Page() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = String(params.id || '');
  const [data,setData]=useState<Detail|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [notice,setNotice]=useState<string|null>(null); const [busy,setBusy]=useState(false);
  async function load(){ if(!id)return; setLoading(true); setError(null); try{const r=await fetch(`/api/admin/applications/detail?applicationId=${encodeURIComponent(id)}`,{cache:'no-store'});const b=await r.json();if(!r.ok)throw new Error(b.error||'Unable to load the candidate workspace.');setData(b);}catch(e){setError(e instanceof Error?e.message:'Unable to load the candidate workspace.');}finally{setLoading(false);} }
  useEffect(()=>{void load();},[id]);
  async function changeStatus(status:string){ setBusy(true);setError(null);setNotice(null);try{const r=await fetch(`/api/admin/applications?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});const b=await r.json();if(!r.ok)throw new Error(b.error||'Unable to update application status.');setNotice(`Application moved to ${b.application?.status||status}.`);await load();}catch(e){setError(e instanceof Error?e.message:'Unable to update application status.');}finally{setBusy(false);} }
  async function sendSecondInterview(){setBusy(true);setError(null);setNotice(null);try{const r=await fetch('/api/admin/second-interviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({applicationId:id})});const b=await r.json();if(!r.ok)throw new Error(b.error||'Unable to create the second-stage invitation.');setNotice('Second-stage assessment issued.');await load();}catch(e){setError(e instanceof Error?e.message:'Unable to create the second-stage invitation.');}finally{setBusy(false);} }
  const readiness = useMemo(() => data?.readiness || [], [data]); const requiredOpen = readiness.filter((item: any) => item.required && item.status !== 'completed' && item.status !== 'waived').length; const approvedDocs = data?.documents.filter((document: any) => document.status === 'approved').length || 0;
  if(loading)return <main style={{maxWidth:1160,margin:'0 auto',padding:'40px 20px',fontFamily:'system-ui'}}><div style={card}>Loading Candidate 360…</div></main>;
  if(!data)return <main style={{maxWidth:1160,margin:'0 auto',padding:'40px 20px',fontFamily:'system-ui'}}><div style={card}><p>{error||'Candidate record unavailable.'}</p><Link href="/admin" style={buttonBase}>Back to recruiter workspace</Link></div></main>;
  const application=data.application; const round1Assessment=data.assessments.find((assessment)=>assessment.round===1); const round2Assessment=data.assessments.find((assessment)=>assessment.round===2); const activeSecondInvitation=data.secondInterviews.find((item:any)=>item.status==='sent'&&item.expires_at&&new Date(item.expires_at).getTime()>Date.now()); const availableStatuses=[application.status,...(statusTransitions[application.status]||[])].filter((status,index,values)=>values.indexOf(status)===index); const applicationData=application.application_data&&typeof application.application_data==='object'?application.application_data:{}; const pathway=String((applicationData as any).pathway||(application.living_in_uk==='Yes'?'uk':application.living_in_uk==='No'?'international':''));
  return <main style={{minHeight:'100vh',background:'#f4f7fb',color:'#102a43',fontFamily:'system-ui',padding:'26px 18px 70px'}}><div style={{maxWidth:1160,margin:'0 auto'}}>
    <div style={row}><div><Link href="/admin" style={buttonBase}>← Recruiter workspace</Link><div style={{marginTop:18,fontSize:12,fontWeight:900,letterSpacing:1.3,color:'#0f766e'}}>LAUREM CANDIDATE 360</div><h1 style={{fontSize:40,margin:'5px 0 5px'}}>{application.full_name}</h1><div style={muted}>{application.role_applied||'Role not set'} · {application.email}</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>{badge(application.status)}<button disabled={busy} onClick={()=>void load()} style={buttonBase}>Refresh</button>{data.staff&&<Link href={`/admin/workforce/${encodeURIComponent(data.staff.id)}`} style={buttonBase}>Staff 360</Link>}</div></div>
    {error&&<div role="alert" style={{...card,marginTop:16,color:'#8a2323'}}>{error}</div>}{notice&&<div role="status" style={{...card,marginTop:16,color:'#176b4f'}}>{notice}</div>}
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:18}}><Metric label="Readiness blockers" value={requiredOpen}/><Metric label="Approved documents" value={approvedDocs}/><Metric label="Scheduled interviews" value={data.interviews.length}/><Metric label="Round 1" value={round1Assessment?.status||'Not started'}/><Metric label="Round 2" value={round2Assessment?.status||'Locked'}/><Metric label="Contracts" value={data.contracts.length}/></section>
    <section style={{...card,marginTop:18}}><div style={row}><div><h2 style={{margin:'0 0 5px'}}>Recruitment controls</h2><div style={muted}>Lifecycle and assessment progression are recorded against this candidate.</div></div><select value={application.status} disabled={busy} onChange={(event)=>void changeStatus(event.target.value)} aria-label="Recruitment status" style={{padding:11,border:'1px solid #d9e2ec',borderRadius:9,fontWeight:700}}>{availableStatuses.map((status)=><option key={status}>{status}</option>)}</select></div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14,alignItems:'stretch'}}>
      {application.status==='Application'&&<button disabled={busy} onClick={()=>void changeStatus('Screening')} style={primary}>Move to screening</button>}
      {application.status==='Screening'&&<div style={{...subcard,flex:'1 1 320px'}}><div style={{fontWeight:800}}>First assessment</div><div style={{...muted,fontSize:13,marginTop:4}}>The candidate should receive the 20-question role-based assessment automatically after application submission.</div></div>}
      {round1Assessment?.status==='in_progress'&&<div style={{...subcard,flex:'1 1 320px'}}><div style={{fontWeight:800}}>Round 1 in progress</div><div style={{...muted,fontSize:13,marginTop:4}}>20 role-specific objective questions are assigned to this candidate.</div></div>}
      {round1Assessment?.status==='passed'&&activeSecondInvitation&&<div style={{...subcard,flex:'1 1 320px'}}><div style={{fontWeight:800}}>Round 1 passed</div><div style={{...muted,fontSize:13,marginTop:4}}>Score {round1Assessment.percent}% against the {round1Assessment.pass_percent||80}% cutoff. Round 2 invitation is active.</div></div>}
      {round1Assessment?.status==='passed'&&!activeSecondInvitation&&<button disabled={busy} onClick={()=>void sendSecondInterview()} style={primary}>Reissue second stage</button>}
      {round1Assessment?.status==='failed'&&<div style={{...subcard,flex:'1 1 320px'}}><div style={{fontWeight:800}}>Round 1 not passed</div><div style={{...muted,fontSize:13,marginTop:4}}>Score {round1Assessment.percent}% against the {round1Assessment.pass_percent||80}% cutoff.</div></div>}
      {round2Assessment?.status==='submitted'&&<div style={{...subcard,flex:'1 1 320px'}}><div style={{fontWeight:800}}>Round 2 completed</div><div style={{...muted,fontSize:13,marginTop:4}}>The practical and theory assessment is ready for recruiter review.</div></div>}
      {['Offer','Onboarding','Hired'].includes(application.status)&&<Link href={`/admin/applications/${encodeURIComponent(id)}/contract`} style={buttonBase}>Prepare contract</Link>}
      <Link href={`/admin/applications/${encodeURIComponent(id)}/readiness`} style={buttonBase}>Readiness gate</Link>
    </div></section>
    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(290px,.7fr)',gap:16,marginTop:16}}><article style={card}><h2 style={{marginTop:0}}>Candidate identity</h2><div style={grid}><Info label="Full name" value={application.full_name}/><Info label="Preferred name" value={application.preferred_name}/><Info label="Email" value={application.email}/><Info label="Phone" value={application.phone}/><Info label="Pathway" value={pathway||'Not recorded'}/><Info label="Role" value={application.role_applied}/></div></article><article style={card}><h2 style={{marginTop:0}}>Assessment summary</h2>{round1Assessment?<div style={subcard}><div style={row}><strong>Round 1</strong>{badge(round1Assessment.status)}</div><div style={{...muted,fontSize:13,marginTop:8}}>{round1Assessment.score!=null?`Score ${round1Assessment.score}/${round1Assessment.total_questions||20} (${round1Assessment.percent}%)`:'Not submitted yet'}</div></div>:<div style={subcard}>Round 1 not started.</div>}{round2Assessment&&<div style={{...subcard,marginTop:10}}><div style={row}><strong>Round 2</strong>{badge(round2Assessment.status)}</div><div style={{...muted,fontSize:13,marginTop:8}}>20 practical/theory questions selected for {round2Assessment.role}.</div></div>}</article></section>
    <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Application pathway</h2><div style={subcard}><strong>{pathway==='international'?'International applicant':pathway==='uk'?'UK-based applicant':'Pathway not recorded'}</strong><div style={{...muted,fontSize:13,marginTop:4}}>Taken from the candidate's submitted application pathway.</div></div></section>
    <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Recruitment history</h2>{(data.statusHistory||[]).length?<div style={{display:'grid',gap:8}}>{data.statusHistory.map((item:any)=><div key={item.id} style={subcard}><strong>{item.from_status||'Start'} → {item.to_status}</strong><div style={{...muted,fontSize:12,marginTop:4}}>{fmt(item.created_at)} · {item.changed_by}</div>{item.note&&<div style={{fontSize:13,marginTop:6}}>{item.note}</div>}</div>)}</div>:<div style={muted}>No status history yet.</div>}</section>
  </div></main>;
}
function Metric({label,value}:{label:string;value:string|number}){return <div style={card}><div style={{fontSize:12,color:'#627d98'}}>{label}</div><div style={{fontSize:24,fontWeight:800,marginTop:5}}>{value}</div></div>}
function Info({label,value}:{label:string;value:any}){return <div><div style={{fontSize:11,color:'#829ab1',textTransform:'uppercase',letterSpacing:.5}}>{label}</div><div style={{fontWeight:700,marginTop:3}}>{value||'Not set'}</div></div>}
