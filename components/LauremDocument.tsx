'use client';

import { useMemo, type ReactNode } from 'react';
import { renderLauremDocumentBody, renderLauremPrintableHtml } from '@/lib/laurem-document-renderer';

type DocumentType = 'job_description' | 'handbook';

export default function LauremDocument({
  documentType,
  title,
  content,
  signature,
  signaturePanel,
}: {
  documentType: DocumentType;
  title: string;
  content: string;
  signature?: { name?: string | null; signedAt?: string | null } | null;
  signaturePanel?: ReactNode;
}) {
  const html = useMemo(
    () =>
      renderLauremDocumentBody({
        documentType,
        title,
        content,
        assetBaseUrl: '',
        signature,
      }),
    [content, documentType, signature, title],
  );

  function printDocument() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900');
    if (!printWindow) return;
    printWindow.document.write(
      renderLauremPrintableHtml({
        documentType,
        title,
        content,
        assetBaseUrl: window.location.origin,
        signature,
      }),
    );
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  return (
    <div className="laurem-document-view">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {signaturePanel ? <div className="laurem-document-signing">{signaturePanel}</div> : null}
      <div className="laurem-document-actions">
        <button type="button" className="laurem-doc-print" onClick={printDocument}>
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
