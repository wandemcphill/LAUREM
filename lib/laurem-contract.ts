import { lauremCompany } from '@/lib/laurem-company-config';

export type ContractInput = {
  employeeName: string;
  employeeAddress?: string | null;
  jobTitle: string;
  employmentType?: string | null;
  startDate?: string | null;
  continuousEmploymentDate?: string | null;
  contractEndDate?: string | null;
  minimumWeeklyHours?: number | null;
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
  clientOrAssignmentDetails?: string | null;
  pensionScheme?: string | null;
};

const text = (value: string | null | undefined, fallback: string): string =>
  value === null || value === undefined || value.trim() === '' ? fallback : value.trim();
const isFixedTerm = (value: string | null | undefined): boolean => /fixed[- ]term|temporary/i.test(value || '');

export function renderLauremContract(input: ContractInput): string {
  const empName = text(input.employeeName, '[DRAFT ONLY: employee name not specified]');
  const empAddress = text(input.employeeAddress, '[DRAFT ONLY: employee address not specified]');
  const role = text(input.jobTitle, '[DRAFT ONLY: job title not specified]');
  const empType = text(input.employmentType, '[DRAFT ONLY: employment type not specified]');
  const startDate = text(input.startDate, '[DRAFT ONLY: start date not specified]');
  const continuousDate = text(input.continuousEmploymentDate, startDate);
  const endDate = isFixedTerm(empType) ? text(input.contractEndDate, '[DRAFT ONLY: fixed-term end date not specified]') : 'Not applicable (permanent/open-ended employment)';
  const hours = input.minimumWeeklyHours == null ? '[DRAFT ONLY: guaranteed weekly hours not specified]' : `${input.minimumWeeklyHours} hours per week`;
  const pattern = text(input.normalWorkingDays || input.shiftPattern, '[DRAFT ONLY: working pattern not specified]');
  const locations = input.workLocations?.length ? input.workLocations.join(', ') : '[DRAFT ONLY: work location not specified]';

  let payStr = '';
  if (input.hourlyRate != null) {
    payStr = `£${input.hourlyRate.toFixed(2)} per hour`;
  } else if (input.annualSalary != null) {
    payStr = `£${input.annualSalary.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per annum`;
  } else {
    payStr = '[DRAFT ONLY: pay rate or salary not specified]';
  }

  const frequency = text(input.payFrequency, '[DRAFT ONLY: pay frequency not specified]');
  const method = text(input.payMethod, '[DRAFT ONLY: payment method not specified]');
  const holiday = text(input.holidayEntitlement, '[DRAFT ONLY: holiday entitlement not specified]');
  const holidayCalc = text(input.holidayPayCalculation, '[DRAFT ONLY: holiday pay calculation not specified]');
  const sickPay = text(input.sickPay, '[DRAFT ONLY: sick pay arrangement not specified]');
  const paidLeave = text(input.paidLeave, '[DRAFT ONLY: paid leave arrangements not specified]');
  const contractualBen = text(input.contractualBenefits, '[DRAFT ONLY: contractual benefits not specified]');
  const nonContractualBen = text(input.nonContractualBenefits, '[DRAFT ONLY: non-contractual benefits not specified]');
  const probationDuration = text(input.probation, '[DRAFT ONLY: probation period not specified]');
  const probationCond = text(input.probationConditions, '[DRAFT ONLY: probation conditions not specified]');
  const employeeNotice = text(input.noticePeriodEmployee, '[DRAFT ONLY: employee notice period not specified]');
  const employerNotice = text(input.noticePeriodEmployer, '[DRAFT ONLY: employer notice period not specified]');
  const training = text(input.mandatoryTraining, '[DRAFT ONLY: mandatory training not specified]');
  const trainingPayer = text(input.mandatoryTrainingPaidBy, '[DRAFT ONLY: training payment responsibility not specified]');
  const pension = text(input.pensionScheme, '[DRAFT ONLY: pension arrangement not specified]');

  return `STATEMENT OF MAIN EMPLOYMENT PARTICULARS

Employer Legal Name: ${lauremCompany.legalName}
Trading Name: ${lauremCompany.tradingName}
Company Number: ${lauremCompany.companyNumber} (${lauremCompany.registration})
Registered Office: ${lauremCompany.registeredOffice}
Employee Name: ${empName}
Employee Address: ${empAddress}
Job Title: ${role}
Employment Type: ${empType}
Start Date: ${startDate}
Continuous Employment Date: ${continuousDate}
Fixed-Term End Date: ${endDate}
Guaranteed Minimum Weekly Hours: ${hours}
Normal Working Days / Pattern: ${pattern}
Work Locations: ${locations}
Pay Rate / Salary: ${payStr}
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

1. COMMENCEMENT AND CONTINUOUS EMPLOYMENT
Your employment with ${lauremCompany.legalName} (trading as ${lauremCompany.tradingName}) begins on ${startDate}. Your period of continuous employment for statutory rights begins on ${continuousDate}. No employment with a previous employer counts toward your continuous service unless explicitly stated in a signed variation.

2. JOB TITLE AND DUTIES
You are employed as ${role}. You will perform duties in accordance with your competence, professional standards, and instructions from management. You may be assigned to support individual service users at client premises or Laurem care locations as part of Laurem's care operations.

3. EMPLOYMENT TYPE AND DURATION
This contract represents a ${empType} employment agreement. Where employment is for a fixed term, it will terminate on ${endDate} unless extended in writing by ${lauremCompany.legalName}.

4. HOURS AND WORKING PATTERN
Your guaranteed minimum hours are ${hours}. Your normal working pattern is ${pattern}. Shifts will be scheduled on weekly or monthly rosters. Laurem will provide reasonable notice of roster changes. You may be requested to work additional hours or overtime by mutual agreement, paid at your standard rate unless an enhanced rate is specified in writing.

5. PLACE OF WORK
Your primary work locations are ${locations}. You may be required to travel between assigned care locations. Laurem will reimburse reasonable travel expenses incurred during work assignments in accordance with company policy.

6. PAY AND PAYMENT ARRANGEMENTS
Your pay rate is ${payStr}. Pay is processed ${frequency} via ${method} into your nominated UK bank account, subject to PAYE income tax, National Insurance, and statutory deductions. Itemised pay statements will be provided on or before each pay date.

7. HOLIDAY AND HOLIDAY PAY
Your annual leave entitlement is ${holiday}. The holiday year runs from 1 January to 31 December. ${holidayCalc}. Holiday must be requested and approved in advance via Laurem's workforce system. On termination, accrued unused holiday will be paid, and excess leave taken beyond accrual will be deducted from final pay where lawfully permitted.

8. SICKNESS AND SICK PAY
If you are unable to attend work due to sickness or injury, you must notify Laurem at least 2 hours before your shift start time in accordance with the Sickness Absence Policy. ${sickPay}. Full details of notification requirements and SSP rules are accessible in the Laurem Staff Handbook.

9. OTHER STATUTORY AND CONTRACTUAL LEAVE
You are entitled to statutory family leave (maternity, paternity, adoption, shared parental, bereavement, and carer's leave) subject to statutory eligibility. ${paidLeave}.

10. PENSION
${pension}. Laurem will automatically enrol eligible employees into the workplace pension scheme in compliance with UK auto-enrolment legislation.

11. PROBATION
Your employment is subject to a probationary period of ${probationDuration}. ${probationCond}. During probation, employment may be terminated by either party giving ${employeeNotice} notice. Laurem reserves the right to extend probation where necessary to evaluate performance or attendance.

12. MANDATORY TRAINING
You must complete all required training: ${training}. ${trainingPayer}. Time spent attending mandatory training directed by Laurem is treated as working time and paid at your normal basic rate. No deductions will be made for mandatory training costs unless a separate, lawful repayment agreement has been executed.

13. SAFEGUARDING
You must strictly comply with Scottish and UK safeguarding legislation, adult and child protection policies, and duty of candour rules. You must immediately report any safeguarding concerns, allegations, or incidents to Laurem's designated safeguarding lead.

14. HEALTH AND SAFETY
You must take reasonable care for your own health and safety and that of service users, colleagues, and members of the public. You must adhere to Laurem's Health and Safety Policy, infection control protocols, and risk assessments.

15. CONFIDENTIALITY AND DATA PROTECTION
You will have access to sensitive personal data and confidential care records. You must maintain strict confidentiality regarding service users, business operations, and staff records both during and after your employment. Personal data is processed in accordance with Laurem's Data Protection Policy and UK GDPR.

16. INTELLECTUAL PROPERTY
Any care plans, documentation, software, or intellectual property created by you in the course of your employment belong exclusively to ${lauremCompany.legalName}.

17. POLICIES AND STAFF HANDBOOK
You are required to comply with all company policies set out in the Laurem Staff Handbook. The handbook contains operational procedures and is available on the employee portal. Staff policies are non-contractual and may be updated from time to time, except where explicitly stated to be contractual terms.

18. VETTING AND RIGHT TO WORK
Your employment is conditional upon maintaining a valid Disclosure Scotland / PVG scheme membership, satisfactory references, and continuous lawful Right to Work in the UK. You must inform Laurem immediately of any police cautions, convictions, or changes in your immigration status.

19. DISCIPLINARY AND GRIEVANCE PROCEDURES
Laurem's Disciplinary and Grievance Procedures are set out in the Staff Handbook. These procedures do not form part of your contractual terms. If you wish to lodge a grievance or appeal a disciplinary decision, you should submit it in writing to management.

20. NOTICE AND TERMINATION
Following successful completion of probation, notice required to terminate employment is ${employeeNotice} by the employee, and ${employerNotice} by the employer. Laurem reserves the right to make a payment in lieu of notice (PILON) or place you on garden leave during your notice period. Laurem may terminate employment without notice in cases of gross misconduct.

21. COLLECTIVE AGREEMENTS
There are no collective agreements directly affecting your employment terms.

22. BENEFITS
Your entitlement to contractual and non-contractual benefits is set out above. Non-contractual benefits may be modified or withdrawn by Laurem at its discretion.

23. CHANGES TO CONTRACTUAL TERMS
Material changes to contractual terms will only be made following consultation and written agreement signed by an authorised manager of ${lauremCompany.legalName}.

24. FINAL PROVISIONS AND DOCUMENT PRIORITY
This contract, along with any signed written variations, constitutes the entire employment agreement between you and ${lauremCompany.legalName}. In the event of any inconsistency, the signed contract takes precedence over informal representations, policies, or operational guidelines.

EMPLOYER AUTHORITY
For and on behalf of ${lauremCompany.legalName}
Name: ${lauremCompany.documentIssuer.name}
Title: ${lauremCompany.documentIssuer.title}

EMPLOYEE ACCEPTANCE
I confirm that I have read, understood, and accept this contract of employment and the Statement of Main Employment Particulars.

Employee Name: ${empName}
Employee Address: ${empAddress}
Employee Acceptance: To be completed electronically
Date Accepted: Recorded by the Laurem platform
`;
}
