import Link from 'next/link';
import { lauremCompany } from '@/lib/laurem-company-config';

const jobs = lauremCompany.recruitment.roles.map((role) => ({
  role,
  locations: lauremCompany.locations,
  international: role === 'Registered Nurse' && lauremCompany.recruitment.sponsorship.nurse,
}));

export default function JobsPage() {
  return (
    <main className="wrap" style={{ padding: '48px 0 80px' }}>
      <Link href="/" style={{ textDecoration: 'none', color: 'var(--muted)' }}>← Recruitment portal</Link>
      <h1 style={{ fontSize: 48, marginBottom: 10 }}>Current opportunities</h1>
      <p style={{ color: 'var(--muted)', fontSize: 18, maxWidth: 760, lineHeight: 1.6 }}>
        Explore opportunities with {lauremCompany.tradingName}. Sponsorship and right-to-work requirements are assessed as part of the recruitment process.
      </p>
      <div style={{ display: 'grid', gap: 16, marginTop: 28 }}>
        {jobs.map((job) => (
          <article className="card" key={job.role} style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0 }}>{job.role}</h2>
                <p style={{ color: 'var(--muted)' }}>{job.locations.join(' · ')}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {job.international && <span style={{ padding: '7px 10px', borderRadius: 999, background: '#eaf5f0', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>INTERNATIONAL NURSE PATHWAY</span>}
                <Link href={job.role === 'Registered Nurse' ? '/nurse-interview' : '/jobs'} style={{ border: '1px solid var(--line)', padding: '11px 14px', borderRadius: 9, textDecoration: 'none', fontWeight: 700 }}>Explore</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
