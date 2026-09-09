'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function StaffShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/staff/shifts', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { router.replace('/staff/login'); return; }
      const data = await response.json().catch(() => ({}));
      if (response.ok) setShifts(data.shifts || []);
      else setError(data.error || 'Unable to load shifts.');
      setLoading(false);
    });
  }, [router]);

  return <main style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: 'system-ui', padding: 24, color: '#102a43' }}>
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <button onClick={() => router.push('/staff')} style={{ border: 0, background: 'transparent', padding: 0, color: '#0f766e', fontWeight: 800 }}>← Staff Portal</button>
      <h1>My Shifts</h1>
      <p style={{ color: '#627d98' }}>Upcoming scheduled assignments.</p>
      {loading && <p>Loading shifts…</p>}
      {error && <p style={{ color: '#b42318' }}>{error}</p>}
      {!loading && !error && shifts.length === 0 && <div style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, padding: 22 }}>No upcoming shifts have been scheduled.</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {shifts.map((shift) => <article key={shift.id} style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{shift.client_name || 'LAUREM Assignment'}</strong><span style={{ fontSize: 12, fontWeight: 800 }}>{String(shift.status).replace('_', ' ').toUpperCase()}</span></div>
          <p style={{ marginBottom: 6 }}>{shift.location}</p>
          <p style={{ color: '#627d98', margin: 0 }}>{fmt(shift.scheduled_start)} → {fmt(shift.scheduled_end)}</p>
          {shift.notes && <p style={{ color: '#486581', whiteSpace: 'pre-wrap' }}>{shift.notes}</p>}
        </article>)}
      </div>
    </div>
  </main>;
}
