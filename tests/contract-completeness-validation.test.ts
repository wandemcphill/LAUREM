import { describe, expect, test } from 'vitest';
import { validateStandardContractCompleteness, validateInternationalNurseContractCompleteness, validateContractCompleteness } from '../lib/laurem-contract-validator';

const completeStandard = {
  employeeName:'Jane Smith',
  employeeAddress:'123 High Street, Glasgow',
  jobTitle:'Healthcare Assistant',
  employmentType:'Permanent',
  startDate:'2026-11-01',
  continuousEmploymentDate:'2026-11-01',
  minimumWeeklyHours:37.5,
  normalWorkingDays:'Monday to Friday',
  shiftPattern:'09:00 to 17:00',
  workLocations:['557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE'],
  hourlyRate:13.5,
  payFrequency:'Monthly in arrears',
  payMethod:'BACS Direct Credit',
  holidayEntitlement:'28 days per annum',
  holidayPayCalculation:'Calculated under applicable holiday pay rules.',
  sickPay:'SSP subject to eligibility.',
  paidLeave:'Statutory paid leave subject to eligibility.',
  contractualBenefits:'Workplace pension.',
  nonContractualBenefits:'Employee assistance programme.',
  probation:'6 months',
  probationConditions:'Monthly review and induction completion.',
  noticePeriodEmployee:'4 weeks',
  noticePeriodEmployer:'4 weeks or statutory minimum where greater',
  mandatoryTraining:'Mandatory care induction.',
  mandatoryTrainingPaidBy:'Employer-funded and paid working time.',
  pensionScheme:'Auto-enrolment workplace pension scheme.'
};

describe('central contract completeness', () => {
  test('rejects missing material particulars', () => {
    const result = validateStandardContractCompleteness({ employeeName:'John Doe', jobTitle:'Support Worker' });
    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(expect.arrayContaining([
      'employeeAddress','startDate','continuousEmploymentDate','minimumWeeklyHours',
      'normalWorkingDays','workLocations','hourlyRate','payFrequency','payMethod',
      'holidayEntitlement','holidayPayCalculation','sickPay','paidLeave','contractualBenefits',
      'nonContractualBenefits','probation','probationConditions','noticePeriodEmployee',
      'noticePeriodEmployer','mandatoryTraining','mandatoryTrainingPaidBy','pensionScheme'
    ]));
  });

  test('accepts a fully specified permanent contract', () => {
    const result = validateStandardContractCompleteness(completeStandard);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('requires fixed-term end date and valid date ordering', () => {
    const missing = validateStandardContractCompleteness({...completeStandard, employmentType:'Fixed-term'});
    expect(missing.missingFields).toContain('contractEndDate');

    const bad = validateStandardContractCompleteness({
      ...completeStandard,
      employmentType:'Fixed-term',
      continuousEmploymentDate:'2026-12-01',
      contractEndDate:'2026-10-01',
    });
    expect(bad.valid).toBe(false);
    expect(bad.missingFields).toEqual(expect.arrayContaining(['continuousEmploymentDate','contractEndDate']));
  });

  test('rejects placeholder wording and impossible dates', () => {
    const placeholder = validateStandardContractCompleteness({...completeStandard, payMethod:'As stated in the offer'});
    expect(placeholder.missingFields).toContain('payMethod');

    const impossible = validateStandardContractCompleteness({...completeStandard, startDate:'2026-02-30'});
    expect(impossible.missingFields).toContain('startDate');
  });

  test('requires repayment schedule and method independently', () => {
    const base = {
      ...completeStandard,
      jobTitle:'Registered Nurse',
      annualSalary:36000,
      preRegistrationSalary:28000,
      postRegistrationSalary:36000,
      preRegistrationRole:'Pre-Registration Nurse',
      registrationTransitionTerms:'On NMC PIN confirmation the Registered Nurse title and post-registration salary apply.',
      visaRoute:'Health and Care Worker visa',
      sponsorshipOccupationCode:'2237',
      nmcStatus:'Awaiting full registration',
      registrationDeadline:'2027-06-01',
      relocationSupport:'None',
      repayableCosts:'Relocation flight reimbursement £800'
    };
    const missingSchedule = validateInternationalNurseContractCompleteness({...base, repaymentSchedule:'', repaymentMethod:'Monthly bank transfer'});
    const missingMethod = validateInternationalNurseContractCompleteness({...base, repaymentSchedule:'0-12 100%; 13-24 50%; 25-36 25%; after 36 0%', repaymentMethod:''});
    expect(missingSchedule.missingFields).toContain('repaymentSchedule');
    expect(missingMethod.missingFields).toContain('repaymentMethod');
  });

  test('requires exact international nurse particulars', () => {
    const result = validateInternationalNurseContractCompleteness({...completeStandard, jobTitle:'Registered Nurse'});
    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(expect.arrayContaining([
      'preRegistrationSalary','postRegistrationSalary','preRegistrationRole','registrationTransitionTerms',
      'visaRoute','sponsorshipOccupationCode','nmcStatus','registrationDeadline','relocationSupport'
    ]));
  });

  test('does not let standard roles inherit nurse-specific checks', () => {
    const result = validateContractCompleteness('Support Worker', completeStandard, 'uk');
    expect(result.errors.map((e) => e.code)).not.toContain('NURSE_VISA_ROUTE_REQUIRED');
  });
});
