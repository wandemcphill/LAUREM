import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('recruitment invitation role integrity', () => {
  const route = readFileSync(resolve(process.cwd(), 'app/api/admin/invites/route.ts'), 'utf8');

  it('normalizes invitation roles through the canonical LAUREM role policy', () => {
    expect(route).toContain("import { normalizeLauremRole } from '@/lib/laurem-role-policy';");
    expect(route).toContain('const role = normalizeLauremRole(requestedRole);');
    expect(route).toContain("if (!role) return NextResponse.json({ error: 'Invalid LAUREM recruitment role.' }, { status: 400 });");
  });

  it('persists the normalized role rather than arbitrary recruiter input', () => {
    expect(route).toContain('role,\n      token_hash: hashToken(token)');
  });
});
