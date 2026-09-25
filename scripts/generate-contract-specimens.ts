import { renderLauremContract } from '../lib/laurem-contract';
import { renderLauremInternationalNurseContract } from '../lib/laurem-international-nurse-contract';
import { renderLauremPrintableContractHtml } from '../lib/laurem-contract-document-renderer';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const outDir = path.join(process.cwd(), 'tmp', 'contract-specimens');
  fs.mkdirSync(outDir, { recursive: true });

  const stdContractText = renderLauremContract({
    employeeName: 'Sarah Jenkins',
    employeeAddress: '12 Victoria Road, Glasgow, G42 7LN',
    jobTitle: 'Senior Support Worker',
    employmentType: 'Permanent',
    startDate: '2026-10-01',
    continuousEmploymentDate: '2026-10-01',
    minimumWeeklyHours: 37.5,
    normalWorkingDays: 'Monday to Friday, 08:30 - 17:00',
    shiftPattern: 'Standard day shift pattern',
    workLocations: ['Glasgow Central Care Home', 'Barrhead Community Hub'],
    hourlyRate: 14.50,
    payFrequency: 'Monthly in arrears',
    payMethod: 'BACS Direct Credit',
    holidayEntitlement: '28 days per annum inclusive of public holidays',
    holidayPayCalculation: 'Calculated at normal basic pay rate',
    sickPay: 'Statutory Sick Pay (SSP) from Day 4',
    paidLeave: 'Statutory family leave & 3 days compassionate leave',
    contractualBenefits: 'Workplace pension match up to 5%',
    nonContractualBenefits: 'Employee assistance program & wellness perks',
    probation: '6 months',
    probationConditions: 'Satisfactory monthly review and mandatory induction completion',
    noticePeriodEmployee: '4 weeks written notice',
    noticePeriodEmployer: '4 weeks written notice',
    mandatoryTraining: 'Care Certificate & Moving and Handling',
    mandatoryTrainingPaidBy: 'Employer funded and paid working time',
  });

  const stdHtml = renderLauremPrintableContractHtml({
    content: stdContractText,
    employeeName: 'Sarah Jenkins',
    jobTitle: 'Senior Support Worker',
    status: 'ISSUED',
    version: 1,
  });

  fs.writeFileSync(path.join(outDir, 'standard_contract_specimen.html'), stdHtml);

  const nurseContractText = renderLauremInternationalNurseContract({
    employeeName: 'Priya Sharma',
    employeeAddress: 'Flat 3B, 45 Renfrew Street, Glasgow, G2 3BW',
    jobTitle: 'Registered Nurse',
    preRegistrationRole: 'Pre-Registration Nurse',
    employmentType: 'Permanent (Sponsored)',
    startDate: '2026-10-15',
    continuousEmploymentDate: '2026-10-15',
    minimumWeeklyHours: 37.5,
    normalWorkingDays: 'Rostered rotational shifts',
    shiftPattern: '12-hour day and night shifts on a 4-week rolling rota',
    workLocations: ['Laurem Care Centre, Barrhead', 'Paisley Care Facility'],
    preRegistrationSalary: 26115,
    postRegistrationSalary: 34544,
    payFrequency: 'Monthly on the last working day',
    payMethod: 'BACS Direct Credit',
    holidayEntitlement: '28 days per annum',
    holidayPayCalculation: 'Based on standard 37.5 hours weekly salary',
    sickPay: 'Statutory Sick Pay (SSP) & Occupational Sick Pay after 1 year service',
    paidLeave: 'Statutory maternity, paternity, and adoption leave',
    contractualBenefits: 'Sponsorship administration and pension contribution',
    nonContractualBenefits: 'Welcome orientation pack and temporary accommodation support',
    probation: '6 months',
    probationConditions: 'Passing OSCE exam within 8 months and clinical competencies',
    noticePeriodEmployee: '4 weeks written notice',
    noticePeriodEmployer: '4 weeks written notice',
    mandatoryTraining: 'OSCE prep, NHS Scotland orientation, Safeguarding Level 3',
    mandatoryTrainingPaidBy: 'Employer funded',
    visaRoute: 'Health and Care Worker visa',
    sponsorshipOccupationCode: '2237 (Registered Nurses)',
    nmcStatus: 'Decision Letter issued; OSCE scheduled',
    registrationDeadline: '2027-06-15',
    relocationSupport: 'Flights to UK reimbursed up to £800; 1 month temporary accommodation provided.',
    repayableCosts: 'Relocation flight reimbursement (£800) and temporary accommodation (£1,200). Total: £2,000.',
    repaymentSchedule: 'Tapered repayment: 100% if leaving within 12 months, 50% if leaving within 13-24 months, 0% after 24 months.',
    repaymentMethod: 'Structured monthly repayment agreement upon voluntary departure.',
  });

  const nurseHtml = renderLauremPrintableContractHtml({
    content: nurseContractText,
    employeeName: 'Priya Sharma',
    jobTitle: 'Registered Nurse',
    status: 'ISSUED',
    version: 1,
  });

  fs.writeFileSync(path.join(outDir, 'international_nurse_contract_specimen.html'), nurseHtml);

  console.log('Contract specimens successfully generated in tmp/contract-specimens/');
}

main().catch(console.error);
