'use client';

import { useEffect, useRef, useState } from 'react';
import LauremCandidateJourney from '@/components/LauremCandidateJourney';

export default function ContractAcceptancePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [contract, setContract] = useState<any>(null);
  const [name, setName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [documentPackUrl, setDocumentPackUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const attestation = 'I confirm that I have read and understood this employment contract and agree to sign it electronically.';

  useEffect(() => {
    params.then((value) => setToken(value.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/contracts/accept?token=' + encodeURIComponent(token), { headers: { 'x-contract-token': token } })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load contract.');
        return body;
      })
      .then((body) => setContract(body.contract))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load contract.'));
  }, [token]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const position = point(event);
    const context = canvas.getContext('2d');
    if (!position || !context) return;
    context.beginPath();
    context.moveTo(position.x, position.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const position = point(event);
    const context = canvas.getContext('2d');
    if (!position || !context) return;
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.strokeStyle = '#173a31';
    context.lineTo(position.x, position.y);
    context.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function respond(accepted: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const signatureData = canvasRef.current?.toDataURL('image/png') || null;
      const response = await fetch('/api/contracts/accept', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-contract-token': token,
        },
        body: JSON.stringify({
          accepted,
          acceptedByName: name,
          declineReason,
          signatureData,
          attestation,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to process your response.');
      setDocumentPackUrl(body.documentPackUrl || '');
      setMessage(
        accepted
          ? 'Your employment contract has been signed. Your Job Description, Handbook and onboarding preparation checklist are already included in your LAUREM offer package.'
          : 'Your response has been recorded. LAUREM will contact you regarding the next steps.',
      );
      setContract((current: any) => current ? { ...current, status: accepted ? 'accepted' : 'declined' } : current);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process your response.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ padding: '38px 0 80px', maxWidth: 1000 }}>
      <LauremCandidateJourney current="documents" />
      <section className="card" style={{ padding: 28 }}>
        <p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '.08em' }}>LAUREM CARE</p>
        <h1>Employment contract</h1>
        <p style={{ color: 'var(--muted)' }}>Review and sign your contract online. You do not need to download or print it.</p>

        {message && (
          <div role="status" style={{ padding: 14, margin: '16px 0', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--soft)' }}>
            {message}
          </div>
        )}

        {contract?.contract_content && (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Arial,sans-serif', lineHeight: 1.65, borderTop: '1px solid var(--line)', paddingTop: 22 }}>
            {contract.contract_content}
          </pre>
        )}

        {contract?.status === 'accepted' && (
          <section style={{ marginTop: 22, padding: 18, borderRadius: 12, background: '#f7fcf9' }}>
            <strong>Contract signed successfully</strong>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Next, open the Job Description and Handbook from the offer-package email and sign each online. Your onboarding preparation checklist is available in the same package.
            </p>
            {documentPackUrl ? (
              <a href={documentPackUrl} style={buttonPrimary}>Continue to Job Description & Handbook</a>
            ) : (
              <p style={{ color: 'var(--muted)' }}>Use the Job Description & Handbook link in your original LAUREM offer-package email.</p>
            )}
          </section>
        )}

        {contract?.status === 'declined' ? (
          <div style={{ marginTop: 22, padding: 16, borderRadius: 10, background: '#fff8f8' }}>
            Your response has been recorded. LAUREM will contact you regarding the next steps.
          </div>
        ) : contract?.status === 'accepted' ? null : (
          <>
            <section style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
              <h2>Electronic signature</h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                Enter your full legal name and optionally draw your signature. The platform records the signing timestamp and audit details.
              </p>
              <label>
                Full legal name
                <input value={name} onChange={(event) => setName(event.target.value)} style={input} />
              </label>

              <div style={{ marginTop: 14, fontWeight: 800, fontSize: 13 }}>Optional handwritten signature</div>
              <canvas
                ref={canvasRef}
                width={900}
                height={180}
                onPointerDown={start}
                onPointerMove={draw}
                onPointerUp={() => { drawing.current = false; }}
                onPointerCancel={() => { drawing.current = false; }}
                style={{ width: '100%', height: 180, border: '1px solid var(--line)', borderRadius: 10, marginTop: 7, touchAction: 'none' }}
              />
              <button type="button" onClick={clear} style={buttonSecondary}>Clear signature</button>

              <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 16, fontSize: 13, lineHeight: 1.5 }}>
                <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} style={{ marginTop: 3 }} />
                <span>{attestation}</span>
              </label>
            </section>

            <div style={{ marginTop: 20 }}>
              <label>
                Reason for declining (optional)
                <textarea value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} rows={3} style={input} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <button
                disabled={busy || !name.trim() || !agree}
                onClick={() => void respond(true)}
                style={{ ...buttonPrimary, opacity: busy || !name.trim() || !agree ? .55 : 1 }}
              >
                {busy ? 'Signing…' : 'Sign contract electronically'}
              </button>
              <button disabled={busy} onClick={() => void respond(false)} style={buttonSecondary}>
                Decline
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const buttonPrimary: React.CSSProperties = {
  display: 'inline-block',
  padding: '11px 14px',
  borderRadius: 9,
  background: 'var(--ink)',
  color: 'white',
  textDecoration: 'none',
  border: 0,
  fontWeight: 900,
};

const buttonSecondary: React.CSSProperties = {
  display: 'inline-block',
  padding: '9px 12px',
  borderRadius: 9,
  background: 'white',
  color: 'var(--ink)',
  textDecoration: 'none',
  border: '1px solid var(--line)',
  fontWeight: 800,
};

const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: 11,
  marginTop: 7,
  border: '1px solid var(--line)',
  borderRadius: 9,
  font: 'inherit',
};
