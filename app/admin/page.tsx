'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';

type Application = { id: string; full_name: string; email: string; phone: string | null; role_applied: string; country_of_residence: string | null; living_in_uk: string | null; status: string; created_at: string };

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/applications').then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Unable to load applications'); return p; }).then((p) => setApplications(p.applications || [])).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => applications.filter((a) => `${a.full_name} ${a.email} ${a.role_applied} ${a.status}`.toLowerCase().includes(query.toLowerCase())), [applications, query]);
  const counts = applications.reduce<Record<string, number>>((acc, app) => { acc[app.status] = (acc[app.status] || 0) + 1; return acc; }, {});

  return <main className="wrap" style={{ padding: '40px 0 80px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'end', flexWrap: 'wrap' }}><div><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>{lauremCompany.tradingName.toUpperCase()} RECRUITMENT</p><h1 style={{ margin: '4px 0 8px', fontSize: 42 }}>Recruiter workspace</h1><p style={{ color: 'var(--muted)' }}>Applications, screening and hiring pipeline.</p></div><Link href="/jobs" style={{ textDecoration: 'none', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: 9, fontWeight: 700 }}>View careers page</Link></div>{error && <div role="alert" className="card" style={{ marginTop: 18, padding: 16, color: '#8a2323' }}>{error}</div>}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '26px 0' }}>{Object.entries(counts).map(([status, count]) => <div className="card" key={status} style={{ padding: '12px 16px' }}><strong>{count}</strong><span style={{ marginLeft: 8, color: 'var(--muted)' }}>{status}</span></div>)}</div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants, roles or status" style={{ width: '100%', padding: 13, border: '1px solid var(--line)', borderRadius: 10, marginBottom: 14 }} /><div style={{ display: 'grid', gap: 10 }}>{filtered.map((app) => <article className="card" key={app.id} style={{ padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0, fontSize: 20 }}>{app.full_name}</h2><div style={{ color: 'var(--muted)', marginTop: 5 }}>{app.role_applied} · {app.email}</div>{app.country_of_residence && <div style={{ color: 'var(--muted)', marginTop: 3 }}>{app.country_of_residence} {app.living_in_uk === 'No' ? '· International' : ''}</div>}</div><span style={{ alignSelf: 'flex-start', padding: '7px 10px', borderRadius: 999, background: 'var(--soft)', fontSize: 12, fontWeight: 800 }}>{app.status}</span></div></article>)}</div></main>;
}
