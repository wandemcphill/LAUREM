import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function releaseCommit() {
  return process.env.RENDER_GIT_COMMIT
    || process.env.RENDER_GIT_COMMIT_SHA
    || process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || null;
}

export async function GET() {
  const started = Date.now();
  try {
    const client = db();
    const { error } = await client.from('recruitment_applications').select('id', { head: true, count: 'exact' });
    if (error) throw error;
    const { data: schemaContract, error: schemaError } = await client.rpc('laurem_verify_release_schema');
    if (schemaError || !schemaContract || typeof schemaContract !== 'object' || (schemaContract as Record<string, unknown>).ok !== true) throw schemaError || new Error('SCHEMA_NOT_READY');
    const response = NextResponse.json({
      ok: true,
      service: 'laurem-recruitment-platform',
      timestamp: new Date().toISOString(),
      commit: releaseCommit(),
      database: { ok: true, latencyMs: Date.now() - started },
    }, { status: 200 });
    response.headers.set('cache-control', 'no-store, max-age=0');
    response.headers.set('x-laurem-readiness', 'ready');
    return response;
  } catch {
    const response = NextResponse.json({
      ok: false,
      service: 'laurem-recruitment-platform',
      timestamp: new Date().toISOString(),
      commit: releaseCommit(),
      database: { ok: false, latencyMs: Date.now() - started },
    }, { status: 503 });
    response.headers.set('cache-control', 'no-store, max-age=0');
    response.headers.set('x-laurem-readiness', 'not-ready');
    return response;
  }
}
