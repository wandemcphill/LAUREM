'use client';

import { useEffect, useRef, useState } from 'react';
import LauremCandidateJourney from '@/components/LauremCandidateJourney';

type DocumentRow = {
  id: string;
  document_type: 'job_description' | 'handbook';
  title: string;
  content: string;
  signature_status: 'pending' | 'signed';
  signed_name?: string | null;
  signed_at?: string | null;
};

type PageData = {
  application: { full_name: string; role_applied: string };
  pack: { id: string; status: string; expires_at: string };
  documents: DocumentRow[];
};

const attestation =
  'I confirm that I have read this document, understand it, and agree to sign it electronically.';

export default function CandidateDocumentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState('');
  const [data, setData] = useState<PageData | null>(null);
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [onboardingLink, setOnboardingLink] = useState('');
  const [waitingForReadiness, setWaitingForReadiness] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    params.then((value) => setToken(value.token));
  }, [params]);

  async function load() {
    if (!token) return;
    setError('');
    try {
      const response = await fetch('/api/candidate-documents?token=' + encodeURIComponent(token), {
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load your documents.');
      setData(body);
      if (!name && body.application?.full_name) setName(body.application.full_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your documents.');
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getPoint(event);
    if (!canvas || !context || !point) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getPoint(event);
    if (!canvas || !context || !point) return;
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.strokeStyle = '#173a31';
    context.lineTo(point.x, point.y);
    context.stroke();
    setSignatureData(canvas.toDataURL('image/png'));
  }

  async function signSelected() {
    if (!selected || busy) return;
    if (!name.trim() || !agree) {
      setError('Enter your full legal name and confirm the electronic-signature attestation.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/candidate-documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          documentId: selected.id,
          signedName: name.trim(),
          signatureData,
          attestation,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to sign the document.');

      setSelected(null);
      setAgree(false);
      clearSignature();
      if (body.onboardingLink) setOnboardingLink(body.onboardingLink);
      setWaitingForReadiness(Boolean(body.waitingForReadiness));
      setMessage(
        body.packStatus === 'completed'
          ? 'Your employment documents are complete. Your contract, Job Description and Handbook will not be requested again.'
          : 'Document signed successfully.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign the document.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <main className="wrap" style={{ padding: '70px 0', maxWidth: 860 }}>
        <section className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ color: 'var(--accent)', fontWeight: 900, letterSpacing: '.08em' }}>
            LAUREM CAREGROUP
          </p>
          <h1>We could not open your employment documents</h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.65 }}>{error}</p>
        </section>
      </main>
    );
  }

  const signedCount = data?.documents.filter((item) => item.signature_status === 'signed').length || 0;
  const complete = data?.pack.status === 'completed';

  return (
    <main className="wrap" style={{ padding: '38px 0 90px', maxWidth: 980 }}>
      <LauremCandidateJourney current="documents" />
      <section className="card" style={{ padding: 30 }}>
        <p style={{ color: 'var(--accent)', fontWeight: 900, letterSpacing: '.08em', fontSize: 12 }}>
          LAUREM CAREGROUP · OFFER & DOCUMENTS
        </p>
        <h1>Review and sign your employment documents</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
          Hello {data?.application.full_name || 'there'}. Your employment contract has been accepted.
          Read the Job Description and Handbook below and sign each one online.
        </p>

        {error && (
          <div role="alert" className="card" style={{ margin: '16px 0', padding: 14, color: '#8a2323', background: '#fff8f8' }}>
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="card" style={{ margin: '16px 0', padding: 14, background: 'var(--soft)' }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: 'var(--soft)' }}>
          <strong>{signedCount} of {data?.documents.length || 0} documents signed</strong>
          <div style={{ color: 'var(--muted)', marginTop: 5 }}>
            Employment Contract ✓ · Job Description {data?.documents.some((item) => item.document_type === 'job_description' && item.signature_status === 'signed') ? '✓' : 'awaiting signature'} · Handbook {data?.documents.some((item) => item.document_type === 'handbook' && item.signature_status === 'signed') ? '✓' : 'awaiting signature'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {data?.documents.map((document) => (
            <article key={document.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent)', letterSpacing: '.08em' }}>
                    {document.document_type === 'job_description' ? 'ROLE DOCUMENT' : 'EMPLOYMENT HANDBOOK'}
                  </div>
                  <h2 style={{ fontSize: 20, margin: '6px 0' }}>{document.title}</h2>
                  <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                    {document.signature_status === 'signed' ? 'Signed and permanently recorded.' : 'Read online. No download is required before signing.'}
                  </p>
                </div>
                <span style={{ padding: '6px 9px', borderRadius: 999, background: document.signature_status === 'signed' ? '#e7f8ef' : '#fff4d8', fontSize: 12, fontWeight: 900 }}>
                  {document.signature_status === 'signed' ? 'SIGNED' : 'SIGNATURE REQUIRED'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(document);
                    setAgree(false);
                    clearSignature();
                  }}
                  style={buttonPrimary}
                >
                  {document.signature_status === 'signed' ? 'Open signed document' : 'Read & sign online'}
                </button>
                {document.signature_status === 'signed' && (
                  <a
                    href={'/api/candidate-documents/download?token=' + encodeURIComponent(token) + '&documentId=' + encodeURIComponent(document.id)}
                    style={buttonSecondary}
                  >
                    Download signed copy
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {complete && (
          <section style={{ marginTop: 22, padding: 18, border: '1px solid var(--line)', borderRadius: 12, background: '#f7fcf9' }}>
            <strong>Employment documents complete</strong>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Your contract, Job Description and Handbook are now recorded as signed. LAUREM will not ask you to sign those three documents again during onboarding.
            </p>
            {onboardingLink ? (
              <a href={onboardingLink} style={buttonPrimary}>Continue to onboarding</a>
            ) : (
              <p style={{ marginBottom: 0, color: 'var(--muted)' }}>
                {waitingForReadiness
                  ? 'Your documents are complete. LAUREM is finishing the required recruitment checks before opening onboarding.'
                  : 'LAUREM will open your onboarding link once the remaining recruitment checks are ready.'}
              </p>
            )}
          </section>
        )}
      </section>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          style={overlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section className="card" style={{ width: 'min(960px, 100%)', maxHeight: '92vh', overflow: 'auto', padding: 28, background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent)' }}>{selected.title}</div>
                <h2 style={{ margin: '5px 0 0' }}>LAUREM Caregroup</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={buttonSecondary}>Close</button>
            </div>

            <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', fontFamily: 'Arial, sans-serif', lineHeight: 1.65 }}>
              {selected.content}
            </pre>

            {selected.signature_status !== 'signed' ? (
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 22, paddingTop: 20 }}>
                <h3>Electronic signature</h3>
                <label style={{ display: 'block', fontWeight: 800, fontSize: 13 }}>
                  Full legal name
                  <input value={name} onChange={(event) => setName(event.target.value)} style={input} />
                </label>

                <div style={{ marginTop: 14, fontWeight: 800, fontSize: 13 }}>Optional handwritten signature</div>
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={180}
                  onPointerDown={startDraw}
                  onPointerMove={draw}
                  onPointerUp={() => { drawing.current = false; }}
                  onPointerCancel={() => { drawing.current = false; }}
                  style={{ width: '100%', height: 180, border: '1px solid var(--line)', borderRadius: 10, marginTop: 7, touchAction: 'none' }}
                />
                <button type="button" onClick={clearSignature} style={{ ...buttonSecondary, marginTop: 7 }}>
                  Clear signature
                </button>

                <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 16, fontSize: 13, lineHeight: 1.5 }}>
                  <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} style={{ marginTop: 3 }} />
                  <span>{attestation}</span>
                </label>

                <button
                  type="button"
                  disabled={busy || !name.trim() || !agree}
                  onClick={() => void signSelected()}
                  style={{ ...buttonPrimary, opacity: busy || !name.trim() || !agree ? .55 : 1, marginTop: 12 }}
                >
                  {busy ? 'Signing…' : 'Sign document electronically'}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'var(--soft)', color: 'var(--muted)' }}>
                This document has already been signed and cannot be signed again.
              </div>
            )}
          </section>
        </div>
      )}
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
  cursor: 'pointer',
};

const buttonSecondary: React.CSSProperties = {
  display: 'inline-block',
  padding: '11px 14px',
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

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.52)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 50,
};
