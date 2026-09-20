'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function StaffDocumentPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [document, setDocument] = useState<any>(null);
  const [attestation, setAttestation] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/staff/documents/${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async (r) => {
      if (r.status === 401) { router.replace('/staff/login'); return; }
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Unable to load document.');
      setDocument(body.document); setAttestation(body.attestation || ''); setName(body.document?.signature_name || ''); setSigned(body.document?.signature_status === 'signed');
    }).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load document.'));
  }, [id, router]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) { const canvas=canvasRef.current; if(!canvas)return; drawing.current=true; canvas.setPointerCapture(event.pointerId); const p=point(event); if(!p)return; const ctx=canvas.getContext('2d'); if(!ctx)return; ctx.beginPath(); ctx.moveTo(p.x,p.y); }
  function draw(event: React.PointerEvent<HTMLCanvasElement>) { if(!drawing.current)return; const canvas=canvasRef.current; if(!canvas)return; const p=point(event); if(!p)return; const ctx=canvas.getContext('2d'); if(!ctx)return; ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#102a43'; ctx.lineTo(p.x,p.y); ctx.stroke(); }
  function endDraw(){drawing.current=false;}
  function clearSignature(){const canvas=canvasRef.current; if(!canvas)return; const ctx=canvas.getContext('2d'); if(!ctx)return; ctx.clearRect(0,0,canvas.width,canvas.height);}

  async function sign(){
    if(!id || !name.trim() || !agree) return;
    setBusy(true); setError('');
    const canvas=canvasRef.current;
    const signatureData=canvas ? canvas.toDataURL('image/png') : null;
    try {
      const response=await fetch(`/api/staff/documents/${encodeURIComponent(id)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signedName:name.trim(),signatureData,attestation})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to sign document.');
      setSigned(true); setDocument((current:any)=>current?{...current,...(body.document||{}),signature_status:'signed',signature_name:name.trim()}:current);
    } catch(e){setError(e instanceof Error?e.message:'Unable to sign document.');} finally{setBusy(false);}
  }

  if(error && !document) return <main style={{padding:24,fontFamily:'system-ui',background:'#f4f7fb',minHeight:'100vh'}}><div style={{maxWidth:980,margin:'0 auto',background:'#fff',padding:24,borderRadius:16}}><button onClick={()=>router.push('/staff/documents')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:800}}>← My Documents</button><p style={{color:'#b42318',marginTop:20}}>{error}</p></div></main>;
  if(!document) return <main style={{padding:24,fontFamily:'system-ui',background:'#f4f7fb',minHeight:'100vh'}}><div style={{maxWidth:980,margin:'0 auto',background:'#fff',padding:24,borderRadius:16}}>Loading document…</div></main>;

  const isPdf=document.mime_type==='application/pdf';
  const isImage=typeof document.mime_type==='string' && document.mime_type.startsWith('image/');
  return <main style={{padding:'24px 18px 70px',fontFamily:'system-ui',background:'#f4f7fb',minHeight:'100vh',color:'#102a43'}}>
    <div style={{maxWidth:1050,margin:'0 auto'}}>
      <button onClick={()=>router.push('/staff/documents')} style={{border:0,background:'transparent',padding:0,color:'#0f766e',fontWeight:800}}>← My Documents</button>
      <header style={{background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:22,marginTop:16}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.2,color:'#0f766e'}}>LAUREM CARE · EMPLOYMENT DOCUMENT</div>
        <h1 style={{margin:'7px 0 5px'}}>{document.title}</h1>
        <p style={{color:'#627d98',margin:'0 0 5px'}}>{document.category.replaceAll('_',' ')} · Issued {new Date(document.issued_at).toLocaleString('en-GB')}</p>
        <p style={{color:'#627d98',margin:0}}>Issued by <strong>{document.issuer_name}</strong>, {document.issuer_title}, for and on behalf of {document.employer_name}.</p>
      </header>
      {error && <div role='alert' style={{background:'#fff4f4',border:'1px solid #f3cccc',padding:14,borderRadius:12,color:'#8a2323',marginTop:14}}>{error}</div>}
      <section style={{background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:22,marginTop:14}}>
        {document.description && <p style={{color:'#627d98',lineHeight:1.6}}>{document.description}</p>}
        {document.content_text && <pre style={{whiteSpace:'pre-wrap',fontFamily:'Arial,sans-serif',lineHeight:1.65,borderTop:'1px solid #edf2f7',paddingTop:20}}>{document.content_text}</pre>}
        {document.previewUrl && isPdf && <iframe title={document.title} src={document.previewUrl} style={{width:'100%',height:900,border:0,borderRadius:10}} />}
        {document.previewUrl && isImage && <img src={document.previewUrl} alt={document.title} style={{maxWidth:'100%',display:'block',margin:'0 auto'}} />}
        {document.previewUrl && !document.content_text && !isPdf && !isImage && <div style={{padding:18,background:'#f7fafc',borderRadius:12}}>Preview is available from the secured file URL. <a href={document.previewUrl} target='_blank' rel='noreferrer'>Open document</a></div>}
      </section>
      <section style={{background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:22,marginTop:14}}>
        {signed ? <div><div style={{fontSize:12,fontWeight:900,color:'#0f766e',letterSpacing:1}}>SIGNED ONLINE</div><h2 style={{margin:'6px 0'}}>Document signed</h2><p style={{color:'#627d98'}}>Signed by <strong>{document.signature_name || name}</strong>. The LAUREM platform has recorded the signing time, document hash, device information and audit event.</p><a href={`/api/staff/documents/${encodeURIComponent(id)}/download`} download style={{display:'inline-block',marginTop:10,background:'#0f766e',color:'#fff',padding:'11px 15px',borderRadius:9,textDecoration:'none',fontWeight:900}}>Download signed copy</a></div>
        : !document.requires_signature ? <div><h2 style={{marginTop:0}}>Acknowledgement</h2><p style={{color:'#627d98',lineHeight:1.6}}>This document is informational and does not require an electronic signature. Please keep it available in your Staff Portal.</p></div>
        : <div><div style={{fontSize:12,fontWeight:900,color:'#0f766e',letterSpacing:1}}>ELECTRONIC SIGNATURE REQUIRED</div><h2 style={{margin:'6px 0'}}>Sign online</h2><p style={{color:'#627d98',lineHeight:1.6}}>You do not need to download this document. Review it above, enter your full legal name and confirm the electronic-signature statement below.</p>
          <label style={{display:'block',fontWeight:800,fontSize:13}}>Full legal name<input value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:7,padding:12,border:'1px solid #cbd5e1',borderRadius:10,font:'inherit'}} /></label>
          <div style={{marginTop:14,fontWeight:800,fontSize:13}}>Optional handwritten signature</div>
          <canvas ref={canvasRef} width={900} height={180} onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerCancel={endDraw} style={{width:'100%',height:180,border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',touchAction:'none',marginTop:7}} />
          <button onClick={clearSignature} type='button' style={{marginTop:7,border:'1px solid #dbe5ea',background:'#fff',borderRadius:8,padding:'8px 11px',fontWeight:800}}>Clear signature</button>
          <label style={{display:'flex',gap:10,alignItems:'flex-start',marginTop:16,fontSize:13,lineHeight:1.5}}><input type='checkbox' checked={agree} onChange={e=>setAgree(e.target.checked)} style={{marginTop:3}} /> <span>{attestation}</span></label>
          <button disabled={busy || !name.trim() || !agree} onClick={()=>void sign()} style={{marginTop:16,background:'#102a43',color:'#fff',border:0,padding:'12px 18px',borderRadius:9,fontWeight:900,cursor:busy?'wait':'pointer'}}>{busy?'Signing…':'Sign document electronically'}</button>
        </div>}
      </section>
    </div>
  </main>;
}