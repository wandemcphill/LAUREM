'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffPortalHome() {
  const router = useRouter();
  const [staff, setStaff] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/staff/me', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { router.replace('/staff/login'); return; }
      const data = await response.json().catch(() => ({}));
      if (response.ok) setStaff(data.staff);
    });
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/staff/auth/logout', { method: 'POST' });
    router.replace('/staff/login');
  }

  if (!staff) return <main style={{ padding: 40, fontFamily: 'system-ui' }}>Loading LAUREM Staff Portal…</main>;

  const links = [
    ['Messages', '/staff/messages', 'Private internal staff communication.'],
    ['My Shifts', '/staff/shifts', 'View upcoming scheduled assignments.'],
    ['Timesheets', '/staff/timesheets', 'Submit and review worked hours.'],
    ['Documents', '/staff/documents', 'View employment documents on your record.'],
  ];

  return <main style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: 'system-ui', padding: 24, color: '#102a43' }}>
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 18, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div><div style={{ color: '#0f766e', fontSize: 12, fontWeight: 900, letterSpacing: 1.4 }}>LAUREM CARE</div><h1>Welcome, {staff.full_name}</h1></div>
          <button disabled={loggingOut} onClick={() => void logout()} style={{ border: '1px solid #dbe5ea', background: '#fff', borderRadius: 10, padding: '9px 12px', fontWeight: 800 }}>{loggingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
        <p style={{ color: '#627d98' }}>LAUREM ID: <strong>{staff.laurem_id || staff.employee_number}</strong></p>
        <p style={{ color: '#627d98' }}>Internal address: <strong>{staff.portal_address || 'Provisioning…'}</strong></p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 20 }}>
          {links.map(([label, path, description]) => <button key={path} onClick={() => router.push(path)} style={{ padding: 18, textAlign: 'left', background: '#fff', border: '1px solid #dbe5ea', borderRadius: 12, fontWeight: 900 }}>{label}<div style={{ fontSize: 12, color: '#627d98', marginTop: 6 }}>{description}</div></button>)}
        </div>
      </div>
    </div>
  </main>;
}
