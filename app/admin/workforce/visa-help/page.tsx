'use client';

import { useEffect, useState } from 'react';
import { StaffAction, StaffBadge, StaffLoading, StaffNotice, StaffPage, StaffPageHeader, StaffPageInner, StaffPanel, StaffSectionHeader } from '@/components/StaffPortalUI';

type Row={id:string;status:string;legal_team_requested:boolean;self_complete_selected:boolean;selected_route:string;target_role:string;target_work_location:string;current_visa_type:string;current_visa_end_date:string;updated_at:string;created_at:string;staff:any;recommendation:any;answers:any;dependants:any[];document_checklist:any[];legal_notes:string|null;staff_message:string|null};

export default function AdminVisaHelpPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<'all'|'legal'|'self'|'review'>('all');
  const [selected,setSelected]=useState<Row|null>(null);
  const [notes,setNotes]=useState('');

  async function load(){
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/admin/workforce/visa-help',{cache:'no-store'});
      const b=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(b.error||'Unable to load Visa Help cases.');
      setRows(b.cases||[]);
      if(selected){
        const fresh=(b.cases||[]).find((x:Row)=>x.id===selected.id);
        if(fresh){setSelected(fresh);setNotes(fresh.legal_notes||'');}
      }
    }catch(e){setError(e instanceof Error?e.message:'Unable to load Visa Help cases.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  async function updateCase(patch:Record<string,any>){
    if(!selected)return;
    setError('');
    try{
      const r=await fetch('/api/admin/workforce/visa-help',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({caseId:selected.id,...patch})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(b.error||'Unable to update case.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update case.');}
  }

  if(loading)return <StaffLoading label="Loading Visa Help queue…"/>;
  const visible=rows.filter(row=>filter==='all'||(filter==='legal'&&row.legal_team_requested)||(filter==='self'&&row.self_complete_selected)||(filter==='review'&&['legal_review','awaiting_documents'].includes(row.status)));

  return <StaffPage><StaffPageInner>
    <StaffPageHeader eyebrow="WORKFORCE · IMMIGRATION" title="Visa Help Queue" subtitle="Review preliminary route assessments, legal-support requests, dependant information, document readiness and staff questions." actions={<StaffAction onClick={()=>void load()}>Refresh</StaffAction>}/>
    {error&&<StaffNotice tone="danger"><strong>Visa Help error</strong><p>{error}</p></StaffNotice>}
    <div className="staff-stat-grid">
      <div className="staff-stat"><div className="staff-stat-value">{rows.length}</div><div className="staff-stat-label">Open cases</div></div>
      <div className="staff-stat"><div className="staff-stat-value">{rows.filter(x=>x.legal_team_requested).length}</div><div className="staff-stat-label">Legal team requested</div></div>
      <div className="staff-stat"><div className="staff-stat-value">{rows.filter(x=>x.status==='awaiting_documents').length}</div><div className="staff-stat-label">Awaiting documents</div></div>
      <div className="staff-stat"><div className="staff-stat-value">{rows.filter(x=>x.status==='ready_for_submission').length}</div><div className="staff-stat-label">Ready for submission</div></div>
    </div>
    <StaffPanel>
      <div className="staff-home-panel-actions">
        {(['all','legal','self','review'] as const).map(value=><StaffAction key={value} primary={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'All':value==='legal'?'Legal queue':value==='self'?'Self-complete':'Needs review'}</StaffAction>)}
      </div>
      {!visible.length?<div className="staff-empty">No cases match this view.</div>:
      <div className="staff-document-list">{visible.map(row=><article key={row.id} className={'staff-document-card'+(row.legal_team_requested?' staff-document-card--attention':'')}>
        <div className="staff-document-main"><div className="staff-document-icon" aria-hidden="true">V</div><div className="staff-document-copy"><div className="staff-document-topline"><span className="staff-document-category">{row.updated_at?new Date(row.updated_at).toLocaleDateString('en-GB',{dateStyle:'medium'}):'Case'}</span><StaffBadge tone={row.legal_team_requested?'attention':'neutral'}>{row.legal_team_requested?'Legal help requested':row.status.replaceAll('_',' ')}</StaffBadge></div><h3>{row.staff?.full_name||'Staff member'}</h3><p>{row.target_role||row.staff?.job_title||'Role not recorded'} · {row.recommendation?.title||row.selected_route}</p><div className="staff-document-meta">Current visa: {row.current_visa_type||'Not recorded'}{row.current_visa_end_date?' · Expires '+row.current_visa_end_date:''} · Dependants: {Array.isArray(row.dependants)?row.dependants.length:0}</div></div></div>
        <div className="staff-document-actions"><StaffAction primary onClick={()=>{setSelected(row);setNotes(row.legal_notes||'');}}>Open case</StaffAction></div>
      </article>)}</div>}
    </StaffPanel>

    {selected&&<StaffPanel>
      <StaffSectionHeader title={selected.staff?.full_name||'Visa Help case'} copy="Case review. The preliminary engine is a screening aid; legal/support staff can override the workflow after reviewing the evidence."/>
      <div className="staff-stat-grid">
        <div className="staff-stat"><div className="staff-stat-value">{selected.recommendation?.title||'Review'}</div><div className="staff-stat-label">Preliminary route</div></div>
        <div className="staff-stat"><div className="staff-stat-value">{selected.recommendation?.decision||'unknown'}</div><div className="staff-stat-label">Screening decision</div></div>
        <div className="staff-stat"><div className="staff-stat-value">{selected.current_visa_end_date||'Not set'}</div><div className="staff-stat-label">Current visa end</div></div>
        <div className="staff-stat"><div className="staff-stat-value">{Array.isArray(selected.dependants)?selected.dependants.length:0}</div><div className="staff-stat-label">Dependants</div></div>
      </div>
      <div className="staff-workforce-grid">
        <StaffPanel>
          <StaffSectionHeader title="Staff answers" copy="Information supplied through the Visa Help questionnaire."/>
          <div className="staff-visa-info-grid">
            <Info label="Current visa" value={selected.current_visa_type}/>
            <Info label="Work location" value={selected.target_work_location}/>
            <Info label="Months working for LAUREM" value={selected.answers?.monthsWorkingForLaurem}/>
            <Info label="Student condition" value={String(selected.answers?.studentCourseFinished??'Not answered')}/>
            <Info label="Previous refusal" value={String(selected.answers?.previousImmigrationRefusals??'Not answered')}/>
            <Info label="Previous overstay/breach" value={String(selected.answers?.previousOverstayOrBreach??'Not answered')}/>
            <Info label="Criminal convictions" value={String(selected.answers?.criminalConvictions??'Not answered')}/>
            <Info label="English evidence" value={selected.answers?.englishEvidence}/>
            <Info label="Maintenance evidence" value={selected.answers?.maintenanceEvidence}/>
          </div>
          {selected.staff_message&&<StaffNotice><strong>Staff message</strong><p>{selected.staff_message}</p></StaffNotice>}
        </StaffPanel>
        <StaffPanel>
          <StaffSectionHeader title="Recommendation conditions" copy="The reasons and conditions returned by the screening engine."/>
          <p className="staff-card-copy">{selected.recommendation?.reason}</p>
          <div className="staff-home-lane-grid">{(selected.recommendation?.conditions||[]).map((item:string)=><article className="staff-home-lane" key={item}><StaffBadge tone="neutral">Condition</StaffBadge><span>{item}</span></article>)}</div>
        </StaffPanel>
      </div>
      <StaffPanel>
        <StaffSectionHeader title="Dependants" copy="Each dependant is captured separately so legal/support staff can assess identity, location, relationship and immigration position."/>
        {!selected.dependants?.length?<div className="staff-empty">No dependants were entered.</div>:
        <div className="staff-document-list">{selected.dependants.map((dep:any,index:number)=><article key={index} className="staff-document-card"><div className="staff-document-main"><div className="staff-document-copy"><span className="staff-document-category">{dep.relationship||'Dependant'}</span><h3>{dep.fullName||'Name not recorded'}</h3><p>{dep.currentLocation||'Location not recorded'} · Current visa: {dep.currentVisaType||'Not recorded'}</p><div className="staff-document-meta">DOB {dep.dateOfBirth||'Not set'} · Nationality {dep.nationality||'Not set'}</div></div></div></article>)}</div>}
      </StaffPanel>
      <StaffPanel>
        <StaffSectionHeader title="Legal / admin action" copy="Move the case through the workflow as evidence and review are completed."/>
        <label className="staff-form-field"><span className="staff-form-label">Internal legal notes</span><textarea className="staff-form-input" rows={5} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Record evidence gaps, legal review notes, or the next action."/></label>
        <div className="staff-home-panel-actions">
          <StaffAction onClick={()=>void updateCase({status:'awaiting_staff',legalNotes:notes})}>Request more information</StaffAction>
          <StaffAction onClick={()=>void updateCase({status:'awaiting_documents',legalNotes:notes})}>Request documents</StaffAction>
          <StaffAction primary onClick={()=>void updateCase({status:'ready_for_submission',legalNotes:notes})}>Mark ready for submission</StaffAction>
          <StaffAction onClick={()=>void updateCase({status:'closed',legalNotes:notes})}>Close case</StaffAction>
        </div>
      </StaffPanel>
    </StaffPanel>}
  </StaffPageInner></StaffPage>;
}

function Info({label,value}:{label:string;value:any}){return <div className="staff-visa-info"><span>{label}</span><strong>{value||'Not recorded'}</strong></div>;}
