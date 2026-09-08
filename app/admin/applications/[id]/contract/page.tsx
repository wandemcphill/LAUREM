'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lauremInternationalNurseContractConfig as contractConfig } from '@/lib/laurem-international-nurse-contract-config';

type Application = {
  id: string;
  full_name: string;
  email: string;
  role_applied: string;
  living_in_uk?: string | null;
  start_date?: string | null;
  address?: string | null;
};

export default function InternationalNurseContractPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ acceptanceLink?: string; contractType?: string } | null>(null);
  const [form, setForm] = useState({
    weeklyHours: String(contractConfig.defaultWeeklyHours),
    annualSalary: String(contractConfig.defaultAnnualSalaryBenchmark),
    postRegistrationSalary: String(contractConfig.defaultAnnualSalaryBenchmark),
    preRegistrationSalary: '',
    visaRoute: contractConfig.defaultVisaRoute,
    sponsorshipOccupationCode: contractConfig.defaultOccupationCode,
    nmcStatus: 'Working towards full NMC registration',
    registrationDeadline: 'Within the period permitted by the applicable immigration rules and NMC process',
    probation: '6 months',
    noticePeriodEmployee: '1 week during probation and 4 weeks thereafter',
    noticePeriodEmployer: '1 week during probation and 4 weeks thereafter, or the statutory minimum where greater',
    holidayEntitlement: 'Statutory minimum entitlement plus any more favourable Laurem entitlement stated in the offer',
    pensionScheme: 'Laurem workplace pension arrangement for eligible employees',
    workLocations: 'Scotland',
    relocationSupport: 'As expressly stated in the signed relocation/offer schedule',
    repayableCosts: '',
    repaymentSchedule: '0–12 months: 100%; 13–24 months: 50%; 25–36 months: 25%; after 36 months: 0%, subject to applicable law and individual circumstances',
  });

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    fetch('/api/admin/applications', { cache: 'no-store' })
      .then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Unable to load application.'); return p; })
      .then((p) => setApplication((p.applications || []).find((a: Application) => a.id === id) || null))
      .catch((e) => setMessage(e instanceof Error ? e.message : 'Unable to load application.'));
  }, [id]);

  const eligible = useMemo(() => {
    if (!application) return false;
    return application.role_applied === 'Registered Nurse - International Recruitment' || (application.role_applied === 'Registered Nurse' && application.living_in_uk === 'No');
  }, [application]);

  function setField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function generate() {
    if (!application) return;
    setBusy(true); setMessage(null); setResult(null);
    try {
      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          weeklyHours: Number(form.weeklyHours),
          minimumWeeklyHours: Number(form.weeklyHours),
          annualSalary: Number(form.annualSalary),
          postRegistrationSalary: Number(form.postRegistrationSalary),
          preRegistrationSalary: form.preRegistrationSalary ? Number(form.preRegistrationSalary) : undefined,
          visaRoute: form.visaRoute,
          sponsorshipOccupationCode: form.sponsorshipOccupationCode,
          nmcStatus: form.nmcStatus,
          registrationDeadline: form.registrationDeadline,
          probation: form.probation,
          noticePeriodEmployee: form.noticePeriodEmployee,
          noticePeriodEmployer: form.noticePeriodEmployer,
          holidayEntitlement: form.holidayEntitlement,
          pensionScheme: form.pensionScheme,
          workLocations: form.workLocations.split(',').map((v) => v.trim()).filter(Boolean),
          relocationSupport: form.relocationSupport,
          repayableCosts: form.repayableCosts,
          repaymentSchedule: form.repaymentSchedule,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to generate contract.');
      setResult(payload);
      setMessage('International nurse contract draft generated successfully. Review it before issuing it to the candidate.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate contract.'); }
    finally { setBusy(false); }
  }

  if (!application) return <main className="wrap" style={{ padding: 40 }}><p>{message || 'Loading candidate...'}</p><Link href={`/admin/applications/${id}`}>Back to candidate</Link></main>;
  if (!eligible) return <main className="wrap" style={{ padding: 40 }}><h1>International nurse contract</h1><p>This contract type is only available for an international Registered Nurse application.</p><Link href={`/admin/applications/${id}`}>Back to candidate</Link></main>;

  return <main className="wrap" style={{ padding: '34px 0 80px', maxWidth: 1000 }}>
    <Link href={`/admin/applications/${id}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Candidate file</Link>
    <header style={{ margin: '18px 0 24px' }}><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>INTERNATIONAL NURSE CONTRACT</p><h1>{application.full_name}</h1><p style={{ color: 'var(--muted)' }}>Registered Nurse · {application.email}</p></header>
    {message && <div role="alert" className="card" style={{ padding: 14, marginBottom: 16 }}>{message}</div>}
    <section className="card" style={{ padding: 22, marginBottom: 16 }}>
      <h2>Employment terms</h2>
      <div style={grid}>
        <Field label="Weekly contracted hours" value={form.weeklyHours} onChange={(v) => setField('weeklyHours', v)} type="number" />
        <Field label="Annual salary (£)" value={form.annualSalary} onChange={(v) => setField('annualSalary', v)} type="number" />
        <Field label="Post-registration salary (£)" value={form.postRegistrationSalary} onChange={(v) => setField('postRegistrationSalary', v)} type="number" />
        <Field label="Pre-registration salary (£, if applicable)" value={form.preRegistrationSalary} onChange={(v) => setField('preRegistrationSalary', v)} type="number" />
        <Field label="Probation" value={form.probation} onChange={(v) => setField('probation', v)} />
        <Field label="Visa route" value={form.visaRoute} onChange={(v) => setField('visaRoute', v)} />
        <Field label="Sponsorship occupation code" value={form.sponsorshipOccupationCode} onChange={(v) => setField('sponsorshipOccupationCode', v)} />
        <Field label="NMC status" value={form.nmcStatus} onChange={(v) => setField('nmcStatus', v)} />
        <Field label="Registration deadline" value={form.registrationDeadline} onChange={(v) => setField('registrationDeadline', v)} />
        <Field label="Work locations" value={form.workLocations} onChange={(v) => setField('workLocations', v)} />
      </div>
    </section>
    <section className="card" style={{ padding: 22, marginBottom: 16 }}>
      <h2>Leave, pension and notice</h2>
      <div style={grid}>
        <Field label="Employee notice" value={form.noticePeriodEmployee} onChange={(v) => setField('noticePeriodEmployee', v)} />
        <Field label="Employer notice" value={form.noticePeriodEmployer} onChange={(v) => setField('noticePeriodEmployer', v)} />
        <Field label="Holiday entitlement" value={form.holidayEntitlement} onChange={(v) => setField('holidayEntitlement', v)} />
        <Field label="Pension" value={form.pensionScheme} onChange={(v) => setField('pensionScheme', v)} />
      </div>
    </section>
    <section className="card" style={{ padding: 22, marginBottom: 16 }}>
      <h2>Relocation and repayment</h2>
      <Field label="Relocation support" value={form.relocationSupport} onChange={(v) => setField('relocationSupport', v)} multiline />
      <Field label="Potentially repayable employer-funded expenses" value={form.repayableCosts} onChange={(v) => setField('repayableCosts', v)} multiline />
      <Field label="Repayment schedule" value={form.repaymentSchedule} onChange={(v) => setField('repaymentSchedule', v)} multiline />
      <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginTop: 14 }}>Do not include recruitment fees, sponsor licence fees, Immigration Skills Charge, Certificate of Sponsorship costs or interview costs as employee-repayable expenses. Any repayment term must be supported by genuine, evidenced and auditable employer-funded expenses and must be reviewed for proportionality and individual circumstances.</p>
    </section>
    <section className="card" style={{ padding: 22 }}>
      <h2>Before issuing</h2>
      <p style={{ color: 'var(--muted)', lineHeight: 1.65 }}>The salary entered here is the contractual value to be checked by the recruiter against the current immigration rules and the approved role/pay arrangement. The default benchmark is based on the current NHS Scotland 2026/27 Band 5 point 1 published rate, but this contract does not incorporate NHS terms unless Laurem expressly adopts them.</p>
      <button disabled={busy} onClick={generate} style={{ ...primaryButton, opacity: busy ? .6 : 1 }}>{busy ? 'Generating…' : 'Generate international nurse contract'}</button>
      {result?.acceptanceLink && <div style={{ marginTop: 18, padding: 14, background: 'var(--soft)', borderRadius: 10 }}><strong>Candidate acceptance link</strong><div style={{ marginTop: 7, wordBreak: 'break-all' }}>{result.acceptanceLink}</div><p style={{ color: 'var(--muted)', fontSize: 12 }}>The contract is created as a draft. Issue it through the recruiter workflow only after the terms have been checked.</p></div>}
    </section>
  </main>;
}

function Field({ label, value, onChange, type = 'text', multiline = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; multiline?: boolean }) {
  return <label style={{ display: 'block', marginBottom: 13 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</span>{multiline ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={inputStyle} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />}</label>;
}
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 };
const inputStyle = { width: '100%', padding: 11, border: '1px solid var(--line)', borderRadius: 9, font: 'inherit' };
const primaryButton = { marginTop: 10, background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 800, cursor: 'pointer' };
