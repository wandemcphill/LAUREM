'use client';

import { FormEvent, useMemo, useState } from 'react';
import { lauremCompany } from '@/lib/laurem-company-config';
import { getLauremNurseFirstInterviewQuestions } from '@/lib/laurem-nurse-interviews';

const trainingOptions = ['Moving and Handling', 'Hand Hygiene for Care', 'GDPR', 'Fire Safety', 'PPE', 'Infection Control', 'Manual Handling', 'Lone Working & Personal Safety', 'Sharps Awareness'];

type Draft = Record<string, unknown> & { references: Array<Record<string, string>>; employment_history: Array<Record<string, string>> };

const initial: Draft = {
  role_applied: 'Registered Nurse', pathway: 'uk', full_name: '', preferred_name: '', email: '', phone: '', date_of_birth: '', nationality: '', country_of_residence: '', address: '',
  employment_type: 'Full time', start_date: '', driving_licence: 'No', vehicle_access: 'No', availability: {}, nmc_number: '', rcn_number: '', band: '', qualifications: '', care_experience: '', professional_experience: '', training: {}, references: [{ name: '', position: '', organisation: '', email: '', telephone: '' }, { name: '', position: '', organisation: '', email: '', telephone: '' }],
  employment_history: [{ employer: '', jobTitle: '', from: '', to: '', responsibilities: '', reasonForLeaving: '' }], employment_gaps: [], right_to_work_status: '', work_permission: '', requires_sponsorship: 'No', international_experience: '', relocation_readiness: '', supporting_documents: [], consent: false,
  uk_family: '', previous_uk_immigration: '', dependants: 'No', dependant_count: 0, passport_number: '', passport_expiry: '', visa_history: '', accommodation_plan: '', living_in_uk: 'Yes',
};

export default function ApplicationPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useMemo(() => { params.then((p) => setToken(p.token)); return null; }, [params]);

  function update(key: string, value: unknown) { setDraft((current) => ({ ...current, [key]: value })); setError(null); }
  function updateNested(group: string, key: string, value: unknown) { setDraft((current) => ({ ...current, [group]: { ...(current[group] as Record<string, unknown> || {}), [key]: value } })); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true); setError(null);
    const payload = { ...draft, living_in_uk: draft.pathway === 'uk' ? 'Yes' : 'No', current_country: draft.country_of_residence };
    try {
      const response = await fetch('/api/applications', { method: 'POST', headers: { 'content-type': 'application/json', 'x-invitation-token': token }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to submit your application.');
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit your application.'); }
    finally { setSaving(false); }
  }

  if (done) return <main className="wrap" style={{ padding: '80px 0' }}><section className="card" style={{ padding: 36, textAlign: 'center' }}><p style={{ color: 'var(--accent)', fontWeight: 800 }}>APPLICATION RECEIVED</p><h1>Thank you for applying to {lauremCompany.tradingName}.</h1><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your application has been securely submitted. The recruitment team will review your information and contact you about the next stage.</p></section></main>;

  const nurseQuestions = getLauremNurseFirstInterviewQuestions(draft.pathway as 'uk' | 'international');
  const steps = ['Role & pathway', 'Personal details', 'Nursing & experience', 'References & history', 'Right to work & declarations'];
  const progress = Math.round(((step + 1) / steps.length) * 100);

  return <main className="wrap" style={{ padding: '40px 0 80px', maxWidth: 900 }}><header style={{ marginBottom: 20 }}><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>{lauremCompany.tradingName.toUpperCase()} RECRUITMENT</p><h1 style={{ marginBottom: 8 }}>Candidate application</h1><p style={{ color: 'var(--muted)' }}>Complete your application carefully. Your progress stays on this device until you submit.</p><div style={{ height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden', marginTop: 18 }}><div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)' }} /></div><p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>Step {step + 1} of {steps.length}: {steps[step]}</p></header>

  {error && <div role="alert" className="card" style={{ padding: 14, marginBottom: 14, color: '#8a2323' }}>{error}</div>}
  <form onSubmit={submit}>{step === 0 && <Card title="Role and pathway"><label>Role<select value={String(draft.role_applied)} onChange={(e) => update('role_applied', e.target.value)}><option>Registered Nurse</option><option>Senior Support Worker</option><option>Support Worker</option><option>Healthcare Assistant</option></select></label><label>Application pathway<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{['uk', 'international'].map((p) => <button type="button" key={p} onClick={() => update('pathway', p)} style={{ padding: '11px 14px', borderRadius: 9, border: '1px solid var(--line)', background: draft.pathway === p ? 'var(--ink)' : 'white', color: draft.pathway === p ? 'white' : 'var(--ink)', fontWeight: 700 }}>{p === 'uk' ? 'UK-based applicant' : 'International applicant'}</button>)}</div></label>{draft.pathway === 'international' && <Notice>International nurse applications may be considered for employer sponsorship subject to eligibility, registration and immigration requirements.</Notice>}</Card>}
  {step === 1 && <Card title="Personal details"><Grid><Input label="First and other names" value={String(draft.full_name)} onChange={(v) => update('full_name', v)} required /><Input label="Preferred name" value={String(draft.preferred_name)} onChange={(v) => update('preferred_name', v)} /><Input label="Email" type="email" value={String(draft.email)} onChange={(v) => update('email', v)} required /><Input label="Phone" value={String(draft.phone)} onChange={(v) => update('phone', v)} required /><Input label="Date of birth" type="date" value={String(draft.date_of_birth)} onChange={(v) => update('date_of_birth', v)} /><Input label="Nationality" value={String(draft.nationality)} onChange={(v) => update('nationality', v)} /><Input label="Country of residence" value={String(draft.country_of_residence)} onChange={(v) => update('country_of_residence', v)} required /><Input label="Address" value={String(draft.address)} onChange={(v) => update('address', v)} required /></Grid></Card>}
  {step === 2 && <Card title="Nursing registration and experience"><Grid><Input label="NMC number" value={String(draft.nmc_number)} onChange={(v) => update('nmc_number', v)} required /><Input label="RCN number" value={String(draft.rcn_number)} onChange={(v) => update('rcn_number', v)} /><Input label="Band / grade" value={String(draft.band)} onChange={(v) => update('band', v)} /></Grid><TextArea label="Qualifications" value={String(draft.qualifications)} onChange={(v) => update('qualifications', v)} required /><TextArea label="Nursing / care experience" value={String(draft.care_experience)} onChange={(v) => update('care_experience', v)} required /><TextArea label="Professional experience and registrations" value={String(draft.professional_experience)} onChange={(v) => update('professional_experience', v)} required /><h3>Mandatory training</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>{trainingOptions.map((name) => <label key={name} style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 9 }}><input type="checkbox" checked={Boolean((draft.training as Record<string, boolean>)[name])} onChange={(e) => updateNested('training', name, e.target.checked)} /> {name}</label>)}</div></Card>}
  {step === 3 && <Card title="References and employment history"><h3>Professional references</h3>{draft.references.map((ref, i) => <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 }}><strong>Reference {i + 1}</strong><Grid>{['name','position','organisation','email','telephone'].map((key) => <Input key={key} label={key[0].toUpperCase() + key.slice(1)} value={ref[key] || ''} onChange={(v) => setDraft((d) => ({ ...d, references: d.references.map((r, idx) => idx === i ? { ...r, [key]: v } : r) }))} required={i < 2 && ['name','organisation','email','telephone'].includes(key)} />)}</Grid></div>)}<TextArea label="Employment history summary" value={JSON.stringify(draft.employment_history)} onChange={(v) => update('employment_history', [{ employer: 'See candidate summary', jobTitle: '', from: '', to: '', responsibilities: v, reasonForLeaving: '' }])} /></Card>}
  {step === 4 && <Card title="Right to work, relocation and declarations"><Grid><Input label="Current UK right-to-work status" value={String(draft.right_to_work_status)} onChange={(v) => update('right_to_work_status', v)} required={draft.pathway === 'uk'} /><Input label="Work permission / visa status" value={String(draft.work_permission)} onChange={(v) => update('work_permission', v)} required={draft.pathway === 'international'} /><Input label="Passport number" value={String(draft.passport_number)} onChange={(v) => update('passport_number', v)} required={draft.pathway === 'international'} /><Input label="Passport expiry" type="date" value={String(draft.passport_expiry)} onChange={(v) => update('passport_expiry', v)} required={draft.pathway === 'international'} /></Grid>{draft.pathway === 'international' && <><TextArea label="Previous UK immigration / visa history" value={String(draft.previous_uk_immigration)} onChange={(v) => update('previous_uk_immigration', v)} /><TextArea label="International travel / immigration history" value={String(draft.visa_history)} onChange={(v) => update('visa_history', v)} /><TextArea label="Relocation readiness and timeframe" value={String(draft.relocation_readiness)} onChange={(v) => update('relocation_readiness', v)} required /><TextArea label="Accommodation / relocation plan" value={String(draft.accommodation_plan)} onChange={(v) => update('accommodation_plan', v)} /></>}<label style={{ display: 'block', marginTop: 12 }}><input type="checkbox" checked={Boolean(draft.consent)} onChange={(e) => update('consent', e.target.checked)} required /> I confirm that the information provided is accurate and consent to Laurem processing my application for recruitment purposes.</label></Card>}

  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>{step > 0 ? <button type="button" onClick={() => setStep(step - 1)} style={buttonSecondary}>Back</button> : <span />}{step < steps.length - 1 ? <button type="button" onClick={() => setStep(step + 1)} style={buttonPrimary}>Continue</button> : <button type="submit" disabled={saving} style={buttonPrimary}>{saving ? 'Submitting...' : 'Submit application'}</button>}</div></form>
  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 18 }}>The final nurse interview can be completed from your private recruitment link after application submission.</p><p hidden>{nurseQuestions.length}</p></main>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card" style={{ padding: 24 }}>{<h2 style={{ marginTop: 0 }}>{title}</h2>}{children}</section>; }
function Notice({ children }: { children: React.ReactNode }) { return <div style={{ padding: 14, borderRadius: 10, background: 'var(--soft)', color: 'var(--muted)', lineHeight: 1.5 }}>{children}</div>; }
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>{children}</div>; }
function Input({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) { return <label>{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 12, border: '1px solid var(--line)', borderRadius: 9 }} /></label>; }
function TextArea({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) { return <label style={{ display: 'block', marginTop: 14 }}>{label}<textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={6} style={{ display: 'block', width: '100%', marginTop: 6, padding: 12, border: '1px solid var(--line)', borderRadius: 9, resize: 'vertical', font: 'inherit' }} /></label>; }
const buttonPrimary = { background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 800 };
const buttonSecondary = { background: 'white', color: 'var(--ink)', border: '1px solid var(--line)', padding: '12px 18px', borderRadius: 9, fontWeight: 800 };
