'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffLoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch('/api/staff/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ laurem_id: id, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Unable to sign in.');
      setBusy(false);
      return;
    }
    router.replace('/staff');
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f7fb', fontFamily: 'system-ui' }}>
      <form onSubmit={submit} style={{ background: '#fff', padding: 28, borderRadius: 18, border: '1px solid #e5eaf0', width: 'min(440px,90%)' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#0f766e', letterSpacing: 1.4 }}>LAUREM CARE</div>
        <h1>Staff Portal</h1>
        <p style={{ color: '#627d98' }}>Use the LAUREM ID issued after onboarding.</p>
        <input required placeholder="LAU-001000" value={id} onChange={(event) => setId(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 11, border: '1px solid #cbd5e1', borderRadius: 10, marginBottom: 10 }} />
        <input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 11, border: '1px solid #cbd5e1', borderRadius: 10 }} />
        <button disabled={busy} style={{ width: '100%', marginTop: 12, padding: 12, border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 900 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {error && <p style={{ color: '#b42318' }}>{error}</p>}
      </form>
    </main>
  );
}
