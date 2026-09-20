import { describe, expect, it } from 'vitest';
import { EXPECTED_PORTAL_TABLES } from '@/lib/laurem-release-health';

describe('LAUREM release health schema coverage', () => {
  it('checks every LAUREM-owned physical table used by the portal', () => {
    expect(EXPECTED_PORTAL_TABLES).toContain('legacy_contract_signatures');
    expect(EXPECTED_PORTAL_TABLES).toContain('workforce_audit_events');
    expect(EXPECTED_PORTAL_TABLES).toHaveLength(38);
  });
});
