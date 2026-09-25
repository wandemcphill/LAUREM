import { isNurseRole } from '@/lib/laurem-company-config';

export type StandardContractValidationInput = {
  employeeName?: string | null; employeeAddress?: string | null; jobTitle?: string | null;
  employmentType?: string | null; startDate?: string | null; continuousEmploymentDate?: string | null;
  contractEndDate?: string | null; minimumWeeklyHours?: number | null; normalWorkingDays?: string | null;
  shiftPattern?: string | null; workLocations?: string[] | null; hourlyRate?: number | null;
  annualSalary?: number | null; payFrequency?: string | null; payMethod?: string | null;
  holidayEntitlement?: string | null; holidayPayCalculation?: string | null; sickPay?: string | null;
  paidLeave?: string | null; contractualBenefits?: string | null; nonContractualBenefits?: string | null;
  probation?: string | null; probationConditions?: string | null; noticePeriodEmployee?: string | null;
  noticePeriodEmployer?: string | null; mandatoryTraining?: string | null;
  mandatoryTrainingPaidBy?: string | null; pensionScheme?: string | null;
};

export type InternationalNurseContractValidationInput = StandardContractValidationInput & {
  visaRoute?: string | null; sponsorshipOccupationCode?: string | null; nmcStatus?: string | null;
  registrationDeadline?: string | null; preRegistrationRole?: string | null; preRegistrationSalary?: number | null;
  postRegistrationSalary?: number | null; registrationTransitionTerms?: string | null;
  relocationSupport?: string | null; repayableCosts?: string | null; repaymentSchedule?: string | null;
  repaymentMethod?: string | null;
};

export type ContractValidationError = { code: string; field: string; message: string };
export type ContractValidationResult = { valid: boolean; errors: ContractValidationError[]; missingFields: string[] };

const BANNED_PLACEHOLDERS = [
  'as stated in the offer', 'as stated in approved terms', 'to be confirmed before issue',
  'to be confirmed in the signed offer', 'as stated in the approved rate card',
  'details will be provided separately', 'assignments will be notified separately',
  'salary stated in the signed offer', 'salary confirmed in the signed offer',
  'draft only:', 'laurem caregroup ltd',
];

function isBlank(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return !Number.isFinite(value);
  const text = value.trim().toLowerCase();
  return !text || BANNED_PLACEHOLDERS.some((phrase) => text.includes(phrase));
}
function isPositiveNumber(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value) && value > 0;
}
function isIsoDate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const [year, month, day] = value.trim().split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(parsed.getTime())
    && parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}
function isFixedTerm(value: string | null | undefined): boolean {
  return /fixed[- ]term|temporary/i.test(value || '');
}
function addMissing(errors: ContractValidationError[], fields: string[], field: string, code: string, message: string) {
  errors.push({ code, field, message });
  if (!fields.includes(field)) fields.push(field);
}

export function validateStandardContractCompleteness(input: StandardContractValidationInput): ContractValidationResult {
  const errors: ContractValidationError[] = [];
  const missingFields: string[] = [];
  const check = (value: string | number | null | undefined, field: string, code: string, message: string) => {
    if (isBlank(value)) addMissing(errors, missingFields, field, code, message);
  };

  check(input.employeeName, 'employeeName', 'CONTRACT_EMPLOYEE_NAME_REQUIRED', 'Employee name is required.');
  check(input.employeeAddress, 'employeeAddress', 'CONTRACT_EMPLOYEE_ADDRESS_REQUIRED', 'Employee address is required.');
  check(input.jobTitle, 'jobTitle', 'CONTRACT_JOB_TITLE_REQUIRED', 'Job title is required.');
  check(input.employmentType, 'employmentType', 'CONTRACT_EMPLOYMENT_TYPE_REQUIRED', 'Employment type is required.');

  if (!isIsoDate(input.startDate)) addMissing(errors, missingFields, 'startDate', 'CONTRACT_START_DATE_REQUIRED', 'A valid contract start date is required.');
  if (!isIsoDate(input.continuousEmploymentDate)) addMissing(errors, missingFields, 'continuousEmploymentDate', 'CONTRACT_CONTINUOUS_DATE_REQUIRED', 'A valid continuous employment date is required.');

  if (isFixedTerm(input.employmentType) && !isIsoDate(input.contractEndDate)) {
    addMissing(errors, missingFields, 'contractEndDate', 'CONTRACT_END_DATE_REQUIRED', 'A valid fixed-term end date is required.');
  }
  if (isIsoDate(input.startDate) && isIsoDate(input.continuousEmploymentDate) && input.continuousEmploymentDate! > input.startDate!) {
    addMissing(errors, missingFields, 'continuousEmploymentDate', 'CONTRACT_CONTINUOUS_DATE_ORDER_INVALID', 'Continuous employment date cannot be later than the contract start date.');
  }
  if (isFixedTerm(input.employmentType) && isIsoDate(input.startDate) && isIsoDate(input.contractEndDate) && input.contractEndDate! <= input.startDate!) {
    addMissing(errors, missingFields, 'contractEndDate', 'CONTRACT_END_DATE_ORDER_INVALID', 'The fixed-term end date must be later than the contract start date.');
  }

  if (!isPositiveNumber(input.minimumWeeklyHours)) addMissing(errors, missingFields, 'minimumWeeklyHours', 'CONTRACT_WEEKLY_HOURS_REQUIRED', 'Guaranteed minimum weekly hours must be a positive number.');
  if (isBlank(input.normalWorkingDays) && isBlank(input.shiftPattern)) addMissing(errors, missingFields, 'normalWorkingDays', 'CONTRACT_WORKING_PATTERN_REQUIRED', 'Normal working days or a specific shift pattern is required.');
  if (!input.workLocations?.some((location) => location.trim())) addMissing(errors, missingFields, 'workLocations', 'CONTRACT_WORK_LOCATIONS_REQUIRED', 'At least one specific work location or assignment arrangement is required.');
  if (!isPositiveNumber(input.hourlyRate) && !isPositiveNumber(input.annualSalary)) addMissing(errors, missingFields, 'hourlyRate', 'CONTRACT_PAY_RATE_REQUIRED', 'A positive hourly rate or annual salary must be specified.');

  check(input.payFrequency, 'payFrequency', 'CONTRACT_PAY_FREQUENCY_REQUIRED', 'Pay frequency is required.');
  check(input.payMethod, 'payMethod', 'CONTRACT_PAY_METHOD_REQUIRED', 'Payment method is required.');
  check(input.holidayEntitlement, 'holidayEntitlement', 'CONTRACT_HOLIDAY_ENTITLEMENT_REQUIRED', 'Holiday entitlement details are required.');
  check(input.holidayPayCalculation, 'holidayPayCalculation', 'CONTRACT_HOLIDAY_PAY_CALCULATION_REQUIRED', 'Holiday pay calculation details are required.');
  check(input.sickPay, 'sickPay', 'CONTRACT_SICK_PAY_REQUIRED', 'Sick pay arrangements are required.');
  check(input.paidLeave, 'paidLeave', 'CONTRACT_PAID_LEAVE_REQUIRED', 'Other paid leave arrangements are required.');
  check(input.contractualBenefits, 'contractualBenefits', 'CONTRACT_CONTRACTUAL_BENEFITS_REQUIRED', 'Contractual benefits must be specified, or explicitly recorded as none.');
  check(input.nonContractualBenefits, 'nonContractualBenefits', 'CONTRACT_NON_CONTRACTUAL_BENEFITS_REQUIRED', 'Non-contractual benefits must be specified, or explicitly recorded as none.');
  check(input.probation, 'probation', 'CONTRACT_PROBATION_REQUIRED', 'Probation period is required.');
  check(input.probationConditions, 'probationConditions', 'CONTRACT_PROBATION_CONDITIONS_REQUIRED', 'Probation conditions are required.');
  check(input.noticePeriodEmployee, 'noticePeriodEmployee', 'CONTRACT_EMPLOYEE_NOTICE_REQUIRED', 'Employee notice period is required.');
  check(input.noticePeriodEmployer, 'noticePeriodEmployer', 'CONTRACT_EMPLOYER_NOTICE_REQUIRED', 'Employer notice period is required.');
  check(input.mandatoryTraining, 'mandatoryTraining', 'CONTRACT_MANDATORY_TRAINING_REQUIRED', 'Mandatory training requirements are required.');
  check(input.mandatoryTrainingPaidBy, 'mandatoryTrainingPaidBy', 'CONTRACT_TRAINING_PAYMENT_REQUIRED', 'Training payment responsibility is required.');
  check(input.pensionScheme, 'pensionScheme', 'CONTRACT_PENSION_REQUIRED', 'Pension arrangements are required.');

  return { valid: errors.length === 0, errors, missingFields };
}

export function validateInternationalNurseContractCompleteness(input: InternationalNurseContractValidationInput): ContractValidationResult {
  const result = validateStandardContractCompleteness(input);
  const errors = [...result.errors];
  const missingFields = [...result.missingFields];
  const check = (value: string | number | null | undefined, field: string, code: string, message: string) => {
    if (isBlank(value)) addMissing(errors, missingFields, field, code, message);
  };

  const preRole = input.preRegistrationRole?.trim().toLowerCase() || '';
  if (!['not applicable', 'n/a', 'none'].includes(preRole) && !isPositiveNumber(input.preRegistrationSalary)) {
    addMissing(errors, missingFields, 'preRegistrationSalary', 'NURSE_PRE_REGISTRATION_SALARY_REQUIRED', 'An exact pre-registration annual salary is required.');
  }
  if (!isPositiveNumber(input.postRegistrationSalary)) addMissing(errors, missingFields, 'postRegistrationSalary', 'NURSE_POST_REGISTRATION_SALARY_REQUIRED', 'An exact post-registration annual salary is required.');
  check(input.preRegistrationRole, 'preRegistrationRole', 'NURSE_PRE_REGISTRATION_ROLE_REQUIRED', 'The pre-registration job title must be specified.');
  check(input.registrationTransitionTerms, 'registrationTransitionTerms', 'NURSE_REGISTRATION_TRANSITION_REQUIRED', 'Registration transition terms must be specified.');
  check(input.visaRoute, 'visaRoute', 'NURSE_VISA_ROUTE_REQUIRED', 'The lawful immigration route must be specified.');
  check(input.sponsorshipOccupationCode, 'sponsorshipOccupationCode', 'NURSE_SOC_CODE_REQUIRED', 'The sponsored occupation code must be specified.');
  check(input.nmcStatus, 'nmcStatus', 'NURSE_NMC_STATUS_REQUIRED', 'The candidate-specific NMC status must be specified.');
  if (!isIsoDate(input.registrationDeadline)) addMissing(errors, missingFields, 'registrationDeadline', 'NURSE_REGISTRATION_DEADLINE_REQUIRED', 'A specific NMC registration deadline date is required.');
  check(input.relocationSupport, 'relocationSupport', 'NURSE_RELOCATION_SUPPORT_REQUIRED', 'Relocation support must be specified, including an explicit statement when none applies.');

  if (!isBlank(input.repayableCosts)) {
    check(input.repaymentSchedule, 'repaymentSchedule', 'NURSE_REPAYMENT_SCHEDULE_REQUIRED', 'A repayment schedule is required when repayable costs are included.');
    check(input.repaymentMethod, 'repaymentMethod', 'NURSE_REPAYMENT_METHOD_REQUIRED', 'An auditable repayment method is required when repayable costs are included.');
    if (/agency\s*(fee|fees)|recruitment\s*(fee|fees)|immigration\s*skills\s*charge|sponsor\s*licen[cs]e\s*(fee|fees)|certificate\s*of\s*sponsorship|\bcos\b.*\bfee|interview\s*(cost|costs|fee|fees)/i.test(input.repayableCosts)) {
      addMissing(errors, missingFields, 'repayableCosts', 'NURSE_PROHIBITED_REPAYABLE_COST', 'Employer-liable recruitment costs must not be included as employee-repayable expenses.');
    }
  }

  return { valid: errors.length === 0, errors, missingFields };
}

export function validateContractCompleteness(role: string | null | undefined, input: InternationalNurseContractValidationInput, pathway?: string | null): ContractValidationResult {
  return isNurseRole(role) || pathway === 'international'
    ? validateInternationalNurseContractCompleteness(input)
    : validateStandardContractCompleteness(input);
}