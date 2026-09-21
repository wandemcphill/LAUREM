'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function StaffChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 10) {
      setError('Use a password of at least 10 characters.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/staff/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to change your password.');
      setMessage(body.message || 'Password changed. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f7fb', padding: 24, fontFamily: 'system-ui', color: '#102a43' }}>
      <section style={{ width: '100%', maxWidth: 520, background: '#fff', padding: 32, borderRadius: 20, border: '1px solid #e5eaf0' }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: '#0f766e' }}>LAUREM Care</div>
        <h1 style={{ margin: '10px 0 8px' }}>Change Staff Portal password</h1>
        <p style={{ color: '#627d98', lineHeight: 1.55 }}>Changing your password signs out every existing Staff Portal session.</p>

        {error && <div role="alert" style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#9b2c2c', padding: 12, borderRadius: 10, marginBottom: 14 }}>{error}</div>}
        {message && <div role="status" style={{ background: '#effcf6', border: '1px solid #b7e4cc', color: '#166534', padding: 12, borderRadius: 10, marginBottom: 14 }}>{message}</div>}

        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontWeight: 800 }}>Current password
            <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} style={inputStyle} />
          </label>
          <label style={{ fontWeight: 800 }}>New password
            <input type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={inputStyle} />
          </label>
          <label style={{ fontWeight: 800 }}>Confirm new password
            <input type="password" autoComplete="new-password" minLength={10} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={inputStyle} />
          </label>
          <button disabled={busy} style={{ padding: 13, border: 0, borderRadius: 10, background: '#102a43', color: '#fff', fontWeight: 900 }}>
            {busy ? 'Changing password…' : 'Change password'}
          </button>
        </form>

        <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
          <Link href="/staff/profile" style={linkStyle}>← Back to profile</Link>
          <Link href="/staff" style={linkStyle}>Staff Portal home</Link>
          <Link href="/staff/password-reset" style={{ ...linkStyle, color: '#627d98' }}>Forgot password?</Link>
        </div>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 7,
  padding: '12px 14px',
  border: '1px solid #d9e2ec',
  borderRadius: 10,
  font: 'inherit',
};

const linkStyle: React.CSSProperties = {
  color: '#0f766e',
  fontWeight: 900,
  textDecoration: 'none',
};
