import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

describe('contract issuance boundary', () => {
  test('locks issued, viewed and accepted contracts from regeneration', () => {
    const source = readFileSync('app/api/admin/contracts/route.ts','utf8');
    expect(source).toContain("['issued', 'viewed', 'accepted'].includes(existingContract.status)");
    expect(source).toContain('CONTRACT_VERSION_LOCKED');
  });

  test('uses the atomic contract plus candidate document pack boundary', () => {
    const source = readFileSync('app/api/admin/contracts/route.ts','utf8');
    expect(source).toContain("client.rpc('laurem_issue_recruitment_contract_and_document_pack'");
    expect(source).not.toContain("client.rpc('laurem_issue_candidate_document_pack'");
    const migration = readFileSync('supabase/migrations/20260925170000_contract_issue_document_pack_atomic.sql','utf8');
    expect(migration).toContain('laurem_issue_recruitment_contract_and_document_pack');
    expect(migration).toContain('laurem_issue_recruitment_contract_with_token');
    expect(migration).toContain('laurem_issue_candidate_document_pack');
  });
});
