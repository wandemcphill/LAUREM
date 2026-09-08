import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';

export default function HomePage() {
  return (
    <main className="wrap" style={{ padding: '56px 0 80px' }}>
      <section className="card" style={{ padding: 40 }}>
        <div style={{ maxWidth: 760 }}>
          <p style={{ letterSpacing: '.12em', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>LAUREM CAREGROUP</p>
          <h1 style={{ fontSize: 'clamp(38px, 6vw, 68px)', lineHeight: 1.02, margin: '12px 0 18px' }}>
            Recruitment, onboarding and workforce management in one place.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 19, lineHeight: 1.65, marginBottom: 28 }}>
            A modern recruitment experience for UK-based candidates and nurses applying internationally, with structured screening, interviews, documents and onboarding.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/jobs" style={{ background: 'var(--ink)', color: 'white', padding: '13px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>View vacancies</Link>
            <Link href="/nurse-interview" style={{ border: '1px solid var(--line)', padding: '13px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>Nurse interview</Link>
          </div>
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 18 }}>
        {['Candidate application', 'UK & international nurses', 'Interview & assessment', 'Documents & onboarding'].map((item) => (
          <div className="card" key={item} style={{ padding: 22 }}><strong>{item}</strong><p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Built as a configurable recruitment workflow for {lauremCompany.tradingName}.</p></div>
        ))}
      </section>
    </main>
  );
}
