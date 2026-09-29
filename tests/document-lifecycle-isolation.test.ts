import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM document lifecycle isolation', () => {
  it('uses an explicit canonical readiness allowlist instead of arbitrary required document rows', () => {
    const migration = readFileSync(
      'supabase/migrations/20260929120000_staff_lifecycle_document_gate_hardening.sql',
      'utf8',
    );

    expect(migration).toContain('laurem_is_staff_lifecycle_readiness_key');
    expect(migration).toContain('identity_verified');
    expect(migration).toContain('qualification_evidence_verified');
    expect(migration).toContain('references_verified');
    expect(migration).toContain('right_to_work_verified');
    expect(migration).toContain('international_work_permission_verified');
    expect(migration).toContain('professional_registration_verified');
    expect(migration).toContain('not required');
    expect(migration).toContain('required_key_check');
    expect(migration).not.toContain("when 'dbs' then");
    expect(migration).not.toContain("when 'svg' then");
  });

  it('does not let unknown evidence types claim readiness', () => {
    const migration = readFileSync(
      'supabase/migrations/20260929120000_staff_lifecycle_document_gate_hardening.sql',
      'utf8',
    );

    expect(migration).toContain('laurem_staff_readiness_key_for_evidence_type');
    expect(migration).toContain('canonical_key := public.laurem_staff_readiness_key_for_evidence_type');
    expect(migration).toContain('canonical_key is not null');
    expect(migration).toContain('lower(btrim(p_readiness_item_key)) = canonical_key');
  });

  it('keeps contract issuance successful when the downstream document pack fails', () => {
    const route = readFileSync('app/api/admin/contracts/route.ts', 'utf8');
    expect(route).toContain('contractAlreadyIssued: true');
    expect(route).toContain('let documentPackLink: string | null = null');
    expect(route).toContain('documentPackIssued: Boolean(documentPackLink)');
    expect(route).not.toContain("return operationalError(requestId, 'Unable to issue the candidate offer document package.'");
  });

  it('keeps contract acceptance successful when downstream document delivery fails', () => {
    const route = readFileSync('app/api/contracts/accept/route.ts', 'utf8');
    expect(route).toContain('contractAlreadyAccepted: true');
    expect(route).toContain('documentPackIssued');
    expect(route).toContain('lifecycle_transition_failed');
    expect(route).not.toContain('if (packResult.error) throw packResult.error;');
  });

  it('makes noncanonical readiness rows informational in the application readiness layer', () => {
    const source = readFileSync('lib/laurem-onboarding-readiness.ts', 'utf8');
    expect(source).toContain('LAUREM_STAFF_LIFECYCLE_READINESS_KEYS');
    expect(source).toContain('required: false');
    expect(source).toContain('does not block the staff lifecycle');
  });
});
