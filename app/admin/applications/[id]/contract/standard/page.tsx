'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Application = {
  id: string;
  full_name: string;
  email: string;
  role_applied: string;
  start_date?: string | null;
  address?: string | null;
  living_in_uk?: string | null;
};

const inputStyle: React.CSSProperties = { width: '100%', padding: 11, border: '1px solid var(--line)', borderRadius: 9, font: 'inherit' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 };
const button: React.CSSProperties = { border: 0, background: 'var(--ink)', color: '#fff', padding: '12px 18px', borderRadius: 9, fontWeight: 800, cursor: 'pointer' };

export default function StandardContractPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ acceptanceLink?: string } | null>(null);
  const [form, setForm] = useState({
    minimumWeeklyHours: '37.5',
    hourlyRate: '',
    workLocations: 'Scotland',
    clientOrAssignmentDetails: '',
    noticePeriodEmployee: '1 week during probation and 4 weeks thereafter',
    noticePeriodEmployer: '1 week during probation and 4 weeks thereafter, or the statutory minimum where greater',
    holidayEntitlement: 'Statutory minimum entitlement plus any more favourable Laurem entitlement stated in the offer',
    pensionScheme: 'Laurem workplace pension arrangement for eligible employees',
    probation: '3 months',
  });

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    fetch('/api/admin/applications', { cache: 'no-store' })
      .then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Unable to load application.'); return p; })
      .then((p) => setApplication((p.applications || []).find((a: Application) => a.id === id) || null))
      .catch((e) => setMessage(e instanceof Error ? e.message : 'Unable to load application.'));
  }, [id]);

  function setField(name: keyof typeof form, value: string) { setForm((current) => ({ ...current, [name]: value })); }

  async function generate() {
    if (!application) return;
    const minimumWeeklyHours = Number(form.minimumWeeklyHours);
    const hourlyRate = Number(form.hourlyRate);
    if (!Number.isFinite(minimumWeeklyHours) || minimumWeeklyHours <= 0) { setMessage('Enter valid guaranteed minimum weekly hours.'); return; }
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) { setMessage('Enter the approved hourly rate before generating the contract.'); return; }
    setBusy(true); setMessage(''); setResult(null);
    try {
      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          minimumWeeklyHours,
          hourlyRate,
          workLocations: form.workLocations.split(',').map((v) => v.trim()).filter(Boolean),
          clientOrAssignmentDetails: form.clientOrAssignmentDetails.trim() || undefined,
          noticePeriodEmployee: form.noticePeriodEmployee,
          noticePeriodEmployer: form.noticePeriodEmployer,
          holidayEntitlement: form.holidayEntitlement,
          pensionScheme: form.pensionScheme,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to generate contract.');
      setResult(payload);
      setMessage('Standard employment contract draft generated successfully. Review it before issuing it to the candidate.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate contract.'); }
    finally { setBusy(false); }
  }

  if (!application) return <main className="wrap" style={{ padding: 40 }}><p>{message || 'Loading candidate...'}</p>{id && <Link href={`/admin/applications/${id}`}>Back to candidate</Link>}</main>;

  return <main className="wrap" style={{ padding: '34px 0 80px', maxWidth: 1000 }}>
    <Link href={`/admin/applications/${id}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Candidate file</Link>
    <header style={{ margin: '18px 0 24px' }}><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>STANDARD EMPLOYMENT CONTRACT</p><h1>{application.full_name}</h1><p style={{ color: 'var(--muted)' }}>{application.role_applied} · {application.email}</p></header>
    {message && <div role="alert" className="card" style={{ padding: 14, marginBottom: 16 }}>{message}</div>}

    <section className="card" style={{ padding: 22, marginBottom: 16 }}><h2>Employment terms</h2><div style={grid}>
      <Field label="Guaranteed minimum weekly hours" value={form.minimumWeeklyHours} onChange={(v) => setField('minimumWeeklyHours', v)} type="number" />
      <Field label="Approved hourly rate (£)" value={form.hourlyRate} onChange={(v) => setField('hourlyRate', v)} type="number" />
      <Field label="Probation" value={form.probation} onChange={(v) => setField('probation', v)} />
      <Field label="Work locations" value={form.workLocations} onChange={(v) => setField('workLocations', v)} />
    </div></section>

    <section className="card" style={{ padding: 22, marginBottom: 16 }}><h2>Notice, leave and pension</h2><div style={grid}>
      <Field label="Employee notice" value={form.noticePeriodEmployee} onChange={(v) => setField('noticePeriodEmployee', v)} />
      <Field label="Employer notice" value={form.noticePeriodEmployer} onChange={(v) => setField('noticePeriodEmployer', v)} />
      <Field label="Holiday entitlement" value={form.holidayEntitlement} onChange={(v) => setField('holidayEntitlement', v)} />
      <Field label="Pension" value={form.pensionScheme} onChange={(v) => setField('pensionScheme', v)} />
    </div></section>

    <section className="card" style={{ padding: 22, marginBottom: 16 }}><h2>Assignment details</h2><Field label="Client or assignment details (optional)" value={form.clientOrAssignmentDetails} onChange={(v) => setField('clientOrAssignmentDetails', v)} multiline /></section>

    <section className="card" style={{ padding: 22 }}><h2>Before issuing</h2><p style={{ color: 'var(--muted)', lineHeight: 1.65 }}>This workflow is for Healthcare Assistant, Support Worker, Senior Support Worker, UK-based Registered Nurse and Physiotherapist applications. The contract is created as a draft and should be reviewed against the approved role, pay arrangement, working pattern and applicable employment requirements before issue.</p><button disabled={busy} onClick={generate} style={{ ...button, opacity: busy ? .6 : 1 }}>{busy ? 'Generating…' : 'Generate standard employment contract'}</button>{result?.acceptanceLink && <div style={{ marginTop: 18, padding: 14, background: 'var(--soft)', borderRadius: 10 }}><strong>Candidate acceptance link</strong><div style={{ marginTop: 7, wordBreak: 'break-all' }}>{result.acceptanceLink}</div><p style={{ color: 'var(--muted)', fontSize: 12 }}>The contract remains a draft until the recruiter explicitly issues it.</p></div>}</section>
  </main>;
}

function Field({ label, value, onChange, type = 'text', multiline = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; multiline?: boolean }) {
  return <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</span>{multiline ? <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />}</label>;
}
