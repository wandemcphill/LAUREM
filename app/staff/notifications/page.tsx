'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  category: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5eaf0',
  borderRadius: 16,
  padding: 20,
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function StaffNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const response = await fetch('/api/staff/notifications', { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/staff/login');
        return;
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to load notifications.');
      setItems(body.notifications || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [router]);

  async function markRead(id: string) {
    setBusy(id);
    try {
      const response = await fetch('/api/staff/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to mark notification as read.');
      }
      setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to mark notification as read.');
    } finally {
      setBusy('');
    }
  }

  async function markAllRead() {
    setBusy('all');
    try {
      const response = await fetch('/api/staff/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to mark notifications as read.');
      }
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: now })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to mark notifications as read.');
    } finally {
      setBusy('');
    }
  }

  const unread = useMemo(() => items.filter((item) => !item.read_at), [items]);

  if (loading) {
    return <main style={{ minHeight: '100vh', background: '#f4f7fb', padding: 24, fontFamily: 'system-ui', color: '#102a43' }}><div style={{ maxWidth: 1000, margin: '0 auto', ...card }}>Loading notifications…</div></main>;
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f4f7fb', padding: '24px 18px 60px', fontFamily: 'system-ui', color: '#102a43' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <button onClick={() => router.push('/staff')} style={{ border: 0, background: 'transparent', padding: 0, color: '#0f766e', fontWeight: 800 }}>← Staff Portal</button>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', margin: '18px 0 20px' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: '#0f766e' }}>STAFF UPDATES</div>
            <h1 style={{ margin: '6px 0 5px' }}>Notifications</h1>
            <p style={{ color: '#627d98', margin: 0 }}>{unread.length ? unread.length + ' unread notification' + (unread.length === 1 ? '' : 's') + '.' : 'You are all caught up.'}</p>
          </div>
          {!!unread.length && <button disabled={busy === 'all'} onClick={() => void markAllRead()} style={{ border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', padding: '10px 14px', fontWeight: 900 }}>{busy === 'all' ? 'Saving…' : 'Mark all as read'}</button>}
        </header>

        {error && <div role="alert" style={{ ...card, marginBottom: 14, color: '#b42318' }}>{error}</div>}

        {!items.length ? <section style={card}><h2 style={{ marginTop: 0 }}>No notifications yet</h2><p style={{ color: '#627d98' }}>Important staff updates, document notices, leave decisions and sponsorship milestones will appear here.</p></section> : (
          <section style={{ display: 'grid', gap: 12 }}>
            {items.map((item) => (
              <article key={item.id} style={{ ...card, borderColor: item.read_at ? '#e5eaf0' : '#b7ead0', background: item.read_at ? '#fff' : '#f8fffc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', color: '#0f766e' }}>{item.category.replaceAll('_', ' ').toUpperCase()}</span>
                      {!item.read_at && <span style={{ fontSize: 11, fontWeight: 900, color: '#8a5a00', background: '#fff4d8', borderRadius: 999, padding: '5px 8px' }}>UNREAD</span>}
                    </div>
                    <h2 style={{ margin: '7px 0 6px', fontSize: 19 }}>{item.title}</h2>
                    <p style={{ margin: 0, color: '#486581', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.body}</p>
                    <div style={{ marginTop: 9, color: '#829ab1', fontSize: 12 }}>{formatDate(item.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!item.read_at && <button disabled={busy === item.id} onClick={() => void markRead(item.id)} style={{ border: '1px solid #d9e2ec', background: '#fff', color: '#334e68', borderRadius: 9, padding: '9px 12px', fontWeight: 800 }}>{busy === item.id ? 'Saving…' : 'Mark read'}</button>}
                    {item.action_url && <button onClick={() => router.push(item.action_url!)} style={{ border: 0, background: '#0f766e', color: '#fff', borderRadius: 9, padding: '9px 12px', fontWeight: 900 }}>Open →</button>}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
