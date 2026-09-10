import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';

const buttonBase = {
  padding: '13px 18px',
  borderRadius: 10,
  textDecoration: 'none',
  fontWeight: 700,
};

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
            <Link href="/jobs" style={{ ...buttonBase, background: 'var(--ink)', color: 'white' }}>View vacancies</Link>
            <Link href="/nurse-interview" style={{ ...buttonBase, border: '1px solid var(--line)' }}>Nurse interview</Link>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 18 }}>
        {[
          ['Candidate application', 'Apply for current vacancies and track the recruitment process.'],
          ['UK & international nurses', 'Use the appropriate recruitment pathway and interview process.'],
          ['Interview & assessment', 'Complete structured interviews and assessments securely.'],
          ['Documents & onboarding', 'Submit required evidence and progress through onboarding.'],
        ].map(([title, description]) => (
          <div className="card" key={title} style={{ padding: 22 }}>
            <strong>{title}</strong>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{description}</p>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: 18, padding: 22 }} aria-label="Portal access">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <strong>Portal access</strong>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5, margin: '6px 0 0' }}>
              Existing LAUREM staff and authorised recruiters can sign in to their secure workspaces.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/staff/login" style={{ ...buttonBase, border: '1px solid var(--line)', display: 'inline-block' }}>
              Staff login
            </Link>
            <Link href="/admin/login" style={{ ...buttonBase, background: 'var(--ink)', color: 'white', display: 'inline-block' }}>
              Admin login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
