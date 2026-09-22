import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token';

function filename(title: string) {
  return title
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() + '.txt';
}

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const token = params.get('token')?.trim() || '';
    const documentId = params.get('documentId')?.trim() || '';
    if (!token || !documentId) return NextResponse.json({ error: 'Document token and document id are required.' }, { status: 400 });

    const client = db();
    const { data: pack, error: packError } = await client
      .from('laurem_candidate_document_packs')
      .select('id,status,expires_at')
      .eq('token_hash', hashToken(token))
      .maybeSingle();
    if (packError) throw packError;
    if (!pack) return NextResponse.json({ error: 'Document pack not found.' }, { status: 404 });
    if (pack.status === 'pending' && new Date(pack.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This document pack has expired.' }, { status: 410 });
    }
    if (pack.status === 'revoked' || pack.status === 'expired') {
      return NextResponse.json({ error: 'This document pack is no longer available.' }, { status: 409 });
    }

    const { data: document, error: documentError } = await client
      .from('laurem_candidate_documents')
      .select('id,title,content_text,signature_status,signature_name,signed_at')
      .eq('id', documentId)
      .eq('pack_id', pack.id)
      .maybeSingle();
    if (documentError) throw documentError;
    if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    if (document.signature_status !== 'signed') {
      return NextResponse.json({ error: 'Sign this document online before downloading the signed copy.' }, { status: 409 });
    }

    await client.from('laurem_candidate_document_events').insert({
      pack_id: pack.id,
      document_id: document.id,
      application_id: (await client.from('laurem_candidate_document_packs').select('application_id').eq('id', pack.id).single()).data?.application_id,
      event_type: 'viewed',
      actor_type: 'candidate',
      actor: 'candidate',
      metadata: { action: 'download_signed_copy' },
    });

    const body = document.content_text + '\n\nSigned by: ' + (document.signature_name || '') + '\nSigned at: ' + (document.signed_at || '') + '\nSignature status: SIGNED\n';
    const response = new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + filename(document.title) + '"',
        'Cache-Control': 'private, no-store',
      },
    });
    return response;
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'candidate_document_download_failed',
      reason: error instanceof Error ? error.message : 'unknown',
    }));
    return NextResponse.json({ error: 'Unable to download the signed document.' }, { status: 500 });
  }
}
