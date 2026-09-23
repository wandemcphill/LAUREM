'use client';

import { useEffect, useRef } from 'react';
import {
  renderLauremContractDocument,
  type LauremContractDocumentInput,
} from '@/lib/laurem-contract-document-renderer';

export default function LauremContractDocument(input: LauremContractDocumentInput) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const style = document.createElement('style');
    style.textContent = contractScreenCss;
    node.appendChild(style);
    return () => style.remove();
  }, []);

  function printDocument() {
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) return;
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>LAUREM Employment Contract</title><style>' + contractScreenCss + '<style>');
    popup.document.write('</style></head><body>' + renderLauremContractDocument(input) + '</body></html>');
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="laurem-contract-view" ref={ref}>
      <div className="laurem-contract-actions">
        <button type="button" onClick={printDocument}>Print / Save as PDF</button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: renderLauremContractDocument(input) }} />
    </div>
  );
}

const contractScreenCss = [
  'body{margin:0;background:#edf2f4;color:#20353d;font-family:Arial,Helvetica,sans-serif}',
  '.laurem-contract-view{background:#edf2f4;border:1px solid #d8e1e5;border-radius:16px;padding:14px}',
  '.laurem-contract-actions{display:flex;justify-content:flex-end;padding:0 0 10px}',
  '.laurem-contract-actions button{border:1px solid #d8e1e5;border-radius:10px;background:#fff;color:#16394a;padding:10px 14px;font-weight:800;cursor:pointer}',
  '.laurem-contract-document{width:min(190mm,100%);margin:0 auto;background:#fff;box-shadow:0 14px 36px rgba(22,57,74,.10);overflow:hidden}',
  '.laurem-contract-letterhead{display:flex;justify-content:space-between;gap:10mm;padding:11mm 13mm 8mm;border-bottom:1px solid #d8e1e5;background:#fff}',
  '.laurem-contract-brandmark{display:flex;gap:4mm;align-items:center}',
  '.laurem-contract-mark{display:flex;width:14mm;height:14mm;align-items:center;justify-content:center;border-radius:50%;background:#16394a;color:#fff;font-size:8pt;font-weight:900;letter-spacing:.04em}',
  '.laurem-contract-brand{font-size:17pt;font-weight:900;letter-spacing:.10em;color:#16394a}',
  '.laurem-contract-tagline{margin-top:1mm;color:#1f705e;font-size:8pt;font-weight:800;letter-spacing:.10em;text-transform:uppercase}',
  '.laurem-contract-contact{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:1mm;max-width:92mm;color:#68777e;font-size:7.4pt;line-height:1.4;text-align:right}',
  '.laurem-contract-contact strong{color:#16394a;font-size:8pt}',
  '.laurem-contract-accent{height:2.2mm;background:linear-gradient(90deg,#16394a,#1f705e,#8dcdb9)}',
  '.laurem-contract-document-bar{display:flex;justify-content:space-between;gap:8mm;align-items:flex-end;padding:9mm 13mm 7mm}',
  '.laurem-contract-document-bar span{display:block;color:#1f705e;font-size:7pt;font-weight:900;letter-spacing:.15em}',
  '.laurem-contract-document-bar strong{display:block;margin-top:1.5mm;color:#16394a;font-size:20pt;line-height:1.15}',
  '.laurem-contract-status{padding:2.2mm 3.2mm;border:1px solid #b9d9ce;border-radius:999px;color:#1f705e;font-size:7pt;font-weight:900;letter-spacing:.10em;white-space:nowrap}',
  '.laurem-contract-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:0 13mm;border:1px solid #d8e1e5;background:#d8e1e5;gap:1px}',
  '.laurem-contract-meta-item{padding:4mm 4.5mm;background:#fff}',
  '.laurem-contract-meta-item span,.laurem-contract-intro span,.laurem-contract-signature-grid span{display:block;color:#68777e;font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:.08em}',
  '.laurem-contract-meta-item strong{display:block;margin-top:1mm;font-size:8.7pt}',
  '.laurem-contract-intro{display:grid;grid-template-columns:1.2fr 1.2fr .7fr;gap:5mm;margin:7mm 13mm 0;padding:5mm;background:#f4f8f9;border-left:3px solid #1f705e}',
  '.laurem-contract-intro strong{display:block;margin-top:1mm;color:#16394a;font-size:9pt}',
  '.laurem-contract-body{padding:8mm 13mm 2mm}',
  '.laurem-contract-section{margin:0 0 7mm;break-inside:avoid}',
  '.laurem-contract-section-heading{display:grid;grid-template-columns:9mm 1fr;gap:3.5mm;align-items:start;border-bottom:1px solid #d8e1e5;padding-bottom:2.5mm;margin-bottom:3.5mm}',
  '.laurem-contract-number{display:flex;width:9mm;height:9mm;align-items:center;justify-content:center;border-radius:50%;background:#e4f2ee;color:#1f705e;font-size:8pt;font-weight:900}',
  '.laurem-contract-section h2{margin:0;color:#16394a;font-size:13pt;line-height:1.25}',
  '.laurem-contract-section p{margin:0 0 3.4mm;color:#2f4249}',
  '.laurem-contract-special{margin:8mm 0;padding:5mm;border:1px solid #d8e1e5;border-radius:3mm;background:#fafcfc;break-inside:avoid}',
  '.laurem-contract-special-kicker{color:#1f705e;font-size:7pt;font-weight:900;letter-spacing:.14em}',
  '.laurem-contract-special-body{margin-top:3mm}',
  '.laurem-contract-signature-record{margin:6mm 13mm 9mm;padding:6mm;border:1px solid #b9d9ce;border-radius:3mm;background:#f3faf7;break-inside:avoid}',
  '.laurem-contract-signature-kicker{color:#1f705e;font-size:7pt;font-weight:900;letter-spacing:.14em}',
  '.laurem-contract-signature-record h2{margin:1.5mm 0 4mm;color:#16394a;font-size:15pt}',
  '.laurem-contract-signature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}',
  '.laurem-contract-signature-grid div{padding:3.5mm;background:#fff;border:1px solid #d8e1e5;border-radius:2mm}',
  '.laurem-contract-signature-grid strong{display:block;margin-top:1mm;font-size:8.4pt}',
  '.laurem-contract-signature-record p{margin:4mm 0 0;color:#68777e;font-size:8pt}',
  '.laurem-contract-footer{display:grid;grid-template-columns:1.1fr 1fr;gap:8mm;padding:5mm 13mm;color:#64737a;font-size:6.8pt;line-height:1.45;border-top:1px solid #d8e1e5;background:#fbfcfc}',
  '.laurem-contract-footer div{display:flex;flex-direction:column;gap:1mm}',
  '.laurem-contract-footer strong{color:#16394a;font-size:7.2pt}',
  '@media (max-width:760px){.laurem-contract-document{width:100%}.laurem-contract-letterhead,.laurem-contract-document-bar{display:block}.laurem-contract-contact{align-items:flex-start;text-align:left;margin-top:5mm}.laurem-contract-status{display:inline-block;margin-top:4mm}.laurem-contract-meta,.laurem-contract-intro,.laurem-contract-footer{grid-template-columns:1fr}.laurem-contract-body{padding-left:8mm;padding-right:8mm}}',
  '@media print{body{background:#fff}.laurem-contract-document{box-shadow:none}.laurem-contract-footer,.laurem-contract-letterhead{break-inside:avoid}}',
].join('');
