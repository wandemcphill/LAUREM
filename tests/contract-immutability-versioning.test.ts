import { describe, expect, test } from 'vitest';
import { validateContractCompleteness } from '../lib/laurem-contract-validator';

describe('Contract Immutability and Versioning Integrity', () => {
  test('incomplete draft is allowed during creation but cannot be issued', () => {
    const incompleteInput = {
      employeeName: 'Draft Candidate',
      jobTitle: 'Support Worker',
    };

    const validation = validateContractCompleteness('Support Worker', incompleteInput, 'uk');
    expect(validation.valid).toBe(false);
    expect(validation.missingFields.length).toBeGreaterThan(0);
  });

  test('valid contract particulars enable issue state', () => {
    const completeInput = {
      employeeName: 'Complete Candidate',
      employeeAddress: '557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE',
      jobTitle: 'Support Worker',
      employmentType: 'Permanent',
      startDate: '2026-12-01',
      continuousEmploymentDate: '2026-12-01',
      minimumWeeklyHours: 37.5,
      hourlyRate: 14.50,
      payFrequency: 'Monthly in arrears',
      payMethod: 'BACS',
      workLocations: ['Barrhead Care Facility'],
      holidayEntitlement: '28 days per annum',
      sickPay: 'SSP',
      probation: '6 months',
      noticePeriodEmployee: '4 weeks',
      noticePeriodEmployer: '4 weeks',
      mandatoryTraining: 'Care Certificate',
    };

    const validation = validateContractCompleteness('Support Worker', completeInput, 'uk');
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
