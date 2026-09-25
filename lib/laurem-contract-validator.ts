import { isNurseRole } from '@/lib/laurem-company-config';

export type StandardContractValidationInput = {
  employeeName?: string | null;
  employeeAddress?: string | null;
  jobTitle?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  continuousEmploymentDate?: string | null;
  minimumWeeklyHours?: number | null;
  normalWorkingDays?: string | null;
  shiftPattern?: string | null;
  workLocations?: string[] | null;
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
};

export type InternationalNurseContractValidationInput = StandardContractValidationInput & {
  visaRoute?: string | null;
  sponsorshipOccupationCode?: string | null;
  nmcStatus?: string | null;
  registrationDeadline?: string | null;
  preRegistrationRole?: string | null;
  preRegistrationSalary?: number | null;
  postRegistrationSalary?: number | null;
  relocationSupport?: string | null;
  repayableCosts?: string | null;
  repaymentSchedule?: string | null;
  repaymentMethod?: string | null;
};

export type ContractValidationError = {
  code: string;
  field: string;
  message: string;
};

export type ContractValidationResult = {
  valid: boolean;
  errors: ContractValidationError[];
  missingFields: string[];
};

const BANNED_PLACEHOLDERS = [
  'as stated in the offer',
  'as stated in approved terms',
  'to be confirmed before issue',
  'to be confirmed in the signed offer',
  'as stated in the approved rate card',
  'details will be provided separately',
  'laurem caregroup ltd', // Must use canonical company legal / trading name
];

function isBlank(val: string | number | null | undefined): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return isNaN(val);
  const str = String(val).trim();
  if (str === '') return true;
  const lower = str.toLowerCase();
  return BANNED_PLACEHOLDERS.some((ph) => lower.includes(ph));
}

export function validateStandardContractCompleteness(
  input: StandardContractValidationInput
): ContractValidationResult {
  const errors: ContractValidationError[] = [];
  const missingFields: string[] = [];

  const check = (
    value: string | number | null | undefined,
    field: string,
    code: string,
    message: string
  ) => {
    if (isBlank(value)) {
      errors.push({ code, field, message });
      missingFields.push(field);
    }
  };

  check(input.employeeName, 'employeeName', 'CONTRACT_EMPLOYEE_NAME_REQUIRED', 'Employee name is required.');
  check(input.employeeAddress, 'employeeAddress', 'CONTRACT_EMPLOYEE_ADDRESS_REQUIRED', 'Employee address is required.');
  check(input.jobTitle, 'jobTitle', 'CONTRACT_JOB_TITLE_REQUIRED', 'Job title is required.');
  check(input.employmentType, 'employmentType', 'CONTRACT_EMPLOYMENT_TYPE_REQUIRED', 'Employment type is required.');
  check(input.startDate, 'startDate', 'CONTRACT_START_DATE_REQUIRED', 'Contract start date is required.');

  // Pay terms check: must have pay frequency AND either hourlyRate or annualSalary
  check(input.payFrequency, 'payFrequency', 'CONTRACT_PAY_FREQUENCY_REQUIRED', 'Pay frequency is required.');
  if (input.hourlyRate == null && input.annualSalary == null) {
    errors.push({
      code: 'CONTRACT_PAY_RATE_REQUIRED',
      field: 'hourlyRate',
      message: 'An hourly rate or annual salary must be specified.',
    });
    missingFields.push('hourlyRate');
  }

  // Working hours and pattern
  if (input.minimumWeeklyHours == null && isBlank(input.normalWorkingDays) && isBlank(input.shiftPattern)) {
    errors.push({
      code: 'CONTRACT_HOURS_PATTERN_REQUIRED',
      field: 'minimumWeeklyHours',
      message: 'Guaranteed minimum hours or normal working pattern must be specified.',
    });
    missingFields.push('minimumWeeklyHours');
  }

  // Work locations
  if (!input.workLocations || input.workLocations.length === 0) {
    errors.push({
      code: 'CONTRACT_WORK_LOCATIONS_REQUIRED',
      field: 'workLocations',
      message: 'At least one work location or assignment arrangement must be specified.',
    });
    missingFields.push('workLocations');
  }

  // Holiday entitlement
  check(
    input.holidayEntitlement,
    'holidayEntitlement',
    'CONTRACT_HOLIDAY_ENTITLEMENT_REQUIRED',
    'Holiday entitlement details are required.'
  );

  // Sick pay
  check(input.sickPay, 'sickPay', 'CONTRACT_SICK_PAY_REQUIRED', 'Sick pay arrangements are required.');

  // Probation
  check(input.probation, 'probation', 'CONTRACT_PROBATION_REQUIRED', 'Probationary period details are required.');

  // Notice periods
  if (isBlank(input.noticePeriodEmployee) || isBlank(input.noticePeriodEmployer)) {
    errors.push({
      code: 'CONTRACT_NOTICE_PERIOD_REQUIRED',
      field: 'noticePeriodEmployee',
      message: 'Both employee and employer notice periods are required.',
    });
    if (isBlank(input.noticePeriodEmployee)) missingFields.push('noticePeriodEmployee');
    if (isBlank(input.noticePeriodEmployer)) missingFields.push('noticePeriodEmployer');
  }

  // Mandatory training
  check(
    input.mandatoryTraining,
    'mandatoryTraining',
    'CONTRACT_MANDATORY_TRAINING_REQUIRED',
    'Mandatory training terms are required.'
  );

  return {
    valid: errors.length === 0,
    errors,
    missingFields,
  };
}

export function validateInternationalNurseContractCompleteness(
  input: InternationalNurseContractValidationInput
): ContractValidationResult {
  const standardResult = validateStandardContractCompleteness(input);
  const errors = [...standardResult.errors];
  const missingFields = [...standardResult.missingFields];

  const check = (
    value: string | number | null | undefined,
    field: string,
    code: string,
    message: string
  ) => {
    if (isBlank(value)) {
      errors.push({ code, field, message });
      missingFields.push(field);
    }
  };

  // Nurse salary terms
  if (
    input.postRegistrationSalary == null &&
    input.annualSalary == null &&
    input.preRegistrationSalary == null
  ) {
    errors.push({
      code: 'NURSE_SALARY_TERMS_REQUIRED',
      field: 'postRegistrationSalary',
      message: 'Exact pre-registration and/or post-registration salary particulars are required.',
    });
    missingFields.push('postRegistrationSalary');
  }

  // Registration terms
  check(
    input.nmcStatus,
    'nmcStatus',
    'NURSE_REGISTRATION_TERMS_REQUIRED',
    'NMC registration status and schedule terms are required.'
  );
  check(
    input.registrationDeadline,
    'registrationDeadline',
    'NURSE_REGISTRATION_TERMS_REQUIRED',
    'Expected NMC registration deadline date is required.'
  );

  // Visa route
  check(input.visaRoute, 'visaRoute', 'NURSE_VISA_ROUTE_REQUIRED', 'Lawful visa route is required.');

  // SOC Code
  check(
    input.sponsorshipOccupationCode,
    'sponsorshipOccupationCode',
    'NURSE_SOC_CODE_REQUIRED',
    'Sponsored Occupation Code (SOC) is required.'
  );

  // Repayment terms check if repayable costs exist
  if (!isBlank(input.repayableCosts)) {
    if (isBlank(input.repaymentSchedule) && isBlank(input.repaymentMethod)) {
      errors.push({
        code: 'NURSE_REPAYMENT_TERMS_REQUIRED',
        field: 'repaymentSchedule',
        message: 'An itemised repayment schedule and method are required when repayable costs apply.',
      });
      missingFields.push('repaymentSchedule');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields,
  };
}

export function validateContractCompleteness(
  role: string | null | undefined,
  input: InternationalNurseContractValidationInput,
  pathway?: string | null
): ContractValidationResult {
  if (isNurseRole(role) || pathway === 'international') {
    return validateInternationalNurseContractCompleteness(input);
  }
  return validateStandardContractCompleteness(input);
}
