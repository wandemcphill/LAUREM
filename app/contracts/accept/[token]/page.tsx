'use client';

import { useEffect, useState } from 'react';

export default function ContractAcceptancePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('');
  const [contract, setContract] = useState<{ contract_content?: string; status?: string } | null>(null);
  const [name, setName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { params.then((p) => setToken(p.token)); }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/contracts/accept?token=${encodeURIComponent(token)}`, { headers: { 'x-contract-token': token } })
      .then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Unable to load contract.'); return body; })
      .then((body) => setContract(body.contract))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load contract.'));
  }, [token]);

  async function respond(accepted: boolean) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/contracts/accept', { method: 'POST', headers: { 'content-type': 'application/json', 'x-contract-token': token }, body: JSON.stringify({ accepted, acceptedByName: name, declineReason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to process your response.');
      setMessage(accepted ? 'Your contract has been accepted. Laurem will proceed with your onboarding.' : 'Your response has been recorded. Laurem will contact you regarding the next steps.');
      setContract((current) => current ? { ...current, status: accepted ? 'accepted' : 'declined' } : current);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to process your response.'); }
    finally { setBusy(false); }
  }

  return <main className="wrap" style={{ padding: '38px 0 80px', maxWidth: 980 }}><section className="card" style={{ padding: 28 }}><p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>LAUREM CAREGROUP</p><h1>Employment contract</h1>{message && <div role="alert" style={{ padding: 14, margin: '16px 0', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--soft)' }}>{message}</div>}{contract?.contract_content && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Arial, sans-serif', lineHeight: 1.65, borderTop: '1px solid var(--line)', paddingTop: 22 }}>{contract.contract_content}</pre>}{contract?.status === 'accepted' || contract?.status === 'declined' ? null : <><div style={{ marginTop: 24 }}><label>Full name used for acceptance<input value={name} onChange={(e) => setName(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 12, border: '1px solid var(--line)', borderRadius: 9 }} /></label></div><div style={{ marginTop: 16 }}><label>Reason for declining (optional)<textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={4} style={{ display: 'block', width: '100%', marginTop: 6, padding: 12, border: '1px solid var(--line)', borderRadius: 9 }} /></label></div><div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}><button disabled={busy || !name.trim()} onClick={() => respond(true)} style={{ background: 'var(--ink)', color: 'white', border: 0, padding: '12px 18px', borderRadius: 9, fontWeight: 800 }}>Accept contract</button><button disabled={busy} onClick={() => respond(false)} style={{ background: 'white', color: 'var(--ink)', border: '1px solid var(--line)', padding: '12px 18px', borderRadius: 9, fontWeight: 800 }}>Decline</button></div></>}</section></main>;
}
