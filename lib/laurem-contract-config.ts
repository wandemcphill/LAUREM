import { lauremCompany } from '@/lib/laurem-company-config';

export const lauremEmploymentContract = {
  title: 'Contract of Employment (Guaranteed Minimum Hours)',
  employerName: lauremCompany.legalName,
  tradingName: lauremCompany.tradingName,
  companyNumber: lauremCompany.companyNumber,
  registration: lauremCompany.registration,
  registeredOffice: lauremCompany.registeredOffice,
  platformName: 'Laurem Recruitment & Workforce Platform',
  documentIssuer: lauremCompany.documentIssuer,
  sections: [
    'Statement of Main Employment Particulars',
    'Employer and Employee Identity',
    'Commencement and Continuous Employment',
    'Job Title and Duties',
    'Employment Type and Duration',
    'Hours and Working Pattern',
    'Place of Work',
    'Pay and Payment Arrangements',
    'Holiday and Holiday Pay',
    'Sickness and Sick Pay',
    'Other Statutory and Contractual Leave',
    'Pension',
    'Probation',
    'Training',
    'Safeguarding',
    'Health and Safety',
    'Confidentiality and Data Protection',
    'Intellectual Property',
    'Policies and Staff Handbook',
    'Vetting and Right to Work',
    'Disciplinary and Grievance Procedures',
    'Notice and Termination',
    'Collective Agreements',
    'Benefits',
    'Changes to Contractual Terms',
    'Final Provisions',
    'Acceptance and Declaration',
  ] as const,
  variables: [
    'employeeName','employeeAddress','jobTitle','employmentType','startDate',
    'continuousEmploymentDate','contractEndDate','minimumWeeklyHours','normalWorkingDays',
    'shiftPattern','workLocations','hourlyRate','annualSalary','payFrequency','payMethod',
    'holidayEntitlement','holidayPayCalculation','sickPay','paidLeave','contractualBenefits',
    'nonContractualBenefits','probation','probationConditions','noticePeriodEmployee',
    'noticePeriodEmployer','mandatoryTraining','mandatoryTrainingPaidBy','clientOrAssignmentDetails',
    'pensionScheme',
  ] as const,
} as const;

export type LauremContractVariable = (typeof lauremEmploymentContract.variables)[number];

export function getLauremContractVariableNames(): readonly string[] {
  return lauremEmploymentContract.variables;
}
