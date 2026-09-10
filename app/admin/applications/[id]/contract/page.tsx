'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lauremInternationalNurseContractConfig as nurseConfig } from '@/lib/laurem-international-nurse-contract-config';

type Application = {
  id: string;
  full_name: string;
  email: string;
  role_applied: string;
  living_in_uk?: string | null;
  start_date?: string | null;
  address?: string | null;
};

type Result = { acceptanceLink?: string; contractType?: string };

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const [form, setForm] = useState({
    weeklyHours: '37.5',
    hourlyRate: '',
    annualSalary: String(nurseConfig.defaultAnnualSalaryBenchmark),
    preRegistrationSalary: '',
    postRegistrationSalary: String(nurseConfig.defaultAnnualSalaryBenchmark),
    workLocations: 'Scotland',
    clientOrAssignmentDetails: '',
    probation: '3 months',
    noticePeriodEmployee: '1 week during probation and 4 weeks thereafter',
    noticePeriodEmployer: '1 week during probation and 4 weeks thereafter, or the statutory minimum where greater',
    holidayEntitlement: 'Statutory minimum entitlement plus any more favourable Laurem entitlement stated in the offer',
    pensionScheme: 'Laurem workplace pension arrangement for eligible employees',
    visaRoute: nurseConfig.defaultVisaRoute,
    sponsorshipOccupationCode: nurseConfig.defaultOccupationCode,
    nmcStatus: 'Not applicable',
    registrationDeadline: '',
    relocationSupport: '',
    repayableCosts: '',
    repaymentSchedule: '',
  });

  useEffect(() => { params.then((value) => setId(value.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    fetch('/api/admin/applications', { cache: 'no-store' })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load application.'); return body; })
      .then((body) => setApplication((body.applications || []).find((item: Application) => item.id === id) || null))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load application.'));
  }, [id]);

  const isInternationalNurse = useMemo(() => {
    if (!application) return false;
    return application.role_applied === 'Registered Nurse - International Recruitment' || (application.role_applied === 'Registered Nurse' && application.living_in_uk === 'No');
  }, [application]);

  function setField(name: keyof typeof form, value: string) { setForm((current) => ({ ...current, [name]: value })); }

  async function generate() {
    if (!application) return;
    setBusy(true); setMessage(''); setResult(null);
    try {
      const payload: Record<string, unknown> = {
        applicationId: application.id,
        weeklyHours: Number(form.weeklyHours) || 37.5,
        minimumWeeklyHours: Number(form.weeklyHours) || 37.5,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        workLocations: form.workLocations.split(',').map((value) => value.trim()).filter(Boolean),
        clientOrAssignmentDetails: form.clientOrAssignmentDetails,
        noticePeriodEmployee: form.noticePeriodEmployee,
        noticePeriodEmployer: form.noticePeriodEmployer,
        holidayEntitlement: form.holidayEntitlement,
        pensionScheme: form.pensionScheme,
        probation: form.probation,
      };
      if (isInternationalNurse) Object.assign(payload, {
        annualSalary: Number(form.annualSalary) || undefined,
        postRegistrationSalary: Number(form.postRegistrationSalary) || undefined,
        preRegistrationSalary: form.preRegistrationSalary ? Number(form.preRegistrationSalary) : undefined,
        visaRoute: form.visaRoute,
        sponsorshipOccupationCode: form.sponsorshipOccupationCode,
        nmcStatus: form.nmcStatus,
        registrationDeadline: form.registrationDeadline,
        relocationSupport: form.relocationSupport,
        repayableCosts: form.repayableCosts,
        repaymentSchedule: form.repaymentSchedule,
      });

      const response = await fetch('/api/admin/contracts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to generate employment contract.');
      setResult(body);
      setMessage('Contract draft generated successfully. Review it before issuing it to the candidate.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate employment contract.'); }
    finally { setBusy(false); }
  }

  if (!application) return <main className="wrap" style={{ padding: 40 }}><p>{message || 'Loading candidate...'}</p><Link href={`/admin/applications/${id}`}>Back to candidate</Link></main>;

  return <main className="wrap" style={{ padding: '34px 0 80px', maxWidth: 1000 }}>
    <Link href={`/admin/applications/${id}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Candidate file</Link>
    <header style={{ margin: '18px 0 24px' }}>
      <p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>{isInternationalNurse ? 'INTERNATIONAL NURSE CONTRACT' : 'EMPLOYMENT CONTRACT'}</p>
      <h1>{application.full_name}</h1>
      <p style={{ color: 'var(--muted)' }}>{application.role_applied} · {application.email}</p>
    </header>
    {message && <div role="alert" className="card" style={{ padding: 14, marginBottom: 16 }}>{message}</div>}

    <section className="card" style={{ padding: 22, marginBottom: 16 }}>
      <h2>Employment terms</h2>
      <div style={grid}>
        <Field label="Weekly contracted hours" value={form.weeklyHours} onChange={(value) => setField('weeklyHours', value)} type="number" />
        {!isInternationalNurse && <Field label="Hourly rate (£)" value={form.hourlyRate} onChange={(value) => setField('hourlyRate', value)} type="number" />}
        {isInternationalNurse && <>
          <Field label="Annual salary (£)" value={form.annualSalary} onChange={(value) => setField('annualSalary', value)} type="number" />
          <Field label="Post-registration salary (£)" value={form.postRegistrationSalary} onChange={(value) => setField('postRegistrationSalary', value)} type="number" />
          <Field label="Pre-registration salary (£, if applicable)" value={form.preRegistrationSalary} onChange={(value) => setField('preRegistrationSalary', value)} type="number" />
        </>}
        <Field label="Probation" value={form.probation} onChange={(value) => setField('probation', value)} />
        <Field label="Work locations" value={form.workLocations} onChange={(value) => setField('workLocations', value)} />
        {!isInternationalNurse && <Field label="Client / assignment details" value={form.clientOrAssignmentDetails} onChange={(value) => setField('clientOrAssignmentDetails', value)} multiline />}
      </div>
    </section>

    {isInternationalNurse && <>
      <section className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h2>International nurse requirements</h2>
        <div style={grid}>
          <Field label="Visa route" value={form.visaRoute} onChange={(value) => setField('visaRoute', value)} />
          <Field label="Sponsorship occupation code" value={form.sponsorshipOccupationCode} onChange={(value) => setField('sponsorshipOccupationCode', value)} />
          <Field label="NMC status" value={form.nmcStatus} onChange={(value) => setField('nmcStatus', value)} />
          <Field label="Registration deadline" value={form.registrationDeadline} onChange={(value) => setField('registrationDeadline', value)} />
        </div>
      </section>
      <section className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h2>Relocation and repayment</h2>
        <Field label="Relocation support" value={form.relocationSupport} onChange={(value) => setField('relocationSupport', value)} multiline />
        <Field label="Potentially repayable employer-funded expenses" value={form.repayableCosts} onChange={(value) => setField('repayableCosts', value)} multiline />
        <Field label="Repayment schedule" value={form.repaymentSchedule} onChange={(value) => setField('repaymentSchedule', value)} multiline />
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>Do not include recruitment fees, sponsor licence fees, Immigration Skills Charge, Certificate of Sponsorship costs or interview costs as employee-repayable expenses.</p>
      </section>
    </>}

    <section className="card" style={{ padding: 22, marginBottom: 16 }}>
      <h2>Leave, pension and notice</h2>
      <div style={grid}>
        <Field label="Employee notice" value={form.noticePeriodEmployee} onChange={(value) => setField('noticePeriodEmployee', value)} />
        <Field label="Employer notice" value={form.noticePeriodEmployer} onChange={(value) => setField('noticePeriodEmployer', value)} />
        <Field label="Holiday entitlement" value={form.holidayEntitlement} onChange={(value) => setField('holidayEntitlement', value)} multiline />
        <Field label="Pension" value={form.pensionScheme} onChange={(value) => setField('pensionScheme', value)} multiline />
      </div>
    </section>

    <section className="card" style={{ padding: 22 }}>
      <h2>Before issuing</h2>
      <p style={{ color: 'var(--muted)', lineHeight: 1.65 }}>The recruiter remains responsible for checking the final pay, hours, role, immigration position and all contractual terms before issue.</p>
      <button disabled={busy} onClick={generate} style={{ ...primaryButton, opacity: busy ? .6 : 1 }}>{busy ? 'Generating…' : `Generate ${isInternationalNurse ? 'international nurse' : 'employment'} contract`}</button>
      {result?.acceptanceLink && <div style={{ marginTop: 18, padding: 14, background: 'var(--soft)', borderRadius: 10 }}><strong>Candidate acceptance link</strong><div style={{ marginTop: 7, wordBreak: 'break-all' }}>{result.acceptanceLink}</div><p style={{ color: 'var(--muted)', fontSize: 12 }}>The contract is created as a draft. Issue it through the recruiter workflow after review.</p></div>}
    </section>
  </main>;
}

function Field({ label, value, onChange, type = 'text', multiline = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; multiline?: boolean }) {
  return <label style={{ display: 'block', marginBottom: 13 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} style={inputStyle} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />}</label>;
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 };
const inputStyle = { width: '100%', padding: 11, border: '1px solid var(--line)', borderRadius: 9, font: 'inherit' };
const primaryButton = { marginTop: 10, background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 800, cursor: 'pointer' };
