'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLauremCalmSecondInterviewQuestions } from '@/lib/laurem-calm-interviews';

export default function SecondInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questions = useMemo(() => getLauremCalmSecondInterviewQuestions('uk'), []);
  const current = questions[questionIndex];
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const remaining = questions.length - answered;
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const storageKey = 'laurem:second-interview:draft';

  useEffect(() => {
    params.then((p) => setToken(p.token));
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { answers?: Record<string, string>; questionIndex?: number };
      if (saved.answers) setAnswers(saved.answers);
      if (typeof saved.questionIndex === 'number') setQuestionIndex(Math.min(Math.max(saved.questionIndex, 0), questions.length - 1));
    } catch {
      // The interview remains usable when browser storage is unavailable.
    }
  }, [params, questions.length]);

  function save(next: Record<string, string>, nextIndex = questionIndex) {
    setAnswers(next);
    setError(null);
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ answers: next, questionIndex: nextIndex }));
    } catch {
      // Continue without persistence when storage is unavailable.
    }
  }

  function goTo(index: number) {
    const next = Math.min(Math.max(index, 0), questions.length - 1);
    setQuestionIndex(next);
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ answers, questionIndex: next }));
    } catch {
      // Continue without persistence when storage is unavailable.
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextQuestion() {
    if (!current) return;
    if (!answers[current.id]?.trim()) {
      setError('Take your time and add your answer before moving on.');
      return;
    }
    goTo(questionIndex + 1);
  }

  async function submit() {
    setError(null);
    const missing = questions.find((q) => !answers[q.id]?.trim());
    if (missing) {
      const index = questions.findIndex((q) => q.id === missing.id);
      setError('There is one question still waiting for an answer. We have taken you to it.');
      setQuestionIndex(index);
      return;
    }
    try {
      const response = await fetch('/api/second-interview', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-second-interview-token': token },
        body: JSON.stringify({ answers }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to submit second interview.');
      setSubmitted(true);
      window.sessionStorage.removeItem(storageKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit second interview.');
    }
  }

  if (submitted) return <main className="wrap" style={{ padding: '80px 0' }}><section className="card" style={{ padding: 32, textAlign: 'center' }}><p style={{ color: 'var(--accent)', fontWeight: 800 }}>SECOND INTERVIEW RECEIVED</p><h1>Thank you.</h1><p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your responses have been submitted securely. Laurem will contact you regarding the next stage.</p></section></main>;

  if (!current) return null;

  return <main className="wrap" style={{ padding: '42px 0 80px', maxWidth: 920 }}>
    <header className="card" style={{ padding: 30, marginBottom: 18 }}>
      <p style={{ color: 'var(--accent)', letterSpacing: '.08em', fontWeight: 800, fontSize: 12 }}>LAUREM CAREGROUP · SECOND INTERVIEW</p>
      <h1 style={{ margin: '8px 0' }}>Let’s take this one step at a time.</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.65, maxWidth: 720 }}>This is a focused conversation about how you think, communicate and keep people safe. There are {questions.length} questions. There is no timer, and your answers are saved while this page is open.</p>
      <div style={{ marginTop: 18, height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }} aria-hidden="true"><div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s ease' }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 9, color: 'var(--muted)', fontSize: 13 }}><span>{answered} of {questions.length} answered</span><span>{remaining ? `${remaining} to go` : 'Ready to review'}</span></div>
    </header>

    {error && <div role="alert" aria-live="assertive" className="card" style={{ padding: 14, marginBottom: 14, border: '1px solid #dfb4b4', background: '#fff8f8', color: '#8a2323' }}>{error}</div>}

    <section className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}><span style={{ color: 'var(--accent)', fontWeight: 800 }}>Question {questionIndex + 1} of {questions.length}</span><span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>{current.category}</span></div>
      <h2 style={{ fontSize: 27, lineHeight: 1.4, margin: '16px 0 10px' }}>{current.text}</h2>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>Answer in your own words. We are interested in how you would approach the situation, not in perfect wording.</p>
      {current.guidance && <div style={{ padding: 14, borderRadius: 10, background: 'var(--soft)', color: 'var(--muted)', lineHeight: 1.55, marginBottom: 16 }}><strong>Think about:</strong> {current.guidance}</div>}
      <textarea aria-label={`Answer to question ${questionIndex + 1}`} autoFocus value={answers[current.id] || ''} onChange={(e) => save({ ...answers, [current.id]: e.target.value })} rows={9} placeholder="Take your time and write naturally..." style={{ width: '100%', resize: 'vertical', minHeight: 210, border: '1px solid var(--line)', borderRadius: 12, padding: 16, font: 'inherit', lineHeight: 1.6 }} />
      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>A few clear paragraphs are enough.</p>
    </section>

    <section className="card" style={{ padding: 18, marginTop: 16, position: 'sticky', bottom: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><button type="button" onClick={() => goTo(questionIndex - 1)} disabled={questionIndex === 0} style={secondaryButton}>Back</button><button type="button" onClick={() => { setError(null); setQuestionIndex(0); setTimeout(() => setQuestionIndex(0), 0); }} style={secondaryButton}>Start again</button>{questionIndex < questions.length - 1 ? <button type="button" onClick={nextQuestion} style={primaryButton}>Next question</button> : <button type="button" onClick={() => { if (remaining) submit(); else submit(); }} style={primaryButton}>{remaining ? 'Review answers' : 'Submit interview'}</button>}</div></section>
  </main>;
}

const primaryButton = { background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 800 };
const secondaryButton = { background: 'white', color: 'var(--ink)', border: '1px solid var(--line)', padding: '12px 18px', borderRadius: 9, fontWeight: 800 };