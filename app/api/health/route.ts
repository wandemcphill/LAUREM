import { NextResponse } from 'next/server';

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
  const response = NextResponse.json({
    ok: true,
    service: 'laurem-recruitment-platform',
    timestamp: new Date().toISOString(),
    commit: releaseCommit(),
  }, { status: 200 });
  response.headers.set('cache-control', 'no-store, max-age=0');
  response.headers.set('x-laurem-health', 'ok');
  return response;
}
