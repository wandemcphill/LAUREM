'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';

type Application = { id:string; full_name:string; email:string; phone:string|null; role_applied:string; country_of_residence:string|null; living_in_uk:string|null; status:string; created_at:string; updated_at?:string };

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load() {
    try { const r = await fetch('/api/admin/applications', { cache: 'no-store' }); const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Unable to load applications'); setApplications(p.applications || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load applications'); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => applications.filter((a) => `${a.full_name} ${a.email} ${a.role_applied} ${a.status} ${a.country_of_residence || ''}`.toLowerCase().includes(query.toLowerCase())), [applications, query]);
  const counts = applications.reduce<Record<string, number>>((acc, app) => { acc[app.status] = (acc[app.status] || 0) + 1; return acc; }, {});

  return <main className="wrap" style={{ padding: '40px 0 80px' }}>
    <div style={{ display:'flex', justifyContent:'space-between', gap:20, alignItems:'end', flexWrap:'wrap' }}><div><p style={{ color:'var(--accent)', fontWeight:800, letterSpacing:'.08em' }}>{lauremCompany.tradingName.toUpperCase()} RECRUITMENT</p><h1 style={{ margin:'4px 0 8px', fontSize:42 }}>Recruiter workspace</h1><p style={{ color:'var(--muted)' }}>Applications, screening and hiring pipeline.</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link href="/admin/workforce" style={{ textDecoration:'none', border:'1px solid var(--line)', padding:'10px 14px', borderRadius:9, fontWeight:700 }}>Workforce operations</Link><Link href="/admin/system/health" style={{ textDecoration:'none', border:'1px solid var(--line)', padding:'10px 14px', borderRadius:9, fontWeight:700 }}>System health</Link><Link href="/jobs" style={{ textDecoration:'none', border:'1px solid var(--line)', padding:'10px 14px', borderRadius:9, fontWeight:700 }}>View careers page</Link></div></div>
    {error && <div role="alert" className="card" style={{ marginTop:18, padding:16, color:'#8a2323' }}>{error}</div>}
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', margin:'26px 0' }}>{Object.entries(counts).map(([status,count]) => <button key={status} type="button" onClick={() => setQuery(status)} className="card" style={{ padding:'12px 16px', cursor:'pointer', border:'1px solid var(--line)', background:'white' }}><strong>{count}</strong><span style={{ marginLeft:8, color:'var(--muted)' }}>{status}</span></button>)}</div>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants, roles, location or status" style={{ width:'100%', padding:13, border:'1px solid var(--line)', borderRadius:10, marginBottom:14 }} />
    <div style={{ display:'grid', gap:10 }}>{filtered.map((app) => <article className="card" key={app.id} style={{ padding:20 }}><div style={{ display:'flex', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}><div><h2 style={{ margin:0, fontSize:20 }}>{app.full_name}</h2><div style={{ color:'var(--muted)', marginTop:5 }}>{app.role_applied} · {app.email}</div>{app.country_of_residence && <div style={{ color:'var(--muted)', marginTop:3 }}>{app.country_of_residence} {app.living_in_uk === 'No' ? '· International' : '· UK'}</div>}</div><div style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ padding:'7px 10px', borderRadius:999, background:'var(--soft)', fontSize:12, fontWeight:800 }}>{app.status}</span><Link href={`/admin/applications/${app.id}`} style={{ border:'1px solid var(--line)', padding:'8px 11px', borderRadius:9, textDecoration:'none', fontWeight:700 }}>Open file</Link></div></div></article>)}</div>
  </main>;
}
