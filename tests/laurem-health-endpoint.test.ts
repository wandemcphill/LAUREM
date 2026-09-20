import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM public health contract', () => {
  it('uses a lightweight server-side database probe', () => {
    const route = readFileSync('app/api/health/route.ts', 'utf8');
    expect(route).toContain("db().from('recruitment_applications')");
    expect(route).toContain("select('id', { head: true, count: 'exact' })");
    expect(route).toContain("status: 503");
  });

  it('never exposes dependency error details and disables caching', () => {
    const route = readFileSync('app/api/health/route.ts', 'utf8');
    expect(route).toContain("catch {");
    expect(route).toContain("response.headers.set('cache-control', 'no-store, max-age=0')");
    expect(route).toContain("response.headers.set('x-laurem-health', 'degraded')");
    expect(route).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(route).not.toContain('ADMIN_PASSWORD');
  });

  it('reports release identity without changing the public health payload into a secret-bearing endpoint', () => {
    const route = readFileSync('app/api/health/route.ts', 'utf8');
    expect(route).toContain('RENDER_GIT_COMMIT');
    expect(route).toContain("commit: releaseCommit()");
    expect(route).toContain("service: 'laurem-recruitment-platform'");
  });
});
