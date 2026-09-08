'use client';

import { useEffect, useState } from 'react';

type Task = { id: string; category: string; title: string; description: string | null; required: boolean; status: string; acknowledgement_required: boolean; acknowledged_at?: string | null; document_path?: string | null };

type PackageResponse = { package: { title: string; audience: string; status: string }; staff: { full_name: string; job_title: string; employee_number: string; start_date?: string | null; location?: string | null } | null; tasks: Task[] };

export default function EmployeeOnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [data, setData] = useState<PackageResponse | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { params.then((value) => setToken(value.token)); }, [params]);

  async function load() {
    if (!token) return;
    try {
      const response = await fetch(`/api/onboarding/${encodeURIComponent(token)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load onboarding package.');
      setData(body); setName(body.staff?.full_name || '');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load onboarding package.'); }
  }

  useEffect(() => { load(); }, [token]);

  async function acknowledge(taskId: string) {
    if (!name.trim()) { setMessage('Enter your full name before acknowledging onboarding items.'); return; }
    setBusy(taskId); setMessage(null);
    try {
      const response = await fetch(`/api/onboarding/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId, action: 'acknowledge', name: name.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to record acknowledgement.');
      setData((current) => current ? { ...current, package: { ...current.package, status: body.package.status }, tasks: current.tasks.map((task) => task.id === taskId ? body.task : task) } : current);
      setMessage('Acknowledgement recorded.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record acknowledgement.'); }
    finally { setBusy(null); }
  }

  const required = data?.tasks.filter((task) => task.required) || [];
  const complete = required.filter((task) => task.status === 'completed' || task.status === 'waived').length;

  return <main className="wrap" style={{ padding: '38px 0 80px', maxWidth: 980 }}>
    <section className="card" style={{ padding: 28 }}>
      <p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>LAUREM CAREGROUP</p>
      <h1>{data?.package.title || 'Your Laurem onboarding'}</h1>
      {data?.staff && <p style={{ color: 'var(--muted)' }}>{data.staff.full_name} · {data.staff.job_title} · {data.staff.employee_number}</p>}
      {message && <div role="alert" style={{ padding: 13, margin: '16px 0', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--soft)' }}>{message}</div>}
      {!data && !message && <p>Loading your onboarding package...</p>}
      {data && <>
        <div style={{ marginTop: 22, padding: 16, background: 'var(--soft)', borderRadius: 12 }}>
          <strong>Onboarding progress</strong><div style={{ marginTop: 5 }}>{complete} of {required.length} required items completed · {data.package.status}</div>
        </div>
        <div style={{ marginTop: 22 }}><label>Full name for acknowledgements<input value={name} onChange={(e) => setName(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 12, border: '1px solid var(--line)', borderRadius: 9 }} /></label></div>
        <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
          {data.tasks.map((task) => <article key={task.id} className="card" style={{ padding: 18 }}>
            <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800 }}>{task.category.toUpperCase()}</span>
            <h2 style={{ fontSize: 18, margin: '7px 0' }}>{task.title}</h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.55 }}>{task.description}</p>
            {task.document_path && <p style={{ fontSize: 13, color: 'var(--muted)' }}>This item is supported by your Laurem handbook/welcome package.</p>}
            {task.acknowledgement_required && task.status !== 'completed' && task.status !== 'waived' && <button disabled={busy === task.id} onClick={() => acknowledge(task.id)} style={buttonPrimary}>{busy === task.id ? 'Saving…' : 'I have read and acknowledge this item'}</button>}
            {(task.status === 'completed' || task.status === 'waived') && <span style={{ fontWeight: 800 }}>✓ Completed</span>}
          </article>)}
        </div>
        {data.package.status === 'complete' && <div style={{ marginTop: 22, padding: 18, border: '1px solid var(--line)', borderRadius: 12 }}><strong>Your onboarding acknowledgement package is complete.</strong><p style={{ color: 'var(--muted)', marginBottom: 0 }}>Laurem will continue with the remaining workforce and role-specific checks.</p></div>}
      </>}
    </section>
  </main>;
}

const buttonPrimary = { background: 'var(--ink)', color: 'white', border: 0, padding: '11px 14px', borderRadius: 9, fontWeight: 800, cursor: 'pointer' };
