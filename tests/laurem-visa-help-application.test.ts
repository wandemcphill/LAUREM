import { describe, expect, it } from 'vitest';
import {
  deriveVisaHelpApplicationMilestones,
  validateVisaHelpApplicationTrackingPatch,
} from '@/lib/laurem-visa-help-application';

describe('LAUREM Visa Help sponsor-side application tracking', () => {
  it('maps sponsor tracking states into the existing milestone journey', () => {
    expect(deriveVisaHelpApplicationMilestones({
      cosStatus:'issued',
      applicationStatus:'submitted',
      identityStatus:'completed',
      decisionStatus:'granted',
      rightToWorkStatus:'confirmed',
    })).toEqual({
      cos:'completed',
      application:'completed',
      identity:'completed',
      decision:'completed',
      post_decision:'completed',
    });
  });

  it('keeps decision planning separate from an actual decision outcome', () => {
    expect(deriveVisaHelpApplicationMilestones({
      cosStatus:'issued',
      applicationStatus:'submitted',
      identityStatus:'completed',
      decisionStatus:'pending',
      rightToWorkStatus:'pending',
    }).decision).toBe('in_progress');
  });

  it('requires the key evidence needed to close an application stage', () => {
    const errors=validateVisaHelpApplicationTrackingPatch({
      cos_status:'issued',
      cos_reference:'',
      identity_status:'completed',
      decision_status:'granted',
      right_to_work_status:'confirmed',
    });
    expect(errors).toContain('A CoS reference is required when the CoS status is issued.');
    expect(errors).toContain('Identity completion date is required when identity status is completed.');
    expect(errors).toContain('Decision date is required when a final decision is recorded.');
    expect(errors).toContain('Right-to-work check date is required when the status is confirmed.');
  });

  it('accepts an ordinary in-progress sponsor update', () => {
    expect(validateVisaHelpApplicationTrackingPatch({
      cos_status:'requested',
      cos_requested_at:'2026-10-01T10:00:00Z',
      application_status:'draft',
    })).toEqual([]);
  });
});
