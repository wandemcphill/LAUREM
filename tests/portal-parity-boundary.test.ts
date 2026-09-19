import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('LAUREM portal parity boundary', () => {
  it('keeps the common lifecycle guardrails in the LAUREM implementation', () => {
    const lifecycle = readFileSync('lib/laurem-lifecycle.ts', 'utf8');
    const roles = readFileSync('lib/laurem-role-policy.ts', 'utf8');
    const readiness = readFileSync('lib/laurem-onboarding-readiness.ts', 'utf8');
    expect(lifecycle).toContain('CONTRACT_REQUIRED');
    expect(lifecycle).toContain('assertLauremOnboardingReady');
    expect(roles).toContain('LAUREM_CANONICAL_ROLES');
    expect(readiness).toContain('BASE_ITEMS');
  });

  it('keeps LAUREM free of extracted BIMED implementation directories', () => {
    expect(existsSync('lib/companies/bimed')).toBe(false);
    expect(existsSync('docs/bimed-build')).toBe(false);
  });

  it('retains LAUREM staff and workforce workflow surfaces', () => {
    const requiredFiles = [
      'app/api/staff/messages/route.ts',
      'app/api/staff/shifts/route.ts',
      'app/api/staff/timesheets/route.ts',
      'app/api/staff/leave/route.ts',
      'app/api/staff/payroll/route.ts',
      'app/api/admin/workforce/leave/route.ts',
      'app/api/admin/workforce/timesheets/route.ts',
      'app/api/admin/workforce/payroll/route.ts',
      'app/api/admin/onboarding/readiness/route.ts',
      'app/api/contracts/accept/route.ts',
    ];
    for (const path of requiredFiles) expect(existsSync(path), path).toBe(true);
  });
});
