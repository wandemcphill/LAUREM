'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { moneyGbp, visaPathwayLabel, type LauremVisaPathway } from '@/lib/laurem-visa-sponsorship';

type Data = {
  staff: any;
  application: any;
  recommendation: { pathway: LauremVisaPathway; basis: string; label: string };
  case: any;
  invoice: any;
  events: any[];
  visaDocuments: any[];
};

const card: React.CSSProperties = { background:'#fff', border:'1px solid #e5eaf0', borderRadius:16, padding:20 };
const muted: React.CSSProperties = { color:'#627d98' };
const button = (primary=false): React.CSSProperties => ({ border:primary?'0':'1px solid #dbe5ea', background:primary?'#102a43':'#fff', color:primary?'#fff':'#102a43', borderRadius:10, padding:'10px 13px', fontWeight:800, cursor:'pointer', textDecoration:'none' });

function fmt(value:any) {
  if (!value) return 'Not set';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
}

export default function StaffVisaSponsorshipPage() {
  const router = useRouter();
  const [data,setData] = useState<Data|null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [routeChoice,setRouteChoice] = useState<LauremVisaPathway>('visa_switch');
  const [currentVisaType,setCurrentVisaType] = useState('');
  const [currentVisaExpiryDate,setCurrentVisaExpiryDate] = useState('');
  const [passportNumber,setPassportNumber] = useState('');
  const [passportExpiryDate,setPassportExpiryDate] = useState('');
  const [passportCountry,setPassportCountry] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/staff/visa-sponsorship',{cache:'no-store'});
      if(response.status===401){router.replace('/staff/login');return;}
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to load visa sponsorship workspace.');
      setData(body);
      setRouteChoice(body.recommendation.pathway);
      const info=body.case?.additional_information||{};
      setCurrentVisaType(info.current_visa_type||'');
      setCurrentVisaExpiryDate(info.current_visa_expiry_date||'');
      setPassportNumber(info.passport_number||'');
      setPassportExpiryDate(info.passport_expiry_date||'');
      setPassportCountry(info.passport_country||body.application?.nationality||'');
    } catch(e){setError(e instanceof Error?e.message:'Unable to load visa sponsorship workspace.');}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[]);

  async function requestSupport() {
    setBusy(true); setError('');
    try {
      const response=await fetch('/api/staff/visa-sponsorship',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pathway:routeChoice})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to create visa support request.');
      await load();
    } catch(e){setError(e instanceof Error?e.message:'Unable to create visa support request.');}
    finally{setBusy(false);}
  }

  async function saveInfo(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response=await fetch('/api/staff/visa-sponsorship',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({currentVisaType,currentVisaExpiryDate,passportNumber,passportExpiryDate,passportCountry})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Unable to save visa information.');
      await load();
    } catch(e){setError(e instanceof Error?e.message:'Unable to save visa information.');}
    finally{setBusy(false);}
  }

  if(loading) return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:24,fontFamily:'system-ui'}}><div style={{maxWidth:1100,margin:'0 auto',...card}}>Loading visa support workspace…</div></main>;

  if(!data) return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:24,fontFamily:'system-ui'}}><div style={{maxWidth:1100,margin:'0 auto',...card}}><button onClick={()=>router.push('/staff')} style={button()}>← Staff Portal</button><p style={{color:'#b42318'}}>{error||'Unable to load visa support workspace.'}</p></div></main>;

  const c=data.case;
  const invoice=data.invoice;
  return <main style={{minHeight:'100vh',background:'#f4f7fb',padding:'24px 18px 70px',fontFamily:'system-ui',color:'#102a43'}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <button onClick={()=>router.push('/staff')} style={button()}>← Staff Portal</button>
      <header style={{...card,marginTop:16}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.3,color:'#0f766e'}}>IMMIGRATION SUPPORT</div>
        <h1 style={{margin:'7px 0 5px'}}>Visa Switch & Sponsorship</h1>
        <p style={{...muted,margin:0}}>LAUREM can prepare your sponsorship support case using information already held in your recruitment record. Immigration eligibility and final submission remain subject to the relevant UK rules and LAUREM administrative review.</p>
      </header>

      {error&&<div role="alert" style={{...card,marginTop:14,color:'#8a2323'}}>{error}</div>}

      {!c ? <section style={{...card,marginTop:14}}>
        <h2 style={{marginTop:0}}>Request immigration support</h2>
        <div style={{...muted,lineHeight:1.55}}>Based on your existing recruitment information, the portal recommends <strong style={{color:'#102a43'}}>{data.recommendation.label}</strong>.</div>
        <label style={{display:'block',marginTop:16,fontWeight:800,fontSize:13}}>Support route
          <select value={routeChoice} onChange={e=>setRouteChoice(e.target.value as LauremVisaPathway)} style={{display:'block',width:'100%',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:10,font:'inherit'}}>
            <option value="visa_switch">UK visa switch support</option>
            <option value="international_sponsorship">International visa sponsorship support</option>
          </select>
        </label>
        <div style={{marginTop:12,padding:14,borderRadius:12,background:'#f7fafc',fontSize:13}}>
          <strong>Your existing application</strong>
          <div style={{...muted,marginTop:5}}>{data.application.role_applied||data.staff.job_title} · {data.application.current_country||data.application.country_of_residence||'Country not recorded'} · Living in UK: {data.application.living_in_uk||'Not recorded'} · Sponsorship need: {data.application.requires_sponsorship||'Not recorded'}</div>
        </div>
        <button disabled={busy} onClick={()=>void requestSupport()} style={{...button(true),marginTop:16}}>{busy?'Creating request…':'Request visa support & £2,000 invoice'}</button>
      </section> : <><section style={{...card,marginTop:14}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,color:'#0f766e'}}>CASE</div><h2 style={{margin:'5px 0'}}>{visaPathwayLabel(c.pathway)}</h2><div style={muted}>Status: <strong style={{color:'#102a43'}}>{c.status.replaceAll('_',' ')}</strong> · Requested {fmt(c.requested_at)}</div></div><span style={{padding:'7px 10px',borderRadius:999,background:'#edf2f7',fontSize:12,fontWeight:900}}>{c.pathway}</span></div><p style={{...muted,lineHeight:1.55}}>{c.pathway_basis}</p></section>

      <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.2fr) minmax(300px,.8fr)',gap:14,marginTop:14}}>
        <article style={card}><h2 style={{marginTop:0}}>Information already held</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}><Info label="Full name" value={data.application.full_name}/><Info label="Date of birth" value={data.application.date_of_birth}/><Info label="Nationality" value={data.application.nationality}/><Info label="Current country" value={data.application.current_country||data.application.country_of_residence}/><Info label="Role applied for" value={data.application.role_applied||data.staff.job_title}/><Info label="Start date" value={data.application.start_date||data.staff.start_date}/><Info label="Living in UK" value={data.application.living_in_uk}/><Info label="Work permission" value={data.application.work_permission}/><Info label="Requires sponsorship" value={data.application.requires_sponsorship}/><Info label="Phone" value={data.application.phone}/><Info label="Email" value={data.application.email}/><Info label="Address" value={data.application.address}/></div></article>
        <article style={card}><h2 style={{marginTop:0}}>£2,000 LAUREM invoice</h2><div style={{fontSize:30,fontWeight:900}}>£{(Number(invoice?.amount_pence||200000)/100).toFixed(2)}</div><div style={{...muted,marginTop:4}}>{invoice?.invoice_number||'Invoice being prepared'}</div><div style={{marginTop:15,padding:13,borderRadius:11,background:'#f7fafc',fontSize:13}}><strong>{invoice?.description}</strong><p style={{...muted,margin:'7px 0 0'}}>Status: {invoice?.status||'issued'} · Issued {invoice?.issue_date||'today'}</p></div><p style={{...muted,fontSize:12,lineHeight:1.5}}>This is a LAUREM service invoice. It is not presented as a UK government visa fee. Payment instructions and final terms will appear here once configured by LAUREM management.</p><button onClick={()=>window.print()} style={{...button(),marginTop:7}}>Print / Save invoice</button></article>
      </section>

      <section style={{...card,marginTop:14}}>
        <h2 style={{marginTop:0}}>Additional information</h2>
        <p style={{...muted,lineHeight:1.55}}>Only add information that was not already collected during recruitment. LAUREM will use the existing recruitment record plus these details when preparing the case.</p>
        <form onSubmit={saveInfo} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
          <label style={{fontSize:13,fontWeight:800}}>Current visa type<input value={currentVisaType} onChange={e=>setCurrentVisaType(e.target.value)} placeholder="e.g. Student, Graduate" style={input}/></label>
          <label style={{fontSize:13,fontWeight:800}}>Current visa expiry<input type="date" value={currentVisaExpiryDate} onChange={e=>setCurrentVisaExpiryDate(e.target.value)} style={input}/></label>
          <label style={{fontSize:13,fontWeight:800}}>Passport number<input value={passportNumber} onChange={e=>setPassportNumber(e.target.value)} style={input}/></label>
          <label style={{fontSize:13,fontWeight:800}}>Passport expiry<input type="date" value={passportExpiryDate} onChange={e=>setPassportExpiryDate(e.target.value)} style={input}/></label>
          <label style={{fontSize:13,fontWeight:800}}>Passport country<input value={passportCountry} onChange={e=>setPassportCountry(e.target.value)} style={input}/></label>
          <div style={{display:'flex',alignItems:'end'}}><button disabled={busy} style={{...button(true),width:'100%'}}>Save additional information</button></div>
        </form>
      </section>

      <section style={{...card,marginTop:14}}>
        <h2 style={{marginTop:0}}>Certificate of Sponsorship</h2>
        {data.visaDocuments.length===0?<p style={muted}>Your CoS will appear here when LAUREM has uploaded it to your private Staff Portal.</p>:<div style={{display:'grid',gap:9}}>{data.visaDocuments.map((doc:any)=><div key={doc.id} style={{padding:14,border:'1px solid #edf2f7',borderRadius:11,display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><strong>{doc.title}</strong><div style={{...muted,fontSize:12}}>{doc.original_filename||doc.mime_type} · Uploaded {fmt(doc.issued_at)}</div></div><a href={`/api/staff/documents/${encodeURIComponent(doc.id)}/download`} download style={{...button(true),display:'inline-block'}}>Download</a></div>)}</div>}
        {c.sms_reference&&<div style={{...muted,fontSize:13,marginTop:12}}>SMS reference: <strong style={{color:'#102a43'}}>{c.sms_reference}</strong></div>}
        {c.cos_number&&<div style={{...muted,fontSize:13,marginTop:5}}>CoS number: <strong style={{color:'#102a43'}}>{c.cos_number}</strong></div>}
      </section>

      <section style={{...card,marginTop:14}}>
        <h2 style={{marginTop:0}}>Case timeline</h2>
        {!data.events.length?<p style={muted}>No case events yet.</p>:<div style={{display:'grid',gap:8}}>{data.events.map((event:any)=><div key={event.id} style={{padding:'10px 0',borderTop:'1px solid #edf2f7'}}><strong>{event.event_type.replaceAll('_',' ')}</strong><div style={{...muted,fontSize:12}}>{fmt(event.created_at)} · {event.actor_type}</div></div>)}</div>}
      </section>
      </>}
    </div>
  </main>;
}

function Info({label,value}:{label:string;value:any}) { return <div><div style={{fontSize:12,color:'#627d98'}}>{label}</div><div style={{fontWeight:800,marginTop:4,wordBreak:'break-word'}}>{value||'Not recorded'}</div></div>; }
const input:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',marginTop:7,padding:11,border:'1px solid #cbd5e1',borderRadius:10,font:'inherit'};
