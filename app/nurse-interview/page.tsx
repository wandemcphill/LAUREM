'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLauremNurseFirstInterviewQuestions, type NursePathway } from '@/lib/laurem-nurse-interviews';
import { lauremCompany } from '@/lib/laurem-company-config';

export default function NurseInterviewPage() {
  const [pathway, setPathway] = useState<NursePathway>('uk');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questions = useMemo(() => getLauremNurseFirstInterviewQuestions(pathway), [pathway]);
  const storageKey = `laurem:nurse-interview:${pathway}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setAnswers(JSON.parse(raw) as Record<string, string>);
      else setAnswers({});
    } catch {
      setAnswers({});
    }
  }, [storageKey]);

  function save(next: Record<string, string>) {
    setAnswers(next);
    setError(null);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedAt(new Date().toLocaleTimeString());
    } catch { setSavedAt(null); }
  }

  async function submit() {
    setError(null);
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length) {
      setError(`Please answer all ${unanswered.length} remaining question${unanswered.length === 1 ? '' : 's'}.`);
      return;
    }
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setError('This interview needs a private invitation link. Your answers are saved in this browser and can be submitted once you open the invitation link sent by recruitment.');
      return;
    }
    try {
      const response = await fetch('/api/applications/interview', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-invitation-token': token },
        body: JSON.stringify({ pathway, answers }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to submit your interview.');
      setSubmitted(true);
      window.localStorage.removeItem(storageKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your interview.');
    }
  }

  const answered = questions.filter((question) => answers[question.id]?.trim()).length;

  if (submitted) {
    return <main className="wrap" style={{ padding: '80px 0' }}><section className="card" style={{ padding: 36, textAlign: 'center' }}><p style={{ color: 'var(--accent)', fontWeight: 800 }}>INTERVIEW RECEIVED</p><h1>Thank you.</h1><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your nursing interview responses have been submitted to {lauremCompany.tradingName}. The recruitment team will contact you about the next stage.</p></section></main>;
  }

  return (
    <main className="wrap" style={{ padding: '42px 0 80px' }}>
      <section className="card" style={{ padding: 32, marginBottom: 18 }}>
        <p style={{ color: 'var(--accent)', letterSpacing: '.1em', fontWeight: 700, fontSize: 12 }}>{lauremCompany.tradingName.toUpperCase()} NURSE INTERVIEW</p>
        <h1 style={{ fontSize: 44, margin: '10px 0' }}>Professional nursing screening</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, maxWidth: 760 }}>This assessment covers clinical judgement, patient safety, safeguarding, communication, teamwork and professional practice. International applicants receive additional registration, relocation and sponsorship questions.</p>
        <div style={{ marginTop: 24 }}><strong>Applicant pathway</strong><div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>{(['uk', 'international'] as NursePathway[]).map((value) => <button key={value} type="button" onClick={() => setPathway(value)} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid var(--line)', background: pathway === value ? 'var(--ink)' : 'white', color: pathway === value ? 'white' : 'var(--ink)', fontWeight: 700 }}>{value === 'uk' ? 'UK-based nurse' : 'International nurse'}</button>)}</div></div>
      </section>

      {error && <div role="alert" className="card" style={{ padding: 16, marginBottom: 14, borderColor: '#d98282', color: '#8a2323' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 14 }}>{questions.map((question, index) => <section className="card" key={question.id} style={{ padding: 24 }}><div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}><span style={{ color: 'var(--accent)', fontWeight: 800 }}>Q{index + 1}</span><span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>{question.category}</span></div><h2 style={{ fontSize: 20, lineHeight: 1.45 }}>{question.text}</h2>{question.guidance && <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{question.guidance}</p>}<textarea value={answers[question.id] || ''} onChange={(event) => save({ ...answers, [question.id]: event.target.value })} rows={6} placeholder="Type your answer here..." style={{ width: '100%', resize: 'vertical', border: '1px solid var(--line)', borderRadius: 10, padding: 14, font: 'inherit' }} /></section>)}</div>

      <section className="card" style={{ padding: 22, marginTop: 18, position: 'sticky', bottom: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}><div><strong>{answered} of {questions.length} answered</strong>{savedAt && <span style={{ color: 'var(--muted)', marginLeft: 12 }}>Saved {savedAt}</span>}</div><button type="button" onClick={submit} style={{ background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 700 }}>Submit interview</button></div></section>
    </main>
  );
}
