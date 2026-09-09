'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/staff/documents', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { router.replace('/staff/login'); return; }
      const data = await response.json().catch(() => ({}));
      if (response.ok) setDocuments(data.documents || []);
      else setError(data.error || 'Unable to load documents.');
    });
  }, [router]);

  return <main style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: 'system-ui', padding: 24, color: '#102a43' }}>
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <button onClick={() => router.push('/staff')} style={{ border: 0, background: 'transparent', padding: 0, color: '#0f766e', fontWeight: 800 }}>← Staff Portal</button>
      <h1>My Documents</h1>
      <p style={{ color: '#627d98' }}>Documents associated with your LAUREM employment record.</p>
      {error && <p style={{ color: '#b42318' }}>{error}</p>}
      {!error && documents.length === 0 && <div style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, padding: 22 }}>No employment documents are currently available.</div>}
      <div style={{ display: 'grid', gap: 12 }}>{documents.map((document) => <article key={document.id} style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, padding: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{document.document_type}</strong><span style={{ fontSize: 12, fontWeight: 800 }}>{String(document.status).toUpperCase()}</span></div><p style={{ marginBottom: 5 }}>{document.original_filename}</p><p style={{ color: '#627d98', margin: 0 }}>{document.uploaded_at ? new Date(document.uploaded_at).toLocaleString('en-GB') : '—'}</p>{document.review_note && <p style={{ color: '#486581' }}>{document.review_note}</p>}</article>)}</div>
    </div>
  </main>;
}
