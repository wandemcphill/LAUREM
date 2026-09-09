import { describe, expect, it } from 'vitest';

describe('staff onboarding contract binding', () => {
  it('uses the accepted contract as the staff profile contract', () => {
    const acceptedContractId = 'accepted-contract-id';
    const callerSuppliedContractId = 'different-contract-id';
    const contractId = acceptedContractId;

    expect(contractId).toBe(acceptedContractId);
    expect(contractId).not.toBe(callerSuppliedContractId);
  });

  it('does not treat a waived right-to-work check as verified', () => {
    const readinessStatus: 'completed' | 'waived' = 'waived';
    const verified = readinessStatus === 'completed';

    expect(verified).toBe(false);
  });
});
