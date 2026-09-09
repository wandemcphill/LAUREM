'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffPortalHome() {
  const router = useRouter();
  const [staff, setStaff] = useState<any>(null);

  useEffect(() => {
    fetch('/api/staff/me', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { router.replace('/staff/login'); return; }
      const data = await response.json().catch(() => ({}));
      if (response.ok) setStaff(data.staff);
    });
  }, [router]);

  if (!staff) return <main style={{ padding: 40, fontFamily: 'system-ui' }}>Loading LAUREM Staff Portal…</main>;

  const links = [
    ['Messages', '/staff/messages'],
    ['My Shifts', '/staff/shifts'],
    ['Timesheets', '/staff/timesheets'],
    ['Documents', '/staff/documents'],
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: 'system-ui', padding: 24, color: '#102a43' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 18, padding: 28 }}>
          <div style={{ color: '#0f766e', fontSize: 12, fontWeight: 900, letterSpacing: 1.4 }}>LAUREM CARE</div>
          <h1>Welcome, {staff.full_name}</h1>
          <p style={{ color: '#627d98' }}>LAUREM ID: <strong>{staff.laurem_id || staff.employee_number}</strong></p>
          <p style={{ color: '#627d98' }}>Internal address: <strong>{staff.portal_address || 'Provisioning…'}</strong></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: 20 }}>
            {links.map(([label, path]) => <button key={path} onClick={() => router.push(path)} style={{ padding: 18, textAlign: 'left', background: '#fff', border: '1px solid #dbe5ea', borderRadius: 12, fontWeight: 900 }}>{label}<div style={{ fontSize: 12, color: '#627d98', marginTop: 6 }}>Open →</div></button>)}
          </div>
        </div>
      </div>
    </main>
  );
}
