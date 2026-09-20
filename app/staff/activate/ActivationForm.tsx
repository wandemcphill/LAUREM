'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ActivationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token || !email) {
      setChecking(false);
      return;
    }
    fetch('/api/staff/auth/activate?token=' + encodeURIComponent(token) + '&email=' + encodeURIComponent(email), { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 && data.code === 'ACTIVATION_USED') {
          router.replace('/staff/login?activation=used');
          return;
        }
        if (!response.ok) throw new Error(data.error || 'This activation link is invalid or expired.');
        setChecking(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to validate activation link.');
        setChecking(false);
      });
  }, [token, email, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/staff/auth/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.code === 'ACTIVATION_USED') {
          router.replace('/staff/login?activation=used');
          return;
        }
        throw new Error(data.error || 'Unable to activate portal.');
      }
      router.replace('/staff/documents?activated=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to activate portal.');
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f7fb', fontFamily: 'system-ui', padding: 20 }}>
      <form onSubmit={submit} style={{ background: '#fff', padding: 28, border: '1px solid #e5eaf0', borderRadius: 18, width: 'min(440px,100%)' }}>
        <div style={{ color: '#0f766e', fontSize: 12, fontWeight: 900, letterSpacing: 1.4 }}>LAUREM CARE</div>
        <h1>Activate your personal portal</h1>
        <p style={{ color: '#627d98' }}>Create a password and your staff account will be activated.</p>
        {checking && <p style={{ color: '#627d98' }}>Checking your secure activation link…</p>}
        <input readOnly value={email} aria-label="Email" style={{ width: '100%', boxSizing: 'border-box', padding: 11, border: '1px solid #cbd5e1', borderRadius: 10, marginBottom: 10 }} />
        <input type="password" minLength={10} required placeholder="Password (10+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 11, border: '1px solid #cbd5e1', borderRadius: 10 }} />
        <button type="submit" disabled={checking || busy || !token} style={{ width: '100%', marginTop: 12, padding: 12, border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 900 }}>{checking ? 'Checking activation link…' : busy ? 'Activating…' : 'Activate portal'}</button>
        {!token && <p role="alert" style={{ color: '#b42318' }}>This activation link is incomplete or invalid.</p>}
        {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
      </form>
    </main>
  );
}