import { describe, expect, test } from 'vitest';
import { renderLauremContract } from '../lib/laurem-contract';
import { renderLauremInternationalNurseContract } from '../lib/laurem-international-nurse-contract';
import { lauremCompany } from '../lib/laurem-company-config';

describe('contract copy', () => {
  test('uses canonical identity and no draft placeholder in a complete standard contract', () => {
    const text = renderLauremContract({
      employeeName:'John Support',
      employeeAddress:'10 Park Avenue, Glasgow',
      jobTitle:'Senior Support Worker',
      employmentType:'Permanent',
      startDate:'2026-10-01',
      continuousEmploymentDate:'2026-10-01',
      minimumWeeklyHours:37.5,
      normalWorkingDays:'Monday to Friday',
      shiftPattern:'09:00 to 17:00',
      workLocations:['Glasgow Centre'],
      hourlyRate:14.2,
      payFrequency:'Monthly in arrears',
      payMethod:'BACS',
      holidayEntitlement:'28 days',
      holidayPayCalculation:'Applicable calculation.',
      sickPay:'SSP subject to eligibility.',
      paidLeave:'Statutory paid leave subject to eligibility.',
      contractualBenefits:'Workplace pension.',
      nonContractualBenefits:'Employee assistance programme.',
      probation:'6 months',
      probationConditions:'Monthly review and induction completion.',
      noticePeriodEmployee:'4 weeks',
      noticePeriodEmployer:'4 weeks or statutory minimum where greater',
      mandatoryTraining:'Mandatory care induction.',
      mandatoryTrainingPaidBy:'Employer-funded and paid as working time.',
      pensionScheme:'Auto-enrolment workplace pension.'
    });
    expect(text).toContain('Employer Legal Name: ' + lauremCompany.legalName);
    expect(text).toContain('Company Number: ' + lauremCompany.companyNumber);
    expect(text).not.toContain('Laurem Caregroup Ltd');
    expect(text).not.toContain('[DRAFT ONLY:');
  });

  test('international nurse copy includes exact terms and excluded recruitment costs even when no repayable costs apply', () => {
    const text = renderLauremInternationalNurseContract({
      employeeName:'Amara Okafor',
      employeeAddress:'Flat 4A, High Street, Barrhead',
      jobTitle:'Registered Nurse',
      employmentType:'Permanent',
      startDate:'2026-11-01',
      continuousEmploymentDate:'2026-11-01',
      minimumWeeklyHours:37.5,
      normalWorkingDays:'Monday to Friday / rostered rotation',
      shiftPattern:'Days, nights and weekends according to rota',
      workLocations:['557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE'],
      preRegistrationRole:'Pre-Registration Nurse',
      preRegistrationSalary:28000,
      postRegistrationSalary:36000,
      registrationTransitionTerms:'On full NMC PIN confirmation the Registered Nurse title and post-registration salary apply.',
      payFrequency:'Monthly in arrears',
      payMethod:'BACS',
      holidayEntitlement:'28 days',
      holidayPayCalculation:'Applicable calculation.',
      sickPay:'SSP subject to eligibility.',
      paidLeave:'Statutory paid leave subject to eligibility.',
      contractualBenefits:'Workplace pension.',
      nonContractualBenefits:'Employee assistance programme.',
      probation:'6 months',
      probationConditions:'Monthly review and clinical induction.',
      noticePeriodEmployee:'4 weeks',
      noticePeriodEmployer:'4 weeks or statutory minimum where greater',
      mandatoryTraining:'Mandatory clinical induction and safeguarding.',
      mandatoryTrainingPaidBy:'Employer-funded and paid as working time.',
      pensionScheme:'Auto-enrolment workplace pension.',
      visaRoute:'Health and Care Worker visa',
      sponsorshipOccupationCode:'2237 (Registered Nurses)',
      nmcStatus:'Decision letter received',
      registrationDeadline:'2027-06-01',
      relocationSupport:'None',
      repayableCosts:''
    });
    expect(text).toContain('Pre-Registration Salary: £28,000.00 per annum');
    expect(text).toContain('Post-Registration Salary: £36,000.00 per annum');
    expect(text).toContain('EXCLUDED RECRUITMENT COSTS (EMPLOYER LIABILITY)');
    expect(text).not.toContain('[DRAFT ONLY:');
  });
});
