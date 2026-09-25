import { describe, expect, test } from 'vitest';
import {
  validateStandardContractCompleteness,
  validateInternationalNurseContractCompleteness,
  validateContractCompleteness,
} from '../lib/laurem-contract-validator';

describe('Contract Completeness Validation', () => {
  test('standard contract fails validation when material terms are missing', () => {
    const result = validateStandardContractCompleteness({
      employeeName: 'John Doe',
      jobTitle: 'Support Worker',
      // Missing address, start date, pay frequency, holiday, probation, etc.
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('employeeAddress');
    expect(result.missingFields).toContain('startDate');
    expect(result.missingFields).toContain('payFrequency');
    expect(result.missingFields).toContain('holidayEntitlement');
    expect(result.missingFields).toContain('probation');
    expect(result.missingFields).toContain('noticePeriodEmployee');
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_EMPLOYEE_ADDRESS_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_START_DATE_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_PAY_FREQUENCY_REQUIRED');
  });

  test('standard contract fails validation when banned generic phrases are used', () => {
    const result = validateStandardContractCompleteness({
      employeeName: 'Jane Smith',
      employeeAddress: '123 High Street, Glasgow',
      jobTitle: 'Healthcare Assistant',
      employmentType: 'Permanent',
      startDate: 'To be confirmed before issue',
      minimumWeeklyHours: 37.5,
      hourlyRate: 13.50,
      payFrequency: 'Monthly in arrears',
      workLocations: ['Glasgow Centre'],
      holidayEntitlement: 'As stated in the offer',
      sickPay: 'Details will be provided separately',
      probation: '6 months',
      noticePeriodEmployee: 'As stated in approved terms',
      noticePeriodEmployer: 'As stated in approved terms',
      mandatoryTraining: 'Care Certificate',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_START_DATE_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_HOLIDAY_ENTITLEMENT_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_SICK_PAY_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('CONTRACT_NOTICE_PERIOD_REQUIRED');
  });

  test('standard contract passes validation when all material particulars are provided', () => {
    const result = validateStandardContractCompleteness({
      employeeName: 'Jane Smith',
      employeeAddress: '123 High Street, Glasgow',
      jobTitle: 'Healthcare Assistant',
      employmentType: 'Permanent',
      startDate: '2026-11-01',
      continuousEmploymentDate: '2026-11-01',
      minimumWeeklyHours: 37.5,
      hourlyRate: 13.50,
      payFrequency: 'Monthly in arrears',
      payMethod: 'BACS Direct Credit',
      workLocations: ['557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE'],
      holidayEntitlement: '28 days per annum inclusive of public holidays',
      sickPay: 'Statutory Sick Pay (SSP) in accordance with statutory eligibility rules',
      probation: '6 months',
      noticePeriodEmployee: '4 weeks written notice',
      noticePeriodEmployer: '4 weeks written notice',
      mandatoryTraining: 'Mandatory care induction, safeguarding, health & safety',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.missingFields).toHaveLength(0);
  });

  test('international nurse contract fails validation when nurse-specific particulars are missing', () => {
    const result = validateInternationalNurseContractCompleteness({
      employeeName: 'Priya Sharma',
      employeeAddress: 'Flat 2, 80 Renfrew Street, Glasgow',
      jobTitle: 'Registered Nurse',
      employmentType: 'Permanent',
      startDate: '2026-11-01',
      minimumWeeklyHours: 37.5,
      payFrequency: 'Monthly in arrears',
      workLocations: ['Glasgow Royal Infirmary'],
      holidayEntitlement: '28 days per annum',
      sickPay: 'SSP',
      probation: '6 months',
      noticePeriodEmployee: '4 weeks',
      noticePeriodEmployer: '4 weeks',
      mandatoryTraining: 'OSCE prep and clinical skills',
      // Missing visa route, SOC code, NMC status, pre/post salary
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('NURSE_SALARY_TERMS_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('NURSE_REGISTRATION_TERMS_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('NURSE_VISA_ROUTE_REQUIRED');
    expect(result.errors.map((e) => e.code)).toContain('NURSE_SOC_CODE_REQUIRED');
  });

  test('international nurse contract requires repayment terms when repayable costs are present', () => {
    const result = validateInternationalNurseContractCompleteness({
      employeeName: 'Priya Sharma',
      employeeAddress: 'Flat 2, 80 Renfrew Street, Glasgow',
      jobTitle: 'Registered Nurse',
      employmentType: 'Permanent',
      startDate: '2026-11-01',
      minimumWeeklyHours: 37.5,
      payFrequency: 'Monthly in arrears',
      workLocations: ['Glasgow Royal Infirmary'],
      holidayEntitlement: '28 days per annum',
      sickPay: 'SSP',
      probation: '6 months',
      noticePeriodEmployee: '4 weeks',
      noticePeriodEmployer: '4 weeks',
      mandatoryTraining: 'OSCE prep and clinical skills',
      visaRoute: 'Health and Care Worker visa',
      sponsorshipOccupationCode: '2237',
      nmcStatus: 'Decision letter received',
      registrationDeadline: '2027-06-01',
      preRegistrationSalary: 26115,
      postRegistrationSalary: 34544,
      repayableCosts: 'Relocation flight reimbursement £800',
      // Missing repaymentSchedule and repaymentMethod
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('NURSE_REPAYMENT_TERMS_REQUIRED');
  });

  test('validateContractCompleteness correctly routes based on role and pathway', () => {
    const nurseResult = validateContractCompleteness('Registered Nurse', {}, 'international');
    expect(nurseResult.errors.map((e) => e.code)).toContain('NURSE_VISA_ROUTE_REQUIRED');

    const standardResult = validateContractCompleteness('Support Worker', {}, 'uk');
    expect(standardResult.errors.map((e) => e.code)).not.toContain('NURSE_VISA_ROUTE_REQUIRED');
    expect(standardResult.errors.map((e) => e.code)).toContain('CONTRACT_EMPLOYEE_NAME_REQUIRED');
  });
});
