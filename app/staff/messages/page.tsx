'use client';
import { useEffect, useState } from 'react';

export default function StaffMessagesPage() {
  const [mailbox, setMailbox] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [to, setTo] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/staff/messages', { cache: 'no-store' });
    if (response.status === 401) { window.location.href = '/staff/login'; return; }
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setMailbox(data.mailbox); setRows(data.conversations || []); }
    else setError(data.error || 'Unable to load messages.');
  }

  async function openConversation(id: string) {
    setActive(id);
    const response = await fetch(`/api/staff/messages/${id}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setMessages(data.messages || []);
    else setError(data.error || 'Unable to open conversation.');
  }

  useEffect(() => { void load(); }, []);

  async function sendNew(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!to.trim() || !message) return;
    const response = await fetch('/api/staff/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to, message }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || 'Unable to send.'); return; }
    setTo(''); setDraft(''); await load(); await openConversation(data.conversation.id);
  }

  async function reply(event: React.FormEvent) {
    event.preventDefault();
    if (!active || !draft.trim()) return;
    const response = await fetch(`/api/staff/messages/${active}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: draft.trim() }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || 'Unable to send.'); return; }
    setMessages((current) => [...current, data.message]); setDraft(''); await load();
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: 'system-ui', padding: 20, color: '#102a43' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div><div style={{ fontSize: 12, fontWeight: 900, color: '#0f766e', letterSpacing: 1.4 }}>LAUREM CARE</div><h1 style={{ margin: '4px 0' }}>Messages</h1></div>
          <div style={{ fontWeight: 800 }}>{mailbox?.address}</div>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', background: '#fff', border: '1px solid #e5eaf0', borderRadius: 16, overflow: 'hidden', minHeight: 680 }}>
          <aside style={{ padding: 14, borderRight: '1px solid #edf2f7' }}>
            <form onSubmit={sendNew}>
              <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="name@lauremcare / name@lauremnurse" style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid #cbd5e1', borderRadius: 10, marginBottom: 8 }} />
              <textarea value={active ? draft : draft} onChange={(event) => setDraft(event.target.value)} rows={3} placeholder="Message…" style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid #cbd5e1', borderRadius: 10 }} />
              <button style={{ width: '100%', marginTop: 8, padding: 10, border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 900 }}>Start message</button>
            </form>
            <hr style={{ border: 0, borderTop: '1px solid #edf2f7', margin: '16px 0' }} />
            {rows.map((row) => <button key={row.id} onClick={() => void openConversation(row.id)} style={{ width: '100%', textAlign: 'left', border: 0, background: active === row.id ? '#e6fffb' : '#fff', padding: 12, borderRadius: 10, marginBottom: 6 }}><strong>{row.other?.full_name || row.other?.display || 'LAUREM Admin'}</strong><div style={{ fontSize: 12, color: '#627d98' }}>{row.other?.address || ''}</div><div style={{ fontSize: 12, color: '#829ab1' }}>{row.latest?.body || ''}</div></button>)}
          </aside>
          <section style={{ display: 'flex', flexDirection: 'column' }}>
            {!active ? <div style={{ margin: 'auto', color: '#627d98' }}>Select a conversation or use a known LAUREM handle.</div> : <>
              <div style={{ padding: 16, borderBottom: '1px solid #edf2f7', fontWeight: 900 }}>Conversation</div>
              <div style={{ flex: 1, padding: 18, display: 'grid', alignContent: 'start', gap: 10 }}>{messages.map((message) => <div key={message.id} style={{ justifySelf: message.sender_staff_id ? 'start' : 'end', maxWidth: '78%', background: message.sender_staff_id ? '#f4f7fb' : '#0f766e', color: message.sender_staff_id ? '#243b53' : '#fff', borderRadius: 14, padding: 12 }}><div style={{ whiteSpace: 'pre-wrap' }}>{message.body}</div><small>{new Date(message.created_at).toLocaleString('en-GB')}</small></div>)}</div>
              <form onSubmit={reply} style={{ padding: 14, borderTop: '1px solid #edf2f7', display: 'flex', gap: 8 }}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} style={{ flex: 1, padding: 10, border: '1px solid #cbd5e1', borderRadius: 10 }} /><button style={{ padding: '10px 16px', border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 900 }}>Send</button></form>
            </>}
          </section>
        </div>
        {error && <p style={{ color: '#b42318' }}>{error}</p>}
      </div>
    </main>
  );
}
