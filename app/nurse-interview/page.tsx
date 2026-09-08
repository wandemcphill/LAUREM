'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLauremNurseFirstInterviewQuestions, type NursePathway, type InterviewQuestion } from '@/lib/laurem-nurse-interviews';

export default function NurseInterviewPage() {
  const [pathway, setPathway] = useState<NursePathway>('uk');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
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
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSavedAt(null);
    }
  }

  const answered = questions.filter((question) => answers[question.id]?.trim()).length;

  return (
    <main className="wrap" style={{ padding: '42px 0 80px' }}>
      <section className="card" style={{ padding: 32, marginBottom: 18 }}>
        <p style={{ color: 'var(--accent)', letterSpacing: '.1em', fontWeight: 700, fontSize: 12 }}>LAUREM NURSE INTERVIEW</p>
        <h1 style={{ fontSize: 44, margin: '10px 0' }}>Professional screening interview</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, maxWidth: 760 }}>
          This interview tests clinical judgement, patient safety, safeguarding, communication, teamwork and professional practice. The international version adds UK registration and relocation questions.
        </p>
        <div style={{ marginTop: 24 }}>
          <strong>Applicant pathway</strong>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {(['uk', 'international'] as NursePathway[]).map((value) => (
              <button key={value} type="button" onClick={() => setPathway(value)} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid var(--line)', background: pathway === value ? 'var(--ink)' : 'white', color: pathway === value ? 'white' : 'var(--ink)', fontWeight: 700 }}>
                {value === 'uk' ? 'UK-based nurse' : 'International nurse'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gap: 14 }}>
        {questions.map((question, index) => <InterviewQuestionCard key={question.id} index={index} question={question} value={answers[question.id] || ''} onChange={(value) => save({ ...answers, [question.id]: value })} />)}
      </div>

      <section className="card" style={{ padding: 22, marginTop: 18, position: 'sticky', bottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><strong>{answered} of {questions.length} answered</strong>{savedAt && <span style={{ color: 'var(--muted)', marginLeft: 12 }}>Saved {savedAt}</span>}</div>
          <button type="button" onClick={() => alert('Submission wiring is the next persistence layer. Your answers are currently autosaved in this browser.')} style={{ background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 700 }}>Continue</button>
        </div>
      </section>
    </main>
  );
}

function InterviewQuestionCard({ index, question, value, onChange }: { index: number; question: InterviewQuestion; value: string; onChange: (value: string) => void }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Q{index + 1}</span>
        <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>{question.category}</span>
      </div>
      <h2 style={{ fontSize: 20, lineHeight: 1.45 }}>{question.text}</h2>
      {question.guidance && <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{question.guidance}</p>}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={6} placeholder="Type your answer here..." style={{ width: '100%', resize: 'vertical', border: '1px solid var(--line)', borderRadius: 10, padding: 14, font: 'inherit' }} />
    </section>
  );
}
