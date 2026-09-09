import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { checkReleaseHealth } from '@/lib/laurem-release-health';

export async function GET(request: NextRequest) {
  const session = readAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const health = await checkReleaseHealth(db());
    return NextResponse.json(health, {
      status: health.ok ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'admin.system.health_failed',
      actor: session.email,
      reason: error instanceof Error ? error.message : 'unknown',
    }));
    return NextResponse.json({
      ok: false,
      timestamp: new Date().toISOString(),
      dependencies: {
        environment: { ok: false, missing: [] },
        database: { ok: false, latencyMs: 0, error: 'Health check failed.' },
        schema: { ok: false, missing: [] },
        storage: { ok: false, bucketPresent: false, error: 'Health check failed.' },
      },
    }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
