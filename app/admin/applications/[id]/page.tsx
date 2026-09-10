'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { recruitmentConfig } from '@/lib/recruitment-config';
import { LAUREM_CANONICAL_ROLES } from '@/lib/laurem-role-policy';

type Candidate = Record<string, any> & { id:string; full_name:string; email:string; role_applied:string|null; status:string; submitted_at:string|null; updated_at:string|null };
type Detail = { application:Candidate; invite:any; interviews:any[]; secondInterviews:any[]; nurseInterview:any; documentRequests:any[]; documents:any[]; evidenceReviews:any[]; readiness:any[]; contracts:any[]; statusHistory:any[]; adminActions:any[]; staff:any; audit:any[] };

const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20,boxShadow:'0 8px 28px rgba(15,23,42,.04)'};
const buttonBase:React.CSSProperties={border:'1px solid #d9e2ec',background:'#fff',color:'#102a43',padding:'10px 13px',borderRadius:9,fontWeight:800,textDecoration:'none',cursor:'pointer'};
const primary:React.CSSProperties={...buttonBase,border:0,background:'#102a43',color:'#fff'};
const muted:React.CSSProperties={color:'#627d98'};

function fmt(value:any){if(!value)return'Not set';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});}
function badge(value:string){return <span style={{display:'inline-block',padding:'6px 9px',borderRadius:999,background:'#edf2f7',fontSize:12,fontWeight:800}}>{value||'Not set'}</span>;}
function show(value:any){if(value===null||value===undefined||value==='')return'Not provided';if(typeof value==='object')return JSON.stringify(value,null,2);return String(value);}

export default function Candidate360Page(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const [data,setData]=useState<Detail|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [secondMessage,setSecondMessage]=useState('');

  async function load(){
    setLoading(true);setError('');
    try{
      const response=await fetch(`/api/admin/applications/${encodeURIComponent(id)}`,{cache:'no-store'});
      const body=await response.json();
      if(response.status===401){router.replace('/admin/login');return;}
      if(!response.ok)throw new Error(body.error||'Unable to load candidate record.');
      setData(body as Detail);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load candidate record.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{if(id)void load();},[id]);

  async function changeStatus(status:string){
    if(!data)return;
    setBusy(true);setError('');
    try{
      const response=await fetch(`/api/admin/applications?id=${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Unable to update status.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update status.');}
    finally{setBusy(false);}
  }

  async function sendSecondInterview(){
    setBusy(true);setSecondMessage('');
    try{
      const response=await fetch('/api/admin/second-interviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({applicationId:id})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Unable to create second interview.');
      setSecondMessage(body.email?.status==='sent'?'Second interview link emailed to the candidate.':'Second interview link created, but email delivery needs attention.');
      await load();
    }catch(e){setSecondMessage(e instanceof Error?e.message:'Unable to create second interview.');}
    finally{setBusy(false);}
  }

  const readiness=useMemo(()=>data?.readiness||[],[data]);
  const requiredOpen=readiness.filter((r:any)=>r.required&&r.status!=='completed'&&r.status!=='waived').length;
  const approvedDocs=data?.documents.filter((d:any)=>d.status==='approved').length||0;
  const latestContract=data?.contracts?.[0];

  if(loading)return <main style={{maxWidth:1160,margin:'0 auto',padding:'40px 20px',fontFamily:'system-ui'}}><div style={card}>Loading Candidate 360…</div></main>;
  if(!data)return <main style={{maxWidth:1160,margin:'0 auto',padding:'40px 20px',fontFamily:'system-ui'}}><div style={card}><p>{error||'Candidate record unavailable.'}</p><Link href="/admin" style={buttonBase}>Back to recruiter workspace</Link></div></main>;

  const a=data.application;
  return <main style={{minHeight:'100vh',background:'#f4f7fb',color:'#102a43',fontFamily:'system-ui',padding:'26px 18px 70px'}}>
    <div style={{maxWidth:1160,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div><Link href="/admin" style={{...buttonBase,textDecoration:'none'}}>← Recruiter workspace</Link><div style={{marginTop:18,fontSize:12,fontWeight:900,letterSpacing:1.3,color:'#0f766e'}}>LAUREM CANDIDATE 360</div><h1 style={{fontSize:40,margin:'5px 0 5px'}}>{a.full_name}</h1><div style={muted}>{a.role_applied||'Role not set'} · {a.email}</div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>{badge(a.status)}<button disabled={busy} onClick={()=>void load()} style={buttonBase}>Refresh</button>{data.staff&&<Link href={`/admin/workforce/${encodeURIComponent(data.staff.id)}`} style={buttonBase}>Staff 360</Link>}</div>
      </div>

      {error&&<div role="alert" style={{...card,marginTop:16,color:'#8a2323'}}>{error}</div>}

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:18}}>
        <Metric label="Readiness blockers" value={requiredOpen}/><Metric label="Approved documents" value={approvedDocs}/><Metric label="Second interviews" value={data.secondInterviews.length}/><Metric label="Contracts" value={data.contracts.length}/>
      </section>

      <section style={{...card,marginTop:18}}><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 5px'}}>Recruitment controls</h2><div style={muted}>Every lifecycle change is recorded against this candidate.</div></div><select value={a.status} disabled={busy} onChange={e=>void changeStatus(e.target.value)} style={{padding:11,border:'1px solid #d9e2ec',borderRadius:9,fontWeight:700}}>{recruitmentConfig.statusFlow.map((status:string)=><option key={status}>{status}</option>)}</select></div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}><button disabled={busy} onClick={()=>void sendSecondInterview()} style={primary}>Send second interview</button>{latestContract&&<Link href={`/contract/${encodeURIComponent(latestContract.id)}`} style={buttonBase}>Open latest contract</Link>}<Link href={`/admin/applications/${encodeURIComponent(id)}/readiness`} style={buttonBase}>Readiness gate</Link><Link href={`/admin/applications/${encodeURIComponent(id)}/contract`} style={buttonBase}>Prepare contract</Link></div>{secondMessage&&<div role="status" style={{marginTop:12,...muted}}>{secondMessage}</div>}</section>

      <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(290px,.7fr)',gap:16,marginTop:16}}>
        <article style={card}><h2 style={{marginTop:0}}>Candidate identity</h2><div style={grid}><Info label="Full name" value={a.full_name}/><Info label="Preferred name" value={a.preferred_name}/><Info label="Email" value={a.email}/><Info label="Phone" value={a.phone}/><Info label="Date of birth" value={a.date_of_birth}/><Info label="Nationality" value={a.nationality}/><Info label="Country of residence" value={a.country_of_residence}/><Info label="Address" value={a.address}/><Info label="Role" value={a.role_applied}/><Info label="Employment type" value={a.employment_type}/><Info label="Start date" value={a.start_date}/><Info label="Consent" value={a.consent?'Yes':'No'}/></div></article>
        <article style={card}><h2 style={{marginTop:0}}>Invitation</h2><Info label="Candidate" value={data.invite?.candidate_name}/><Info label="Invitation role" value={data.invite?.role}/><Info label="Created" value={fmt(data.invite?.created_at)}/><Info label="Expires" value={fmt(data.invite?.expires_at)}/><Info label="Used" value={fmt(data.invite?.used_at)}/><p style={{...muted,fontSize:12,marginTop:18}}>The private token itself is never displayed here.</p></article>
      </section>

      <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Ireland / international pathway</h2><div style={grid}><Info label="Living in UK" value={a.living_in_uk}/><Info label="Current country" value={a.current_country}/><Info label="Work permission" value={a.work_permission}/><Info label="Requires sponsorship" value={a.requires_sponsorship}/><Info label="International experience" value={a.international_experience}/><Info label="Relocation readiness" value={a.relocation_readiness}/></div></section>

      <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Experience and qualifications</h2><Detail label="Care experience" value={a.care_experience}/><Detail label="Qualifications" value={a.qualifications}/><Detail label="Training" value={a.training}/><Detail label="Professional experience" value={a.professional_experience}/><Detail label="Employment history" value={a.employment_history}/><Detail label="Employment gaps" value={a.employment_gaps}/><Detail label="Professional references" value={a.professional_references}/></section>

      <section style={{...card,marginTop:16}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><h2 style={{margin:0}}>Interviews</h2><span style={muted}>{data.interviews.length+data.secondInterviews.length} records</span></div>{data.interviews.length===0&&data.secondInterviews.length===0?<Empty text="No scheduled interviews yet."/>:<div style={{display:'grid',gap:10,marginTop:14}}>{data.interviews.map((i:any)=><article key={i.id} style={subcard}><div style={row}><strong>First interview</strong>{badge(i.status)}</div><div style={muted}>{fmt(i.scheduled_at)} · {i.duration_minutes||60} minutes · {i.location||'Online'}</div>{i.interviewer&&<div style={{marginTop:5}}>Interviewer: {i.interviewer}</div>}{i.meeting_link&&<a href={i.meeting_link} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:8,color:'#0f766e',fontWeight:800}}>Open meeting link</a>}</article>)}{data.secondInterviews.map((i:any)=><article key={i.id} style={subcard}><div style={row}><strong>Second interview</strong>{badge(i.status)}</div><div style={muted}>Sent {fmt(i.sent_at)} · Expires {fmt(i.expires_at)}</div>{i.completed_at&&<div style={{marginTop:5}}>Completed {fmt(i.completed_at)}</div>}{i.answers&&<pre style={pre}>{show(i.answers)}</pre>}</article>)}</div>}</section>

      <section style={{...card,marginTop:16}}><div style={row}><h2 style={{margin:0}}>Documents & evidence</h2><Link href={`/admin/applications/${encodeURIComponent(id)}/documents`} style={buttonBase}>Document workspace</Link></div>{data.documents.length===0?<Empty text="No uploaded documents yet."/>:<div style={{display:'grid',gap:10,marginTop:14}}>{data.documents.map((d:any)=><article key={d.id} style={subcard}><div style={row}><div><strong>{d.document_type}</strong><div style={muted}>{d.original_filename} · {d.mime_type} · {Number(d.file_size_bytes||0).toLocaleString()} bytes</div></div>{badge(d.status)}</div>{d.review_note&&<div style={{marginTop:7,...muted}}>Review: {d.review_note}</div>}<div style={{marginTop:7,fontSize:12,...muted}}>Uploaded {fmt(d.uploaded_at)} · Reviewed {fmt(d.reviewed_at)}</div></article>)}</div>}{data.evidenceReviews.length>0&&<div style={{marginTop:16}}><strong>Evidence review history</strong><div style={{display:'grid',gap:8,marginTop:8}}>{data.evidenceReviews.slice(0,8).map((e:any)=><div key={e.id} style={{borderTop:'1px solid #edf2f7',paddingTop:8}}>{e.evidence_type} · {e.status} · {e.reviewed_by||'System'} · {fmt(e.reviewed_at)}</div>)}</div></div>}</section>

      <section style={{...card,marginTop:16}}><div style={row}><h2 style={{margin:0}}>Readiness gate</h2><Link href={`/admin/applications/${encodeURIComponent(id)}/readiness`} style={buttonBase}>Open gate</Link></div>{readiness.length===0?<Empty text="No readiness checklist has been created yet."/>:<div style={{display:'grid',gap:9,marginTop:14}}>{readiness.map((r:any)=><div key={r.id} style={{border:'1px solid #edf2f7',borderRadius:10,padding:12}}><div style={row}><div><strong>{r.title}</strong>{r.required&&<span style={{marginLeft:8,fontSize:11,fontWeight:800,color:'#8a2323'}}>REQUIRED</span>}</div>{badge(r.status)}</div>{r.notes&&<div style={{...muted,marginTop:5}}>{r.notes}</div>}</div>)}</div>}</section>

      <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Contracts</h2>{data.contracts.length===0?<Empty text="No contracts generated yet."/>:<div style={{display:'grid',gap:10}}>{data.contracts.map((c:any)=><article key={c.id} style={subcard}><div style={row}><strong>Version {c.version} · {c.job_title}</strong>{badge(c.status)}</div><div style={muted}>Type: {c.contract_type} · Start: {c.start_date||'Not set'} · Weekly hours: {c.weekly_hours??c.minimum_weekly_hours??'Not set'}</div><div style={{marginTop:6}}>Issued {fmt(c.issued_at)} · Viewed {fmt(c.viewed_at)} · Accepted {fmt(c.accepted_at)}</div>{c.accepted_by_name&&<div style={{marginTop:5}}>Accepted by: {c.accepted_by_name}</div>}{c.decline_reason&&<div style={{marginTop:5,color:'#8a2323'}}>Decline reason: {c.decline_reason}</div>}</article>)}</div>}</section>

      {data.staff&&<section style={{...card,marginTop:16}}><div style={row}><h2 style={{margin:0}}>Workforce conversion</h2><Link href={`/admin/workforce/${encodeURIComponent(data.staff.id)}`} style={buttonBase}>Open Staff 360</Link></div><div style={{...grid,marginTop:14}}><Info label="Employee number" value={data.staff.employee_number}/><Info label="LAUREM ID" value={data.staff.laurem_id}/><Info label="Status" value={data.staff.employment_status}/><Info label="Job title" value={data.staff.job_title}/><Info label="Start date" value={data.staff.start_date}/><Info label="Location" value={data.staff.location}/></div></section>}

      <section style={{...card,marginTop:16}}><h2 style={{marginTop:0}}>Lifecycle & audit history</h2><div style={{display:'grid',gap:10}}>{data.statusHistory.map((h:any)=><article key={h.id} style={subcard}><div style={row}><strong>{h.from_status||'Start'} → {h.to_status}</strong><span style={muted}>{fmt(h.created_at)}</span></div><div style={muted}>{h.changed_by}{h.note?` · ${h.note}`:''}</div></article>)}{data.adminActions.map((h:any)=><article key={`admin-${h.id}`} style={subcard}><div style={row}><strong>{h.action_type}</strong>{badge(h.outcome)}</div><div style={muted}>{h.actor} · {fmt(h.created_at)}</div>{h.reason&&<div style={{marginTop:5}}>{h.reason}</div>}</article>)}{!data.statusHistory.length&&!data.adminActions.length&&<Empty text="No lifecycle events recorded yet."/>}</div></section>

      <p style={{marginTop:18,fontSize:12,...muted}}>Candidate 360 is admin-only. Private invitation tokens and raw storage credentials are deliberately excluded from the workspace response.</p>
    </div>
  </main>;
}

function Metric({label,value}:{label:string;value:string|number}){return <article style={{...card,padding:'15px 16px'}}><div style={{fontSize:28,fontWeight:900}}>{value}</div><div style={{...muted,fontSize:12,marginTop:3}}>{label}</div></article>;}
function Info({label,value}:{label:string;value:any}){return <div><div style={{fontSize:12,fontWeight:800,...muted}}>{label}</div><div style={{marginTop:3}}>{show(value)}</div></div>;}
function Detail({label,value}:{label:string;value:any}){return <div style={{marginTop:14}}><div style={{fontSize:12,fontWeight:800,...muted}}>{label}</div><pre style={pre}>{show(value)}</pre></div>;}
function Empty({text}:{text:string}){return <p style={{...muted,marginTop:14}}>{text}</p>;}
const grid:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginTop:14};
const subcard:React.CSSProperties={border:'1px solid #edf2f7',borderRadius:12,padding:14};
const row:React.CSSProperties={display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'};
const pre:React.CSSProperties={whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:13,lineHeight:1.55,margin:'5px 0 0',color:'#334e68'};
