import { describe, expect, test } from 'vitest';
import { renderLauremContract } from '../lib/laurem-contract';
import { renderLauremInternationalNurseContract } from '../lib/laurem-international-nurse-contract';
import { lauremCompany } from '../lib/laurem-company-config';

describe('Contract Copy Legal & Brand Compliance', () => {
  test('standard contract contains Statement of Particulars and correct company legal identity', () => {
    const text = renderLauremContract({
      employeeName: 'John Support',
      employeeAddress: '10 Park Avenue, Glasgow',
      jobTitle: 'Senior Support Worker',
      employmentType: 'Permanent',
      startDate: '2026-10-01',
      continuousEmploymentDate: '2026-10-01',
      minimumWeeklyHours: 37.5,
      hourlyRate: 14.20,
      payFrequency: 'Monthly in arrears',
      payMethod: 'BACS Direct Credit',
      workLocations: ['Glasgow Centre'],
      holidayEntitlement: '28 days per annum',
      sickPay: 'Statutory Sick Pay (SSP)',
      probation: '6 months',
      noticePeriodEmployee: '4 weeks written notice',
      noticePeriodEmployer: '4 weeks written notice',
      mandatoryTraining: 'Mandatory Care Induction',
    });

    expect(text).toContain('STATEMENT OF MAIN EMPLOYMENT PARTICULARS');
    expect(text).toContain(`Employer Legal Name: ${lauremCompany.legalName}`);
    expect(text).toContain(`Trading Name: ${lauremCompany.tradingName}`);
    expect(text).toContain(`Company Number: ${lauremCompany.companyNumber}`);
    expect(text).toContain(`Registered Office: ${lauremCompany.registeredOffice}`);
    expect(text).not.toContain('Laurem Caregroup Ltd'); // Must not reintroduce forbidden name

    expect(text).not.toContain('As stated in the offer');
    expect(text).not.toContain('As stated in approved terms');
    expect(text).not.toContain('To be confirmed before issue');
    expect(text).not.toContain('As stated in the approved rate card');
    expect(text).not.toContain('Details will be provided separately');
  });

  test('international nurse contract contains pre/post salary, visa, SOC, and repayment exclusions', () => {
    const text = renderLauremInternationalNurseContract({
      employeeName: 'Amara Okafor',
      employeeAddress: 'Flat 4A, High Street, Barrhead',
      jobTitle: 'Registered Nurse',
      preRegistrationRole: 'Pre-Registration Nurse',
      employmentType: 'Permanent',
      startDate: '2026-11-01',
      minimumWeeklyHours: 37.5,
      preRegistrationSalary: 26115,
      postRegistrationSalary: 34544,
      visaRoute: 'Health and Care Worker visa',
      sponsorshipOccupationCode: '2237 (Registered Nurses)',
      nmcStatus: 'Decision Letter issued',
      registrationDeadline: '2027-07-01',
      repayableCosts: 'Relocation flight reimbursement (£800)',
      repaymentSchedule: '100% within 12 months, 50% within 13-24 months, 0% after 24 months',
      repaymentMethod: 'Deduction from final salary by mutual agreement',
    });

    expect(text).toContain('INTERNATIONAL REGISTERED NURSE CONTRACT OF EMPLOYMENT');
    expect(text).toContain('Pre-Registration Salary: £26,115.00 per annum');
    expect(text).toContain('Post-Registration Salary: £34,544.00 per annum');
    expect(text).toContain('Immigration Route: Health and Care Worker visa');
    expect(text).toContain('Sponsorship SOC Code: 2237 (Registered Nurses)');
    expect(text).toContain('Professional Registration / NMC Status: Decision Letter issued');
    expect(text).toContain('Registration Deadline Date: 2027-07-01');

    // Verify statutory repayment exclusions
    expect(text).toContain('EXCLUDED RECRUITMENT COSTS (EMPLOYER LIABILITY)');
    expect(text).toContain('Agency and recruitment process fees');
    expect(text).toContain('Immigration Skills Charge (ISC)');
    expect(text).toContain('Sponsor Licence application fees');
    expect(text).toContain('Certificate of Sponsorship (CoS) issuance fees');
  });

  test('international nurse contract explicitly states when no repayable costs exist', () => {
    const text = renderLauremInternationalNurseContract({
      employeeName: 'Amara Okafor',
      jobTitle: 'Registered Nurse',
      repayableCosts: '',
    });

    expect(text).toContain('No repayable employer-funded recruitment or relocation expenses apply to this employment.');
  });
});
