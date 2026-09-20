import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM production health contracts', () => {
  it('keeps the public health endpoint lightweight and dependency-free', () => {
    const route = readFileSync('app/api/health/route.ts', 'utf8');
    expect(route).toContain("service: 'laurem-recruitment-platform'");
    expect(route).toContain("response.headers.set('cache-control', 'no-store, max-age=0')");
    expect(route).toContain("response.headers.set('x-laurem-health', 'ok')");
    expect(route).not.toContain("from '@/lib/db'");
    expect(route).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(route).not.toContain('ADMIN_PASSWORD');
  });

  it('keeps database readiness on a separate non-secret-bearing endpoint', () => {
    const route = readFileSync('app/api/health/ready/route.ts', 'utf8');
    expect(route).toContain("db().from('recruitment_applications')");
    expect(route).toContain("select('id', { head: true, count: 'exact' })");
    expect(route).toContain("status: 503");
    expect(route).toContain("response.headers.set('cache-control', 'no-store, max-age=0')");
    expect(route).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(route).not.toContain('ADMIN_PASSWORD');
  });

  it('reports release identity without exposing runtime secrets', () => {
    const route = readFileSync('app/api/health/route.ts', 'utf8');
    const ready = readFileSync('app/api/health/ready/route.ts', 'utf8');
    expect(route).toContain('RENDER_GIT_COMMIT');
    expect(route).toContain("commit: releaseCommit()");
    expect(ready).toContain("commit: releaseCommit()");
  });
});
