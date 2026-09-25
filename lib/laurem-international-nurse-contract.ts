import { lauremCompany } from '@/lib/laurem-company-config';

export type InternationalNurseContractInput = {
  employeeName: string;
  employeeAddress?: string | null;
  jobTitle?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  continuousEmploymentDate?: string | null;
  contractEndDate?: string | null;
  minimumWeeklyHours?: number | null;
  weeklyHours?: number | null;
  normalWorkingDays?: string | null;
  shiftPattern?: string | null;
  workLocations?: string[];
  hourlyRate?: number | null;
  annualSalary?: number | null;
  payFrequency?: string | null;
  payMethod?: string | null;
  holidayEntitlement?: string | null;
  holidayPayCalculation?: string | null;
  sickPay?: string | null;
  paidLeave?: string | null;
  contractualBenefits?: string | null;
  nonContractualBenefits?: string | null;
  probation?: string | null;
  probationConditions?: string | null;
  noticePeriodEmployee?: string | null;
  noticePeriodEmployer?: string | null;
  mandatoryTraining?: string | null;
  mandatoryTrainingPaidBy?: string | null;
  pensionScheme?: string | null;
  // International Nurse Specific
  visaRoute?: string | null;
  sponsorshipOccupationCode?: string | null;
  nmcStatus?: string | null;
  registrationDeadline?: string | null;
  preRegistrationRole?: string | null;
  preRegistrationSalary?: number | null;
  postRegistrationSalary?: number | null;
  registrationTransitionTerms?: string | null;
  relocationSupport?: string | null;
  repayableCosts?: string | null;
  repaymentSchedule?: string | null;
  repaymentMethod?: string | null;
  assignmentDetails?: string | null;
};

const text = (value: string | null | undefined, fallback: string): string =>
  value === null || value === undefined || value.trim() === '' ? fallback : value.trim();

const money = (value: number | null | undefined, fallback: string): string =>
  value == null ? fallback : `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per annum`;

export function renderLauremInternationalNurseContract(input: InternationalNurseContractInput): string {
  const empName = text(input.employeeName, 'Employee');
  const empAddress = text(input.employeeAddress, 'Address provided on file');
  const role = text(input.jobTitle, 'Registered Nurse');
  const preRole = text(input.preRegistrationRole, 'Pre-Registration Nurse / Senior Support Worker');
  const empType = text(input.employmentType, 'Permanent');
  const startDate = text(input.startDate, 'To be agreed prior to issue');
  const continuousDate = text(input.continuousEmploymentDate, startDate);
  const endDate = text(input.contractEndDate, 'Not applicable (Permanent contract)');
  const rawHours = input.weeklyHours ?? input.minimumWeeklyHours;
  const hours = rawHours == null ? '37.5 hours per week' : `${rawHours} hours per week`;
  const pattern = text(input.normalWorkingDays || input.shiftPattern, 'Rostered shifts across days, nights, and weekends according to operational rota');
  const locations = input.workLocations?.length ? input.workLocations.join(', ') : 'Laurem Care Group premises and approved care sites in Scotland';

  const preSal = money(input.preRegistrationSalary, '£26,115.00 per annum (Pre-registration rate)');
  const postSal = money(input.postRegistrationSalary ?? input.annualSalary, '£34,544.00 per annum (Post-registration rate)');
  const frequency = text(input.payFrequency, 'Monthly in arrears');
  const method = text(input.payMethod, 'Direct bank transfer (BACS)');
  const holiday = text(input.holidayEntitlement, '28 days per annum (inclusive of public holidays)');
  const holidayCalc = text(input.holidayPayCalculation, 'Calculated based on standard rostered contractual hours and normal wage');
  const sickPay = text(input.sickPay, 'Statutory Sick Pay (SSP) in accordance with statutory rules');
  const paidLeave = text(input.paidLeave, 'Statutory family leave (maternity, paternity, adoption, shared parental) as set out in company handbook');
  const contractualBen = text(input.contractualBenefits, 'Workplace pension scheme and visa sponsorship administration');
  const nonContractualBen = text(input.nonContractualBenefits, 'Welcome pastoral orientation, airport transfer assistance, and initial relocation guidance');
  const probationDuration = text(input.probation, '6 months');
  const probationCond = text(input.probationConditions, 'Satisfactory progress towards full NMC PIN registration and completion of clinical induction');
  const employeeNotice = text(input.noticePeriodEmployee, '1 week during probation; 4 weeks thereafter in writing');
  const employerNotice = text(input.noticePeriodEmployer, '1 week during probation; 4 weeks thereafter (or statutory minimum, whichever is greater)');
  const training = text(input.mandatoryTraining, 'OSCE preparation training, Scottish Social Services Council / NMC code orientation, and mandatory clinical skills');
  const trainingPayer = text(input.mandatoryTrainingPaidBy, 'Fully paid by Laurem Care Group Limited; training time is paid as normal working time');
  const pension = text(input.pensionScheme, 'Auto-enrolment workplace pension scheme');

  // International Nurse Specific Fields
  const visaRoute = text(input.visaRoute, 'Health and Care Worker visa (Skilled Worker Sponsorship)');
  const socCode = text(input.sponsorshipOccupationCode, '2237 (Registered Nurses)');
  const nmcStatus = text(input.nmcStatus, 'Decision Letter received / awaiting OSCE examination');
  const regDeadline = text(input.registrationDeadline, 'Within 8 months of UK arrival / employment start date');
  const regTransition = text(input.registrationTransitionTerms, 'Upon receipt of full NMC PIN, employment title transitions automatically to Registered Nurse with post-registration salary active from the date of PIN confirmation.');

  // Relocation & Repayment Schedule Handling
  let relocationText = '';
  if (input.relocationSupport && input.relocationSupport.trim() !== '') {
    relocationText = input.relocationSupport.trim();
  } else {
    relocationText = 'No employer-provided relocation financial support is applicable to this appointment.';
  }

  let repaymentText = '';
  if (input.repayableCosts && input.repayableCosts.trim() !== '') {
    const schedule = text(input.repaymentSchedule, 'Tapered repayment schedule: 100% within 0-12 months, 50% within 13-24 months, 0% after 24 months.');
    const repMethod = text(input.repaymentMethod, 'Deduction from final salary by mutual agreement or structured monthly payment plan upon voluntary departure.');
    repaymentText = `REPAYABLE EXPENSES SCHEDULE:
Repayable Expenses: ${input.repayableCosts.trim()}
Repayment Schedule / Tapering: ${schedule}
Repayment Method: ${repMethod}
Lawful Basis: Voluntary repayment agreement for personal relocations expenses paid by employer on candidate's behalf. No interest charged.

EXCLUDED RECRUITMENT COSTS (EMPLOYER LIABILITY):
In compliance with UK law and the Code of Practice for international recruitment, the following employer-liable costs are strictly excluded from repayment and will never be recovered from the employee:
- Agency and recruitment process fees
- Immigration Skills Charge (ISC)
- Sponsor Licence application fees
- Certificate of Sponsorship (CoS) issuance fees
- Employer recruitment interview costs`;
  } else {
    repaymentText = 'No repayable employer-funded recruitment or relocation expenses apply to this employment.';
  }

  return `INTERNATIONAL REGISTERED NURSE CONTRACT OF EMPLOYMENT

STATEMENT OF MAIN EMPLOYMENT PARTICULARS

Employer Legal Name: ${lauremCompany.legalName}
Trading Name: ${lauremCompany.tradingName}
Company Number: ${lauremCompany.companyNumber} (${lauremCompany.registration})
Registered Office: ${lauremCompany.registeredOffice}
Employee Name: ${empName}
Employee Address: ${empAddress}
Pre-Registration Job Title: ${preRole}
Post-Registration Job Title: ${role}
Employment Type: ${empType}
Start Date: ${startDate}
Continuous Employment Date: ${continuousDate}
Fixed-Term End Date: ${endDate}
Guaranteed Minimum Weekly Hours: ${hours}
Normal Working Days / Pattern: ${pattern}
Work Locations: ${locations}
Pre-Registration Salary: ${preSal}
Post-Registration Salary: ${postSal}
Pay Frequency: ${frequency}
Payment Method: ${method}
Holiday Entitlement: ${holiday}
Holiday Pay Calculation: ${holidayCalc}
Sick Pay: ${sickPay}
Other Paid Leave: ${paidLeave}
Contractual Benefits: ${contractualBen}
Non-Contractual Benefits: ${nonContractualBen}
Probationary Period: ${probationDuration}
Notice Period (Employee): ${employeeNotice}
Notice Period (Employer): ${employerNotice}
Mandatory Training: ${training} (${trainingPayer})

INTERNATIONAL RECRUITMENT & SPONSORSHIP PARTICULARS
Immigration Route: ${visaRoute}
Sponsorship SOC Code: ${socCode}
Professional Registration / NMC Status: ${nmcStatus}
Registration Deadline Date: ${regDeadline}
Relocation Support Provided: ${relocationText}

1. COMMENCEMENT AND CONTINUOUS EMPLOYMENT
Your employment with ${lauremCompany.legalName} begins on ${startDate}. Your period of continuous employment begins on ${continuousDate}. No prior employment with any third party counts towards continuous service.

2. APPOINTMENT, SCOPE OF PRACTICE AND DUTIES
Prior to full NMC PIN registration, you are appointed as ${preRole}. You will carry out duties under the supervision of a Registered Nurse in accordance with NMC pre-registration guidance. Upon obtaining your full NMC PIN registration, your role automatically transitions to ${role}.

3. INTERNATIONAL RECRUITMENT AND IMMIGRATION SPONSORSHIP
Your employment is sponsored under the UK Home Office ${visaRoute} under SOC Code ${socCode}. You must maintain lawful immigration status and comply with all conditions of your visa. Laurem will fulfill all sponsor duties under UK immigration rules. Sponsorship documentation (CoS) does not override or amend this signed employment contract.

4. NMC REGISTRATION SCHEDULE & TRANSITION
Current Registration Status: ${nmcStatus}.
Expected PIN Registration Deadline: ${regDeadline}.
${regTransition}
If full NMC PIN registration is not obtained by the deadline date despite support, Laurem will review your circumstances and may offer redeployment to a suitable care role or consider termination in accordance with fair procedure.

5. HOURS AND WORKING PATTERN
Your guaranteed minimum hours are ${hours}. Your normal working pattern is ${pattern}. Overtime or additional shifts are voluntary and subject to working time regulations.

6. PLACE OF WORK AND RELOCATION
Your principal work locations are ${locations}. ${relocationText}

7. REMUNERATION AND PAY PROGRESSION
During the pre-registration phase, your salary is ${preSal}. Following successful confirmation of full NMC PIN registration, your salary increases to ${postSal}. Pay is disbursed ${frequency} via ${method}. Salary will not be reduced below statutory or Home Office minimum threshold requirements.

8. REPAYMENT OF SPECIFIC EXPENSES
${repaymentText}

9. HOLIDAY AND HOLIDAY PAY
Your annual leave entitlement is ${holiday}. ${holidayCalc}. Leave must be requested via Laurem's workforce management system.

10. SICKNESS AND SICK PAY
You must report absence in accordance with company procedure. ${sickPay}.

11. PENSION
${pension}. Laurem complies with all UK auto-enrolment workplace pension statutory obligations.

12. PROBATION
Your probationary period is ${probationDuration}. ${probationCond}. Notice during probation is ${employeeNotice}.

13. MANDATORY TRAINING
Required training: ${training}. ${trainingPayer}.

14. SAFEGUARDING AND DUTY OF CANDOUR
You must adhere to all safeguarding legislation, infection control policies, and professional duty of candour rules.

15. HEALTH AND SAFETY
You must comply with all workplace health, safety, and infection control requirements.

16. CONFIDENTIALITY AND DATA PROTECTION
Confidential information regarding care users, staff, and operations must be protected in accordance with UK GDPR and Laurem privacy policies.

17. INTELLECTUAL PROPERTY
Intellectual property created in the course of employment belongs to ${lauremCompany.legalName}.

18. POLICIES AND STAFF HANDBOOK
Company policies in the Staff Handbook are non-contractual operational guidelines unless explicitly stated otherwise.

19. VETTING AND RIGHT TO WORK
Continued employment is conditional upon PVG scheme membership, valid Right to Work, and satisfactory references.

20. DISCIPLINARY AND GRIEVANCE
Disciplinary and grievance procedures are detailed in the Staff Handbook.

21. NOTICE AND TERMINATION
Following probation, required notice is ${employeeNotice} by the employee, and ${employerNotice} by the employer.

22. COLLECTIVE AGREEMENTS
No collective agreements apply to this employment.

23. CHANGES TO CONTRACTUAL TERMS
Material contractual variations require written consent signed by an authorised Laurem manager.

24. FINAL PROVISIONS AND DOCUMENT PRIORITY
This contract, together with any signed schedule, constitutes the entire agreement. Document priority hierarchy: (1) Signed Contract, (2) Signed Variations, (3) Signed Schedules, (4) Non-contractual policies.

EMPLOYER AUTHORITY
For and on behalf of ${lauremCompany.legalName}
Name: ${lauremCompany.documentIssuer.name}
Title: ${lauremCompany.documentIssuer.title}

EMPLOYEE ACCEPTANCE
I confirm that I have received, read, understood, and accept these candidate-specific employment terms.

Employee Name: ${empName}
Employee Address: ${empAddress}
Employee Acceptance: To be completed electronically
Date Accepted: Recorded by the Laurem platform
`;
}
