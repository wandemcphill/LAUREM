'use client';

import { useEffect, useMemo, useState } from 'react';
import { StaffAction, StaffBadge, StaffNotice, StaffPanel, StaffSectionHeader } from '@/components/StaffPortalUI';

type Props={caseId:string;mode:'admin'|'staff'};

const STATUS_LABELS:Record<string,string>={
  not_started:'Not started',
  requested:'Requested',
  issued:'Issued',
  draft:'Draft',
  submitted:'Submitted',
  scheduled:'Scheduled',
  completed:'Completed',
  pending:'Pending',
  granted:'Granted',
  refused:'Refused',
  withdrawn:'Withdrawn',
  action_required:'Action required',
  confirmed:'Confirmed',
};

function localDateTime(iso:string|null|undefined){
  if(!iso)return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return '';
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function isoDateTime(value:string){return value?new Date(value).toISOString():null;}
function formatDate(value:string|null|undefined){
  if(!value)return 'Not recorded';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'Not recorded':d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
}
function label(value:string){return STATUS_LABELS[value]||value.replaceAll('_',' ');}

export default function VisaHelpApplicationTrackingPanel({caseId,mode}:Props){
  const [tracking,setTracking]=useState<any|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [form,setForm]=useState<Record<string,string>>({});

  async function load(){
    setLoading(true);setError('');
    try{
      const endpoint=mode==='admin'
        ? '/api/admin/workforce/visa-help/application?caseId='+encodeURIComponent(caseId)
        : '/api/staff/visa-help/application';
      const response=await fetch(endpoint,{cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to load application tracking.');
      setTracking(body.tracking||null);
      const t=body.tracking||{};
      setForm({
        cos_status:t.cos_status||'not_started',
        cos_reference:t.cos_reference||'',
        cos_requested_at:localDateTime(t.cos_requested_at),
        cos_issued_at:localDateTime(t.cos_issued_at),
        application_status:t.application_status||'not_started',
        application_reference:t.application_reference||'',
        application_submitted_at:localDateTime(t.application_submitted_at),
        identity_status:t.identity_status||'not_started',
        identity_method:t.identity_method||'',
        identity_appointment_at:localDateTime(t.identity_appointment_at),
        identity_completed_at:localDateTime(t.identity_completed_at),
        decision_status:t.decision_status||'pending',
        decision_reference:t.decision_reference||'',
        decision_date:localDateTime(t.decision_date),
        decision_notes:t.decision_notes||'',
        right_to_work_status:t.right_to_work_status||'pending',
        right_to_work_checked_at:localDateTime(t.right_to_work_checked_at),
        right_to_work_checked_by:t.right_to_work_checked_by||'',
        sponsor_notes:t.sponsor_notes||'',
      });
    }catch(e){setError(e instanceof Error?e.message:'Unable to load application tracking.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[caseId,mode]);

  const timeline=useMemo(()=>{
    if(!tracking)return [];
    return [
      ['CoS','cos_status',tracking.cos_issued_at||tracking.cos_requested_at],
      ['Visa application','application_status',tracking.application_submitted_at],
      ['Identity / biometrics','identity_status',tracking.identity_completed_at||tracking.identity_appointment_at],
      ['UKVI decision','decision_status',tracking.decision_date],
      ['Right to work','right_to_work_status',tracking.right_to_work_checked_at],
    ] as Array<[string,string,string|null]>;
  },[tracking]);

  async function save(){
    setSaving(true);setError('');setMessage('');
    try{
      const payload={caseId,...Object.fromEntries(Object.entries(form).map(([key,value])=>{
        return [key,['cos_requested_at','cos_issued_at','application_submitted_at','identity_appointment_at','identity_completed_at','decision_date','right_to_work_checked_at'].includes(key)?isoDateTime(value):value];
      }))};
      const response=await fetch('/api/admin/workforce/visa-help/application',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to save application tracking.');
      setTracking(body.tracking);
      setMessage('Application tracking saved.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to save application tracking.');}
    finally{setSaving(false);}
  }

  if(loading)return <StaffPanel><div className="staff-empty">Loading application tracking…</div></StaffPanel>;
  if(error)return <StaffPanel><StaffNotice tone="danger"><strong>Application tracker</strong><p>{error}</p></StaffNotice><StaffAction onClick={()=>void load()}>Retry</StaffAction></StaffPanel>;
  if(!tracking)return null;

  if(mode==='staff'){
    return <StaffPanel>
      <StaffSectionHeader title="Sponsor-side application tracking" copy="LAUREM records progress after the route and evidence review. Dates shown here are recorded case dates, not guarantees of a UKVI decision."/>
      <div className="staff-home-lane-grid">
        {timeline.map(([title,status,date])=><article key={title} className="staff-home-lane"><StaffBadge tone={status==='completed'||status==='issued'||status==='submitted'||status==='granted'||status==='confirmed'?'live':status==='action_required'||status==='refused'?'danger':'attention'}>{label(status)}</StaffBadge><strong>{title}</strong><span>{formatDate(date)}</span></article>)}
      </div>
      <div className="staff-visa-info-grid">
        <Info label="CoS reference" value={tracking.cos_reference}/>
        <Info label="Application reference" value={tracking.application_reference}/>
        <Info label="Identity method" value={tracking.identity_method}/>
        <Info label="Decision reference" value={tracking.decision_reference}/>
        <Info label="Right-to-work check" value={formatDate(tracking.right_to_work_checked_at)}/>
      </div>
      {(tracking.decision_status==='refused'||tracking.right_to_work_status==='action_required')&&<StaffNotice tone="warning"><strong>Action recorded by LAUREM</strong><p>{tracking.decision_status==='refused'?'The tracker records a refused application decision. Contact LAUREM through the Visa Help workspace for the next case review.':'The tracker records a right-to-work follow-up as required.'}</p></StaffNotice>}
    </StaffPanel>;
  }

  return <StaffPanel>
    <StaffSectionHeader title="Sponsor-side application tracking" copy="Internal sponsor controls for CoS, application submission, identity checks, UKVI outcome and post-decision right-to-work confirmation."/>
    <div className="staff-panel-nested">
      <StaffSectionHeader title="Certificate of Sponsorship" copy="Record the sponsor-side CoS request and issue details."/>
      <div className="staff-form-grid">
        <Select label="Status" value={form.cos_status} onChange={v=>setForm(x=>({...x,cos_status:v}))} options={['not_started','requested','issued']}/>
        <Text label="CoS reference" value={form.cos_reference} onChange={v=>setForm(x=>({...x,cos_reference:v}))}/>
        <DateTime label="Requested at" value={form.cos_requested_at} onChange={v=>setForm(x=>({...x,cos_requested_at:v}))}/>
        <DateTime label="Issued at" value={form.cos_issued_at} onChange={v=>setForm(x=>({...x,cos_issued_at:v}))}/>
      </div>
    </div>
    <div className="staff-panel-nested">
      <StaffSectionHeader title="Visa application" copy="Track the application lifecycle and the external reference supplied by the applicant or UKVI."/>
      <div className="staff-form-grid">
        <Select label="Status" value={form.application_status} onChange={v=>setForm(x=>({...x,application_status:v}))} options={['not_started','draft','submitted']}/>
        <Text label="Application reference" value={form.application_reference} onChange={v=>setForm(x=>({...x,application_reference:v}))}/>
        <DateTime label="Submitted at" value={form.application_submitted_at} onChange={v=>setForm(x=>({...x,application_submitted_at:v}))}/>
      </div>
    </div>
    <div className="staff-panel-nested">
      <StaffSectionHeader title="Identity / biometrics" copy="Record how identity was proved and the appointment/completion dates."/>
      <div className="staff-form-grid">
        <Select label="Status" value={form.identity_status} onChange={v=>setForm(x=>({...x,identity_status:v}))} options={['not_started','scheduled','completed']}/>
        <Text label="Method" value={form.identity_method} onChange={v=>setForm(x=>({...x,identity_method:v}))} placeholder="eVisa / ID Check app / VAC / UKVCAS"/>
        <DateTime label="Appointment at" value={form.identity_appointment_at} onChange={v=>setForm(x=>({...x,identity_appointment_at:v}))}/>
        <DateTime label="Completed at" value={form.identity_completed_at} onChange={v=>setForm(x=>({...x,identity_completed_at:v}))}/>
      </div>
    </div>
    <div className="staff-panel-nested">
      <StaffSectionHeader title="UKVI decision" copy="Record the actual outcome when it is received. A planned decision date is not treated as an outcome."/>
      <div className="staff-form-grid">
        <Select label="Decision status" value={form.decision_status} onChange={v=>setForm(x=>({...x,decision_status:v}))} options={['pending','granted','refused','withdrawn']}/>
        <Text label="Decision reference" value={form.decision_reference} onChange={v=>setForm(x=>({...x,decision_reference:v}))}/>
        <DateTime label="Decision date" value={form.decision_date} onChange={v=>setForm(x=>({...x,decision_date:v}))}/>
        <TextArea label="Internal decision notes" value={form.decision_notes} onChange={v=>setForm(x=>({...x,decision_notes:v}))}/>
      </div>
    </div>
    <div className="staff-panel-nested">
      <StaffSectionHeader title="Post-decision right to work" copy="Close the loop by recording the sponsor's follow-up check after a decision."/>
      <div className="staff-form-grid">
        <Select label="Status" value={form.right_to_work_status} onChange={v=>setForm(x=>({...x,right_to_work_status:v}))} options={['pending','action_required','confirmed']}/>
        <DateTime label="Checked at" value={form.right_to_work_checked_at} onChange={v=>setForm(x=>({...x,right_to_work_checked_at:v}))}/>
        <Text label="Checked by" value={form.right_to_work_checked_by} onChange={v=>setForm(x=>({...x,right_to_work_checked_by:v}))}/>
      </div>
    </div>
    <div className="staff-panel-nested">
      <StaffSectionHeader title="Sponsor notes" copy="Internal notes stay on the admin side and are not exposed through the staff tracking endpoint."/>
      <TextArea label="Sponsor notes" value={form.sponsor_notes} onChange={v=>setForm(x=>({...x,sponsor_notes:v}))}/>
    </div>
    <div className="staff-home-panel-actions"><StaffAction onClick={()=>void load()}>Reset</StaffAction><StaffAction primary onClick={()=>void save()} disabled={saving}>{saving?'Saving…':'Save application tracking'}</StaffAction></div>
    {message&&<StaffNotice tone="success"><strong>Saved</strong><p>{message}</p></StaffNotice>}
    <div className="staff-panel-nested"><StaffSectionHeader title="Recorded timeline" copy="This timeline is generated from the structured application tracker and the corresponding milestone states."/><div className="staff-home-lane-grid">{timeline.map(([title,status,date])=><article key={title} className="staff-home-lane"><StaffBadge tone={status==='completed'||status==='issued'||status==='submitted'||status==='granted'||status==='confirmed'?'live':status==='action_required'||status==='refused'?'danger':'attention'}>{label(status)}</StaffBadge><strong>{title}</strong><span>{formatDate(date)}</span></article>)}</div></div>
  </StaffPanel>;
}

function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <label className="staff-form-field"><span className="staff-form-label">{label}</span><select className="staff-form-input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(option=><option key={option} value={option}>{labelFor(option)}</option>)}</select></label>;}
function Text({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="staff-form-field"><span className="staff-form-label">{label}</span><input className="staff-form-input" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;}
function DateTime({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="staff-form-field"><span className="staff-form-label">{label}</span><input className="staff-form-input" type="datetime-local" value={value} onChange={e=>onChange(e.target.value)}/></label>;}
function TextArea({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="staff-form-field" style={{gridColumn:'1 / -1'}}><span className="staff-form-label">{label}</span><textarea className="staff-form-input" rows={4} value={value} onChange={e=>onChange(e.target.value)}/></label>;}
function Info({label,value}:{label:string;value:any}){return <div className="staff-visa-info"><span>{label}</span><strong>{value||'Not recorded'}</strong></div>;}
function labelFor(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,match=>match.toUpperCase());}
