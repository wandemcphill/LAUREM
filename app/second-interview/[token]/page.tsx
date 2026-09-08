'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLauremNurseSecondInterviewQuestions } from '@/lib/laurem-nurse-interviews';

export default function SecondInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questions = useMemo(() => getLauremNurseSecondInterviewQuestions('uk'), []);

  useEffect(() => { params.then((p) => setToken(p.token)); }, [params]);

  async function submit() {
    setError(null);
    const missing = questions.find((q) => !answers[q.id]?.trim());
    if (missing) { setError(`Please answer question ${missing.id}.`); return; }
    try {
      const response = await fetch('/api/second-interview', { method: 'POST', headers: { 'content-type': 'application/json', 'x-second-interview-token': token }, body: JSON.stringify({ answers }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to submit second interview.');
      setSubmitted(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit second interview.'); }
  }

  if (submitted) return <main className="wrap" style={{ padding: '80px 0' }}><section className="card" style={{ padding: 32, textAlign: 'center' }}><p style={{ color: 'var(--accent)', fontWeight: 800 }}>SECOND INTERVIEW RECEIVED</p><h1>Thank you.</h1><p style={{ color: 'var(--muted)' }}>Your responses have been submitted securely. Laurem will contact you regarding the next stage.</p></section></main>;
  return <main className="wrap" style={{ padding: '42px 0 80px', maxWidth: 920 }}><header style={{ marginBottom: 20 }}><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>LAUREM CAREGROUP</p><h1>Second interview</h1><p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Complete every question and submit your responses through this private interview link.</p></header>{error && <div role="alert" className="card" style={{ padding: 14, marginBottom: 14, color: '#8a2323' }}>{error}</div>}<div style={{ display: 'grid', gap: 14 }}>{questions.map((q, i) => <section className="card" key={q.id} style={{ padding: 22 }}><div style={{ color: 'var(--accent)', fontWeight: 800 }}>Q{i + 1} · {q.category}</div><h2 style={{ lineHeight: 1.45 }}>{q.text}</h2>{q.guidance && <p style={{ color: 'var(--muted)' }}>{q.guidance}</p>}<textarea rows={6} value={answers[q.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid var(--line)', borderRadius: 9, font: 'inherit' }} /></section>)}</div><button disabled={!token} onClick={submit} style={{ marginTop: 18, background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 800 }}>Submit second interview</button></main>;
}
