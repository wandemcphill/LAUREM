'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';
import { recruitmentConfig } from '@/lib/recruitment-config';

type Application = {
  id: string;
  full_name: string;
  preferred_name?: string | null;
  email: string;
  phone: string | null;
  role_applied: string;
  country_of_residence: string | null;
  living_in_uk: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  address?: string | null;
  nationality?: string | null;
  application_data?: Record<string, unknown>;
  supporting_documents?: unknown[];
  professional_references?: unknown[];
  employment_history?: unknown[];
  employment_gaps?: unknown[];
  availability?: Record<string, unknown>;
};

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      const r = await fetch('/api/admin/applications', { cache: 'no-store' });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || 'Unable to load applications');
      setApplications(p.applications || []);
      if (selected) setSelected((p.applications || []).find((a: Application) => a.id === selected.id) || null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load applications'); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => applications.filter((a) => `${a.full_name} ${a.email} ${a.role_applied} ${a.status} ${a.country_of_residence || ''}`.toLowerCase().includes(query.toLowerCase())), [applications, query]);
  const counts = applications.reduce<Record<string, number>>((acc, app) => { acc[app.status] = (acc[app.status] || 0) + 1; return acc; }, {});

  async function changeStatus(status: string) {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const r = await fetch(`/api/admin/applications?id=${encodeURIComponent(selected.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || 'Unable to update status');
      await load();
      setSelected((current) => current ? { ...current, status: p.application.status } : current);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update status'); }
    finally { setSaving(false); }
  }

  return <main className="wrap" style={{ padding: '40px 0 80px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'end', flexWrap: 'wrap' }}>
      <div><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>{lauremCompany.tradingName.toUpperCase()} RECRUITMENT</p><h1 style={{ margin: '4px 0 8px', fontSize: 42 }}>Recruiter workspace</h1><p style={{ color: 'var(--muted)' }}>Applications, screening and hiring pipeline.</p></div>
      <Link href="/jobs" style={{ textDecoration: 'none', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: 9, fontWeight: 700 }}>View careers page</Link>
    </div>
    {error && <div role="alert" className="card" style={{ marginTop: 18, padding: 16, color: '#8a2323' }}>{error}</div>}
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '26px 0' }}>{Object.entries(counts).map(([status, count]) => <button key={status} type="button" onClick={() => setQuery(status)} className="card" style={{ padding: '12px 16px', cursor: 'pointer', border: '1px solid var(--line)', background: 'white' }}><strong>{count}</strong><span style={{ marginLeft: 8, color: 'var(--muted)' }}>{status}</span></button>)}</div>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants, roles, location or status" style={{ width: '100%', padding: 13, border: '1px solid var(--line)', borderRadius: 10, marginBottom: 14 }} />
    <div style={{ display: 'grid', gap: 10 }}>{filtered.map((app) => <article className="card" key={app.id} style={{ padding: 20, cursor: 'pointer' }} onClick={() => setSelected(app)}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0, fontSize: 20 }}>{app.full_name}</h2><div style={{ color: 'var(--muted)', marginTop: 5 }}>{app.role_applied} · {app.email}</div>{app.country_of_residence && <div style={{ color: 'var(--muted)', marginTop: 3 }}>{app.country_of_residence} {app.living_in_uk === 'No' ? '· International' : ''}</div>}</div><span style={{ alignSelf: 'flex-start', padding: '7px 10px', borderRadius: 999, background: 'var(--soft)', fontSize: 12, fontWeight: 800 }}>{app.status}</span></div></article>)}</div>

    {selected && <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', display: 'flex', justifyContent: 'flex-end', zIndex: 20 }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
      <aside style={{ width: 'min(760px,100%)', height: '100%', overflow: 'auto', background: 'white', padding: 28, boxShadow: '-10px 0 30px rgba(0,0,0,.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}><div><p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 12, letterSpacing: '.08em' }}>APPLICATION</p><h2 style={{ margin: 0 }}>{selected.full_name}</h2><p style={{ color: 'var(--muted)' }}>{selected.role_applied} · {selected.email}</p></div><button type="button" onClick={() => setSelected(null)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 9, padding: '8px 12px' }}>Close</button></div>
        <section className="card" style={{ padding: 18, marginTop: 18 }}><strong>Recruitment status</strong><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{recruitmentConfig.statusFlow.map((status) => <button key={status} type="button" disabled={saving} onClick={() => changeStatus(status)} style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid var(--line)', background: selected.status === status ? 'var(--ink)' : 'white', color: selected.status === status ? 'white' : 'var(--ink)', fontWeight: 700, cursor: 'pointer' }}>{status}</button>)}</div></section>
        <section style={{ marginTop: 20 }}><h3>Candidate details</h3><Info label="Email" value={selected.email} /><Info label="Phone" value={selected.phone} /><Info label="Nationality" value={selected.nationality} /><Info label="Country of residence" value={selected.country_of_residence} /><Info label="Address" value={selected.address} /><Info label="Application received" value={new Date(selected.created_at).toLocaleString()} /></section>
        <section style={{ marginTop: 20 }}><h3>Applicant record</h3><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--soft)', padding: 14, borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>{JSON.stringify(selected.application_data || {}, null, 2)}</pre></section>
        <section style={{ marginTop: 20 }}><h3>Next actions</h3><div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}><button type="button" onClick={() => changeStatus('Screening')} style={actionButton}>Move to screening</button><button type="button" onClick={() => changeStatus('Interview')} style={actionButton}>Prepare interview</button><button type="button" onClick={() => changeStatus('Documents')} style={actionButton}>Request documents</button><button type="button" onClick={() => changeStatus('Offer')} style={actionButton}>Prepare offer</button></div></section>
      </aside>
    </div>}
  </main>;
}

function Info({ label, value }: { label: string; value?: string | null }) { return <div style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><small style={{ color: 'var(--muted)' }}>{label}</small><div style={{ marginTop: 2 }}>{value || 'Not provided'}</div></div>; }
const actionButton = { border: '1px solid var(--line)', background: 'white', padding: '11px 12px', borderRadius: 9, fontWeight: 700, cursor: 'pointer' };
