'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lauremInternationalNurseContractConfig as contractConfig } from '@/lib/laurem-international-nurse-contract-config';
import { validateContractCompleteness, ContractValidationResult } from '@/lib/laurem-contract-validator';
import LauremContractDocument from '@/components/LauremContractDocument';
import { isNurseRole } from '@/lib/laurem-company-config';

type Application = { id:string; full_name:string; email:string; role_applied:string; living_in_uk?:string|null; start_date?:string|null; address?:string|null };
type ContractResult = { id?:string; status?:string; acceptanceLink?:string; documentPackLink?:string; email?:{status?:string;error?:string}; completeness?:ContractValidationResult; contract?:{id?:string;status?:string;issued_at?:string|null;viewed_at?:string|null;accepted_at?:string|null;accepted_by_name?:string|null;version?:number|null;job_title?:string|null;contract_content?:string|null;contract_type?:string|null} };

function eligible(app: Application | null) { return Boolean(app); }

export default function ContractWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [application, setApplication] = useState<Application|null>(null);
  const [message, setMessage] = useState<string|null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ContractResult|null>(null);
  const [form, setForm] = useState({
    employmentType: 'Permanent',
    startDate: '',
    continuousEmploymentDate: '',
    contractEndDate: '',
    weeklyHours: String(contractConfig.defaultWeeklyHours),
    normalWorkingDays: 'Monday to Friday / Rostered shift rotation',
    shiftPattern: 'Standard operational rota',
    annualSalary: ''
    hourlyRate: '',
    payFrequency: 'Monthly in arrears',
    payMethod: 'Direct bank transfer (BACS)',
    postRegistrationSalary: ''
    preRegistrationSalary: ''
    visaRoute: contractConfig.defaultVisaRoute,
    sponsorshipOccupationCode: contractConfig.defaultOccupationCode,
    nmcStatus: 'Working towards full NMC registration',
    registrationDeadline: ''
    probation: '6 months',
    probationConditions: 'Satisfactory monthly reviews and completion of induction/clinical competencies',
    noticePeriodEmployee: '1 week during probation; 4 weeks thereafter in writing',
    noticePeriodEmployer: '1 week during probation; 4 weeks thereafter (or statutory minimum)',
    holidayEntitlement: '28 days per annum (inclusive of public holidays)',
    holidayPayCalculation: 'Calculated at normal basic rate / 52-week average for variable hours',
    sickPay: 'Statutory Sick Pay (SSP) in accordance with statutory eligibility rules',
    paidLeave: 'Statutory family leave (maternity, paternity, adoption, shared parental, bereavement)',
    contractualBenefits: 'Workplace pension contributions and visa sponsorship administration',
    nonContractualBenefits: 'Employee assistance program and wellness support',
    mandatoryTraining: 'Mandatory care induction, safeguarding, and health & safety modules',
    mandatoryTrainingPaidBy: 'Employer funded and paid as working time',
    pensionScheme: 'Auto-enrolment workplace pension scheme',
    workLocations: '557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE and approved care sites',
    relocationSupport: ''
    repayableCosts: '',
    repaymentSchedule: '0–12 months: 100%; 13–24 months: 50%; 25–36 months: 25%; after 36 months: 0%',
    repaymentMethod: '',
    repaymentMethod: 'Deduction from final salary by mutual agreement or structured monthly payment plan upon voluntary departure.',
  });

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    fetch('/api/admin/applications',{cache:'no-store'})
      .then(async (r)=>{const p=await r.json();if(!r.ok)throw new Error(p.error||'Unable to load application.');return p;})
      .then(async (p)=>{
        const app=(p.applications||[]).find((a:Application)=>a.id===id)||null;
        setApplication(app);
        if (!app) return;

        setForm((prev) => ({
          ...prev,
          startDate: app.start_date || prev.startDate,
          continuousEmploymentDate: app.start_date || prev.continuousEmploymentDate,
        }));

        const contractResponse=await fetch('/api/admin/contracts?applicationId='+encodeURIComponent(id),{cache:'no-store'});
        const contractPayload=await contractResponse.json().catch(()=>({}));
        if (!contractResponse.ok) throw new Error(contractPayload.error||'Unable to load existing contract.');
        const existing=contractPayload.contract;
        if (existing) {
          setResult({ id: existing.id, status: existing.status, contract: existing });
          setMessage(existing.status==='draft'
            ? 'A saved contract draft is available. Review completeness before issuing.'
            : 'Existing contract status: '+existing.status+'.');
        }
      })
      .catch((e)=>setMessage(e instanceof Error?e.message:'Unable to load application.'));
  },[id]);

  const isEligible=useMemo(()=>eligible(application),[application]);

  // Live client-side completeness check
  const liveValidation = useMemo(() => {
    if (!application) return { valid: false, errors: [], missingFields: [] };
    const isInternationalNurse = isNurseRole(application.role_applied) && application.living_in_uk === 'No';
    return validateContractCompleteness(
      application.role_applied,
      {
        employeeName: application.full_name,
        employeeAddress: application.address,
        jobTitle: application.role_applied,
        employmentType: form.employmentType,
        startDate: form.startDate || application.start_date,
        continuousEmploymentDate: form.continuousEmploymentDate || form.startDate || application.start_date,
        minimumWeeklyHours: Number(form.weeklyHours) || 37.5,
        normalWorkingDays: form.normalWorkingDays,
        shiftPattern: form.shiftPattern,
        workLocations: form.workLocations.split(',').map(s=>s.trim()).filter(Boolean),
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
        annualSalary: form.annualSalary ? Number(form.annualSalary) : null,
        payFrequency: form.payFrequency,
        payMethod: form.payMethod,
        holidayEntitlement: form.holidayEntitlement,
        holidayPayCalculation: form.holidayPayCalculation,
        sickPay: form.sickPay,
        paidLeave: form.paidLeave,
        contractualBenefits: form.contractualBenefits,
        nonContractualBenefits: form.nonContractualBenefits,
        probation: form.probation,
        probationConditions: form.probationConditions,
        noticePeriodEmployee: form.noticePeriodEmployee,
        noticePeriodEmployer: form.noticePeriodEmployer,
        mandatoryTraining: form.mandatoryTraining,
        mandatoryTrainingPaidBy: form.mandatoryTrainingPaidBy,
        pensionScheme: form.pensionScheme,
        visaRoute: form.visaRoute,
        sponsorshipOccupationCode: form.sponsorshipOccupationCode,
        nmcStatus: form.nmcStatus,
        registrationDeadline: form.registrationDeadline,
        preRegistrationSalary: form.preRegistrationSalary ? Number(form.preRegistrationSalary) : null,
        preRegistrationRole: form.preRegistrationRole,
        registrationTransitionTerms: form.registrationTransitionTerms,
        postRegistrationSalary: form.postRegistrationSalary ? Number(form.postRegistrationSalary) : null,
        relocationSupport: form.relocationSupport,
        repayableCosts: form.repayableCosts,
        repaymentSchedule: form.repaymentSchedule,
        repaymentMethod: form.repaymentMethod,
      },
      isInternationalNurse ? 'international' : 'uk'
    );
  }, [application, form]);

  function setField(name:keyof typeof form,value:string){setForm((current)=>({...current,[name]:value}));}

  async function generate(){
    if(!application||!isEligible)return;
    setBusy(true);setMessage(null);setResult(null);
    try{
      const response=await fetch('/api/admin/contracts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        applicationId:application.id,
        employmentType:form.employmentType,
        startDate:form.startDate,
        continuousEmploymentDate:form.continuousEmploymentDate,
        weeklyHours:Number(form.weeklyHours),
        normalWorkingDays:form.normalWorkingDays,
        shiftPattern:form.shiftPattern,
        annualSalary:form.annualSalary?Number(form.annualSalary):undefined,
        hourlyRate:form.hourlyRate?Number(form.hourlyRate):undefined,
        payFrequency:form.payFrequency,
        payMethod:form.payMethod,
        postRegistrationSalary:form.postRegistrationSalary?Number(form.postRegistrationSalary):undefined,
        preRegistrationSalary:form.preRegistrationSalary?Number(form.preRegistrationSalary):undefined,
        visaRoute:form.visaRoute,
        sponsorshipOccupationCode:form.sponsorshipOccupationCode,
        nmcStatus:form.nmcStatus,
        registrationDeadline:form.registrationDeadline,
        probation:form.probation,
        probationConditions:form.probationConditions,
        noticePeriodEmployee:form.noticePeriodEmployee,
        noticePeriodEmployer:form.noticePeriodEmployer,
        holidayEntitlement:form.holidayEntitlement,
        holidayPayCalculation:form.holidayPayCalculation,
        sickPay:form.sickPay,
        paidLeave:form.paidLeave,
        contractualBenefits:form.contractualBenefits,
        nonContractualBenefits:form.nonContractualBenefits,
        mandatoryTraining:form.mandatoryTraining,
        mandatoryTrainingPaidBy:form.mandatoryTrainingPaidBy,
        pensionScheme:form.pensionScheme,
        workLocations:form.workLocations.split(',').map(v=>v.trim()).filter(Boolean),
        relocationSupport:form.relocationSupport,
        repayableCosts:form.repayableCosts,
        repaymentSchedule:form.repaymentSchedule,
        repaymentMethod:form.repaymentMethod,
      })});
      const payload=await response.json(); if(!response.ok)throw new Error(payload.error||'Unable to generate contract.');
      const normalized={...payload,id:payload.id||payload.contract?.id,status:payload.status||payload.contract?.status,contract:payload.contract,completeness:payload.completeness};
      setResult(normalized);setMessage('Contract draft generated. Review the completeness status card before issuing.');
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to generate contract.');}finally{setBusy(false);}
  }

  async function issue(){
    if(!result?.id)return;
    if(!liveValidation.valid) {
      setMessage('Cannot issue contract: material employment particulars are missing.');
      return;
    }
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(`/api/admin/contracts?id=${encodeURIComponent(result.id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'issued'})});
      const payload=await response.json(); if(!response.ok)throw new Error(payload.error||'Unable to issue contract.');
      const normalized={...payload,id:payload.id||payload.contract?.id,status:payload.status||payload.contract?.status,contract:payload.contract};
      setResult(normalized);setMessage(payload.email?.status==='sent'?'Complete offer package issued and emailed to the candidate.':'Complete offer package issued, but email delivery needs attention.');
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to issue contract.');}finally{setBusy(false);}
  }

  if(!application)return <main className="wrap" style={{padding:40}}><p>{message||'Loading candidate...'}</p>{id&&<Link href={`/admin/applications/${encodeURIComponent(id)}`}>Back to candidate</Link>}</main>;
  return <main className="wrap" style={{padding:'34px 0 80px',maxWidth:1000}}>
    <Link href={`/admin/applications/${id}`} style={{color:'var(--muted)',textDecoration:'none'}}>← Candidate file</Link>
    <header style={{margin:'18px 0 24px'}}><p style={{color:'var(--accent)',fontWeight:800,letterSpacing:'.08em'}}>LAUREM EMPLOYMENT CONTRACT</p><h1>{application.full_name}</h1><p style={{color:'var(--muted)'}}>{application.role_applied} · {application.email}</p></header>
    {message&&<div role="alert" className="card" style={{padding:14,marginBottom:16}}>{message}</div>}

    {/* Live Completeness Status Card */}
    <section className="card" style={{padding:22,marginBottom:16,borderLeft:liveValidation.valid?'4px solid #10b981':'4px solid #f59e0b',background:liveValidation.valid?'#f0fdf4':'#fffbeb'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2 style={{margin:'0 0 4px',fontSize:18,color:liveValidation.valid?'#065f46':'#92400e'}}>
            Contract Completeness Status: {liveValidation.valid ? 'COMPLETE & READY TO ISSUE' : 'INCOMPLETE (MISSING PARTICULARS)'}
          </h2>
          <p style={{margin:0,fontSize:14,color:liveValidation.valid?'#047857':'#b45309'}}>
            {liveValidation.valid
              ? 'All required material employment particulars are specified. Contract may be issued for signature.'
              : 'The contract is in draft state. All missing material particulars must be provided before issuing.'}
          </p>
        </div>
      </div>
      {!liveValidation.valid && liveValidation.errors.length > 0 && (
        <ul style={{marginTop:12,paddingLeft:20,color:'#b45309',fontSize:13}}>
          {liveValidation.errors.map((err, idx) => (
            <li key={idx}><strong>[{err.code}]</strong> {err.message}</li>
          ))}
        </ul>
      )}
    </section>

    {result?.contract?.contract_content && (
      <section className="card" style={{padding:22,marginBottom:16}}>
        <div style={{marginBottom:14}}>
          <h2 style={{margin:'0 0 6px'}}>Contract document preview</h2>
          <p style={{color:'var(--muted)',lineHeight:1.6,margin:0}}>
            This preview uses official LAUREM letterhead and current Statement of Particulars layout.
          </p>
        </div>
        <LauremContractDocument
          content={result.contract.contract_content}
          employeeName={application.full_name}
          jobTitle={result.contract.job_title || application.role_applied}
          status={result.contract.status}
          version={result.contract.version}
          acceptedByName={result.contract.accepted_by_name}
          acceptedAt={result.contract.accepted_at}
        />
      </section>
    )}

    <section className="card" style={{padding:22,marginBottom:16}}><h2>Core Employment Particulars</h2><div style={grid}>
      <Field label="Employment Type" value={form.employmentType} onChange={(v)=>setField('employmentType',v)} />
      <Field label="Start Date" value={form.startDate} onChange={(v)=>setField('startDate',v)} type="date" />
      <Field label="Continuous Employment Date" value={form.continuousEmploymentDate} onChange={(v)=>setField('continuousEmploymentDate',v)} type="date" />
      <Field label="Fixed-term End Date (where applicable)" value={form.contractEndDate} onChange={(v)=>setField('contractEndDate',v)} type="date" />
      <Field label="Weekly Contracted Hours" value={form.weeklyHours} onChange={(v)=>setField('weeklyHours',v)} type="number" />
      <Field label="Normal Working Days / Pattern" value={form.normalWorkingDays} onChange={(v)=>setField('normalWorkingDays',v)} />
      <Field label="Shift Pattern" value={form.shiftPattern} onChange={(v)=>setField('shiftPattern',v)} />
      <Field label="Pay Frequency" value={form.payFrequency} onChange={(v)=>setField('payFrequency',v)} />
      <Field label="Payment Method" value={form.payMethod} onChange={(v)=>setField('payMethod',v)} />
      <Field label="Hourly Rate (£, where applicable)" value={form.hourlyRate} onChange={(v)=>setField('hourlyRate',v)} type="number" />
      <Field label="Annual Salary (£, where applicable)" value={form.annualSalary} onChange={(v)=>setField('annualSalary',v)} type="number" />
      <Field label="Work Locations" value={form.workLocations} onChange={(v)=>setField('workLocations',v)} multiline />
    </div></section>

    <section className="card" style={{padding:22,marginBottom:16}}><h2>International Nurse & Sponsorship Particulars</h2><div style={grid}>
      <Field label="Post-registration Salary (£)" value={form.postRegistrationSalary} onChange={(v)=>setField('postRegistrationSalary',v)} type="number" />
      <Field label="Pre-registration Salary (£)" value={form.preRegistrationSalary} onChange={(v)=>setField('preRegistrationSalary',v)} type="number" />
      <Field label="Visa Route" value={form.visaRoute} onChange={(v)=>setField('visaRoute',v)} />
      <Field label="Sponsorship Occupation Code (SOC)" value={form.sponsorshipOccupationCode} onChange={(v)=>setField('sponsorshipOccupationCode',v)} />
      <Field label="NMC Status" value={form.nmcStatus} onChange={(v)=>setField('nmcStatus',v)} />
      <Field label="Registration Deadline Date" value={form.registrationDeadline} onChange={(v)=>setField('registrationDeadline',v)} type="date" />
      <Field label="Pre-registration Job Title" value={form.preRegistrationRole} onChange={(v)=>setField('preRegistrationRole',v)} />
      <Field label="Registration Transition Terms" value={form.registrationTransitionTerms} onChange={(v)=>setField('registrationTransitionTerms',v)} multiline />
    </div></section>

    <section className="card" style={{padding:22,marginBottom:16}}><h2>Leave, Pension, Notice & Training</h2><div style={grid}>
      <Field label="Probation Duration" value={form.probation} onChange={(v)=>setField('probation',v)} />
      <Field label="Probation Conditions" value={form.probationConditions} onChange={(v)=>setField('probationConditions',v)} />
      <Field label="Employee Notice Period" value={form.noticePeriodEmployee} onChange={(v)=>setField('noticePeriodEmployee',v)} />
      <Field label="Employer Notice Period" value={form.noticePeriodEmployer} onChange={(v)=>setField('noticePeriodEmployer',v)} />
      <Field label="Holiday Entitlement" value={form.holidayEntitlement} onChange={(v)=>setField('holidayEntitlement',v)} />
      <Field label="Holiday Pay Calculation" value={form.holidayPayCalculation} onChange={(v)=>setField('holidayPayCalculation',v)} />
      <Field label="Sick Pay" value={form.sickPay} onChange={(v)=>setField('sickPay',v)} />
      <Field label="Other Paid Leave" value={form.paidLeave} onChange={(v)=>setField('paidLeave',v)} />
      <Field label="Contractual Benefits" value={form.contractualBenefits} onChange={(v)=>setField('contractualBenefits',v)} />
      <Field label="Non-Contractual Benefits" value={form.nonContractualBenefits} onChange={(v)=>setField('nonContractualBenefits',v)} />
      <Field label="Mandatory Training" value={form.mandatoryTraining} onChange={(v)=>setField('mandatoryTraining',v)} />
      <Field label="Mandatory Training Funding" value={form.mandatoryTrainingPaidBy} onChange={(v)=>setField('mandatoryTrainingPaidBy',v)} />
      <Field label="Pension Scheme" value={form.pensionScheme} onChange={(v)=>setField('pensionScheme',v)} />
    </div></section>

    <section className="card" style={{padding:22,marginBottom:16}}><h2>Relocation & Repayment Schedule</h2>
      <Field label="Relocation Support" value={form.relocationSupport} onChange={(v)=>setField('relocationSupport',v)} multiline />
      <Field label="Potentially Repayable Employer-Funded Expenses" value={form.repayableCosts} onChange={(v)=>setField('repayableCosts',v)} multiline />
      <Field label="Repayment Schedule / Tapering" value={form.repaymentSchedule} onChange={(v)=>setField('repaymentSchedule',v)} multiline />
      <Field label="Repayment Method" value={form.repaymentMethod} onChange={(v)=>setField('repaymentMethod',v)} multiline />
      <p style={{color:'var(--muted)',fontSize:13,lineHeight:1.6,marginTop:14}}>Employer liability recruitment costs (agency fees, sponsor licence, ISC, CoS fees, interview costs) are strictly excluded by law.</p>
    </section>

    <section className="card" style={{padding:22}}><h2>Issue Complete Offer Package</h2><p style={{color:'var(--muted)',lineHeight:1.65}}>Generate a draft first. Once all required material particulars are complete, issue the contract offer package to the candidate.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button disabled={busy} onClick={generate} style={{...primaryButton,opacity:busy?.6:1}}>{busy?'Generating…':result?.status==='draft'?'Regenerate draft':'Generate draft contract'}</button>{result?.id&&result.status==='draft'&&<button disabled={busy || !liveValidation.valid} onClick={issue} style={{...primaryButton,background:liveValidation.valid?'var(--ink)':'#9ca3af',cursor:liveValidation.valid?'pointer':'not-allowed',opacity:busy?.6:1}}>{busy?'Issuing…':liveValidation.valid?'Issue complete offer package and email candidate':'Cannot Issue (Missing Particulars)'}</button>}</div>{result?.id&&<div style={{marginTop:18,padding:15,background:'var(--soft)',borderRadius:10}}><strong>Contract status: {result.status||'draft'}</strong>{result.status==='draft'&&<p style={{margin:'7px 0 0',color:'var(--muted)'}}>Draft generated. Review terms and ensure completeness before issuing.</p>}{result.acceptanceLink&&<><div style={{marginTop:12,fontSize:12,color:'var(--muted)'}}>Acceptance link</div><div style={{marginTop:5,wordBreak:'break-all'}}>{result.acceptanceLink}</div>{result.documentPackLink&&<><div style={{marginTop:12,fontSize:12,color:'var(--muted)'}}>Job Description & Handbook link</div><div style={{marginTop:5,wordBreak:'break-all'}}>{result.documentPackLink}</div></>}</>}</div>}</section>
  </main>;
}

function Field({label,value,onChange,type='text',multiline=false}:{label:string;value:string;onChange:(value:string)=>void;type?:string;multiline?:boolean}){return <label style={{display:'block',marginBottom:13}}><span style={{display:'block',fontSize:12,fontWeight:800,marginBottom:6}}>{label}</span>{multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} style={inputStyle}/>:<input type={type} value={value} onChange={e=>onChange(e.target.value)} style={inputStyle}/>}</label>}
const grid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14};
const inputStyle={width:'100%',padding:11,border:'1px solid var(--line)',borderRadius:9,font:'inherit'};
const primaryButton={marginTop:10,background:'var(--ink)',color:'white',border:0,padding:'12px 18px',borderRadius:9,fontWeight:800,cursor:'pointer' as const};
