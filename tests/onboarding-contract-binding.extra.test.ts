import { describe, expect, it } from 'vitest';

function bindStaffContract(acceptedContractId: string, requestedContractId?: string | null) {
  void requestedContractId;
  return acceptedContractId;
}

function isRightToWorkVerified(status: 'pending' | 'completed' | 'waived') {
  return status === 'completed';
}

describe('onboarding binding rules', () => {
  it('ignores a caller-supplied alternate contract', () => {
    expect(bindStaffContract('accepted', 'alternate')).toBe('accepted');
  });

  it('only completed right-to-work evidence sets the staff flag', () => {
    expect(isRightToWorkVerified('waived')).toBe(false);
    expect(isRightToWorkVerified('completed')).toBe(true);
  });
});
