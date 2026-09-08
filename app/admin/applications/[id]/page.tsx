'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';
import { recruitmentConfig } from '@/lib/recruitment-config';

type Application = Record<string, unknown> & { id: string; full_name: string; email: string; role_applied: string; status: string; application_data?: Record<string, unknown>; living_in_uk?: string | null };
type Document = { id: string; document_type: string; original_filename: string; status: string; storage_path: string; review_note?: string | null };

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch('/api/admin/applications').then((r) => r.json()),
      fetch(`/api/admin/documents?applicationId=${encodeURIComponent(id)}`).then((r) => r.json()),
    ]).then(([apps, docs]) => {
      const found = (apps.applications || []).find((item: Application) => item.id === id) || null;
      setApplication(found); setStatus(found?.status || ''); setDocuments(docs.documents || []);
    }).catch(() => setNotice('Unable to load application.'));
  }, [id]);

  async function changeStatus(next: string) {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/admin/applications?id=${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: next }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to update status.');
      setApplication((current) => current ? { ...current, status: next } : current); setStatus(next); setNotice(`Status changed to ${next}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update status.'); }
    finally { setSaving(false); }
  }

  async function action(url: string, body: Record<string, unknown>) {
    setSaving(true); setNotice(null);
    try { const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Action failed.'); setNotice(payload.acceptanceLink ? `Contract created. Candidate link: ${payload.acceptanceLink}` : payload.link ? `Invitation created. Candidate link: ${payload.link}` : 'Action completed.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Action failed.'); }
    finally { setSaving(false); }
  }

  async function reviewDocument(docId: string, nextStatus: string) {
    setSaving(true); setNotice(null);
    try { const response = await fetch(`/api/admin/documents?id=${encodeURIComponent(docId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to review document.'); setDocuments((docs) => docs.map((d) => d.id === docId ? { ...d, status: nextStatus } : d)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to review document.'); }
    finally { setSaving(false); }
  }

  if (!application) return <main className="wrap" style={{ padding: 40 }}><p>{notice || 'Loading application...'}</p><Link href="/admin">Back to recruiter workspace</Link></main>;

  const internationalNurse = application.role_applied === 'Registered Nurse - International Recruitment' || (application.role_applied === 'Registered Nurse' && application.living_in_uk === 'No');

  return <main className="wrap" style={{ padding: '34px 0 80px', maxWidth: 1080 }}><Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Recruiter workspace</Link><header style={{ margin: '18px 0 24px' }}><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>{lauremCompany.tradingName.toUpperCase()} CANDIDATE FILE</p><h1>{application.full_name}</h1><p style={{ color: 'var(--muted)' }}>{application.role_applied} · {application.email}</p></header>{notice && <div role="alert" className="card" style={{ padding: 14, marginBottom: 14 }}>{notice}</div>}

<section className="card" style={{ padding: 22, marginBottom: 14 }}><h2>Recruitment status</h2><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><select value={status} disabled={saving} onChange={(e) => changeStatus(e.target.value)} style={{ padding: 11, border: '1px solid var(--line)', borderRadius: 9 }}>{recruitmentConfig.statusFlow.map((s) => <option key={s}>{s}</option>)}</select><button disabled={saving} onClick={() => action('/api/admin/second-interviews', { applicationId: id })} style={buttonPrimary}>Create second-interview link</button>{internationalNurse ? <Link href={`/admin/applications/${id}/contract`} style={buttonPrimary}>Prepare international nurse contract</Link> : <button disabled={saving} onClick={() => action('/api/admin/contracts', { applicationId: id, minimumWeeklyHours: 40 })} style={buttonPrimary}>Generate contract</button>}<button disabled={saving} onClick={() => action('/api/admin/onboarding', { applicationId: id })} style={buttonSecondary}>Convert to staff</button></div></section>

<section className="card" style={{ padding: 22, marginBottom: 14 }}><h2>Application information</h2><div style={grid}><Info label="Phone" value={application.phone} /><Info label="Nationality" value={application.nationality} /><Info label="Country" value={application.country_of_residence} /><Info label="Pathway" value={internationalNurse ? 'International' : 'UK'} /><Info label="Start date" value={application.start_date} /><Info label="Work permission" value={application.work_permission} /></div><Detail title="Qualifications" value={application.qualifications} /><Detail title="Care / professional experience" value={application.care_experience || application.professional_experience} /><Detail title="Application payload" value={JSON.stringify(application.application_data || {}, null, 2)} /></section>

<section className="card" style={{ padding: 22 }}><h2>Documents</h2>{documents.length === 0 ? <p style={{ color: 'var(--muted)' }}>No documents uploaded yet.</p> : <div style={{ display: 'grid', gap: 10 }}>{documents.map((doc) => <div key={doc.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><strong>{doc.document_type}</strong><div style={{ color: 'var(--muted)', marginTop: 4 }}>{doc.original_filename} · {doc.status}</div></div><div style={{ display: 'flex', gap: 8 }}><button disabled={saving} onClick={() => reviewDocument(doc.id, 'approved')} style={buttonPrimary}>Approve</button><button disabled={saving} onClick={() => reviewDocument(doc.id, 'rejected')} style={buttonSecondary}>Reject</button></div></div>)}</div>}</section>

<p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 18 }}>International nurse contracts include sponsorship, NMC registration, relocation, ethical recruitment and proportionate repayment provisions informed by current UK and Scottish guidance. Final terms require employer and legal review before issue.</p></main>;
}
function Info({ label, value }: { label: string; value: unknown }) { return <div><div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{label}</div><div style={{ marginTop: 4 }}>{value ? String(value) : 'Not provided'}</div></div>; }
function Detail({ title, value }: { title: string; value: unknown }) { return <div style={{ marginTop: 18 }}><h3>{title}</h3><p style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)', lineHeight: 1.65 }}>{value ? String(value) : 'Not provided'}</p></div>; }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 };
const buttonPrimary = { background: 'var(--ink)', color: 'white', border: 0, padding: '11px 14px', borderRadius: 9, fontWeight: 800, textDecoration: 'none', display: 'inline-block' };
const buttonSecondary = { background: 'white', color: 'var(--ink)', border: '1px solid var(--line)', padding: '11px 14px', borderRadius: 9, fontWeight: 800 };