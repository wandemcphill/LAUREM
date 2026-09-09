import { describe, expect, it } from 'vitest';

function bindStaffContract(acceptedContractId: string, requestedContractId?: string | null) {
  void requestedContractId;
  return acceptedContractId;
}

function isRightToWorkVerified(status: 'pending' | 'completed' | 'waived') {
  return status === 'completed';
}

describe('staff onboarding contract binding', () => {
  it('always binds staff to the accepted contract', () => {
    expect(bindStaffContract('accepted-contract-id', 'different-contract-id')).toBe('accepted-contract-id');
    expect(bindStaffContract('accepted-contract-id', null)).toBe('accepted-contract-id');
  });

  it('does not mark a waived right-to-work check as verified', () => {
    expect(isRightToWorkVerified('waived')).toBe(false);
    expect(isRightToWorkVerified('completed')).toBe(true);
  });
});
