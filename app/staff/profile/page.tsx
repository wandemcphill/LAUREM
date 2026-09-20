'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Staff={laurem_id:string|null;employee_number:string;full_name:string;email:string;phone:string|null;job_title:string;employment_status:string;start_date:string|null;location:string|null;portal_address:string|null};
const card:React.CSSProperties={background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:20};
const muted:React.CSSProperties={color:'#627d98'};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'11px 12px',border:'1px solid #dbe5ea',borderRadius:10,font:'inherit'};

export default function StaffProfilePage(){
  const router=useRouter();
  const [staff,setStaff]=useState<Staff|null>(null);
  const [phone,setPhone]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  async function load(){
    const response=await fetch('/api/staff/me',{cache:'no-store'});
    if(response.status===401){router.replace('/staff/login');return;}
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(body.error||'Unable to load your profile.');setLoading(false);return;}
    setStaff(body.staff);setPhone(body.staff.phone||'');setLoading(false);
  }
  useEffect(()=>{void load();},[router]);
  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setSaved(false);setError('');
    const response=await fetch('/api/staff/me',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({phone})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(body.error||'Unable to save your profile.');setBusy(false);return;}
    setStaff(body.staff);setPhone(body.staff.phone||'');setSaved(true);setBusy(false);
  }
  if(loading)return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:24,fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:900,margin:'0 auto',...card}}>Loading profile…</div></main>;
  return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:'28px 18px 60px',fontFamily:'system-ui',color:'#102a43'}}><div style={{maxWidth:900,margin:'0 auto'}}>
    <button onClick={()=>router.push('/staff')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:900}}>← Staff Portal</button>
    <header style={{margin:'18px 0 20px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:'#0f766e'}}>LAUREM CARE</div><h1 style={{margin:'5px 0'}}>My Profile</h1><p style={{margin:0,...muted}}>Review your employment identity and keep your contact number current.</p></header>
    {error&&<div role='alert' style={{...card,marginBottom:14,color:'#b42318',borderColor:'#fed7d7'}}>{error}</div>}
    {staff&&<section style={{display:'grid',gap:14}}>
      <article style={card}><h2 style={{marginTop:0}}>Employment identity</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}><Info label='Full name' value={staff.full_name}/><Info label='Job title' value={staff.job_title}/><Info label='LAUREM ID' value={staff.laurem_id||'Not set'}/><Info label='Employee number' value={staff.employee_number}/><Info label='Email' value={staff.email}/><Info label='Employment status' value={staff.employment_status}/><Info label='Start date' value={staff.start_date||'Not set'}/><Info label='Location' value={staff.location||'Not set'}/><Info label='Portal address' value={staff.portal_address||'Provisioning…'}/></div></article>
      <form onSubmit={save} style={card}><h2 style={{marginTop:0}}>Contact details</h2><label style={{fontWeight:900,fontSize:13}}>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} style={{...input,marginTop:7}} maxLength={40} required/></label><p style={{...muted,fontSize:13}}>Your employment email, LAUREM ID and employee number are controlled by LAUREM. Contact Admin / HR to correct those records.</p><div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><button disabled={busy} style={{border:0,borderRadius:10,background:'#102a43',color:'#fff',padding:'10px 14px',fontWeight:900}}>{busy?'Saving…':'Save phone number'}</button>{saved&&<span style={{color:'#0f766e',fontWeight:800}}>Saved.</span>}</div></form>
    </section>}
  </div></main>;
}
function Info({label,value}:{label:string;value:string}){return <div><div style={{...muted,fontSize:12}}>{label}</div><strong style={{display:'block',marginTop:4,overflowWrap:'anywhere'}}>{value}</strong></div>}