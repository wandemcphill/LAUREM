import { describe, expect, test } from 'vitest';
import { validateContractCompleteness } from '../lib/laurem-contract-validator';

describe('contract completeness and versioning guard', () => {
  test('incomplete draft is never issuable', () => {
    const result = validateContractCompleteness('Support Worker', { employeeName:'Draft Candidate', jobTitle:'Support Worker' }, 'uk');
    expect(result.valid).toBe(false);
  });

  test('complete draft passes the central validator', () => {
    const result = validateContractCompleteness('Support Worker', {
      employeeName:'Complete Candidate',
      employeeAddress:'557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE',
      jobTitle:'Support Worker',
      employmentType:'Permanent',
      startDate:'2026-12-01',
      continuousEmploymentDate:'2026-12-01',
      minimumWeeklyHours:37.5,
      normalWorkingDays:'Monday to Friday',
      shiftPattern:'09:00 to 17:00',
      workLocations:['Barrhead Care Facility'],
      hourlyRate:14.5,
      payFrequency:'Monthly in arrears',
      payMethod:'BACS',
      holidayEntitlement:'28 days',
      holidayPayCalculation:'Applicable calculation.',
      sickPay:'SSP',
      paidLeave:'Statutory paid leave',
      contractualBenefits:'Workplace pension',
      nonContractualBenefits:'Employee assistance programme',
      probation:'6 months',
      probationConditions:'Monthly review',
      noticePeriodEmployee:'4 weeks',
      noticePeriodEmployer:'4 weeks',
      mandatoryTraining:'Care Certificate',
      mandatoryTrainingPaidBy:'Employer-funded',
      pensionScheme:'Auto-enrolment workplace pension'
    }, 'uk');
    expect(result.valid).toBe(true);
  });
});
