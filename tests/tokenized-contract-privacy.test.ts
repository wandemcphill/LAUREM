import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('tokenized contract privacy', () => {
  const route = readFileSync('app/api/contracts/accept/route.ts', 'utf8');

  it('never selects the full contract row for a bearer-token request', () => {
    expect(route).not.toContain(".select('*')");
    expect(route).toContain('PUBLIC_CONTRACT_FIELDS');
    expect(route).toContain(".select(PUBLIC_CONTRACT_FIELDS)");
  });

  it('returns an explicit candidate projection rather than internal contract metadata', () => {
    expect(route).toContain('function toPublicContract');
    expect(route).toContain("contract_content: String(contract.contract_content || '')");
    expect(route).not.toContain('application_id');
    expect(route).not.toContain('accepted_ip');
    expect(route).not.toContain('acceptance_user_agent');
    expect(route).not.toContain('acceptance_signature_data');
    expect(route).not.toContain('acceptance_attestation');
    expect(route).not.toContain('created_by');
    expect(route).not.toContain('decline_reason');
  });

  it('marks tokenized contract responses as private and non-cacheable', () => {
    expect(route).toContain("Cache-Control', 'private, no-store, max-age=0'");
    expect(route).toContain("'Pragma', 'no-cache'");
    expect(route).toContain('noStore(NextResponse.json');
  });

  it('does not place bearer tokens into logs', () => {
    expect(route).not.toContain("console.error(JSON.stringify({ token");
    expect(route).not.toContain("console.log(token");
    expect(route).not.toContain("console.error(token");
  });
});
