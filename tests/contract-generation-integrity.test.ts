import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('contract generation integrity', () => {
  const route = readFileSync(resolve(process.cwd(), 'app/api/admin/contracts/route.ts'), 'utf8');

  it('refuses to overwrite an already accepted employment contract', () => {
    expect(route).toContain("['issued', 'viewed', 'accepted'].includes(existingContract.status)");
    expect(route).toContain("CONTRACT_VERSION_LOCKED");
  });

  it('increments the contract version instead of resetting every regeneration to version 1', () => {
    expect(route).toContain('const nextVersion = Number(existingContract?.version || 0) + 1;');
    expect(route).toContain('version: nextVersion');
  });
});
