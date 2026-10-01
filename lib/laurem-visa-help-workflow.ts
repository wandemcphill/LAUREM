import type { VisaHelpRecommendation } from '@/lib/laurem-visa-help';

export type VisaHelpWorkflowTask = {
  task_type: 'information' | 'document' | 'action';
  title: string;
  required: boolean;
  status: 'open' | 'submitted' | 'verified' | 'rejected' | 'cancelled';
};

export type VisaHelpReadiness = {
  ready: boolean;
  issues: string[];
  verifiedRequiredTasks: number;
  openRequiredTasks: number;
};

export function evaluateVisaHelpReadiness(input: {
  recommendation: VisaHelpRecommendation | null | undefined;
  confirmedRoute?: string | null;
  livingInUk: boolean;
  currentVisaType?: string | null;
  passportNumber?: string | null;
  passportCountry?: string | null;
  passportExpiryDate?: string | null;
  dependants?: Array<{ relationship?: string; fullName?: string; dateOfBirth?: string; nationality?: string; currentLocation?: string }>;
  tasks?: VisaHelpWorkflowTask[];
  legalReviewCompleted?: boolean;
}) : VisaHelpReadiness {
  const issues: string[] = [];
  const tasks = input.tasks || [];

  if (!input.recommendation) issues.push('A preliminary route assessment has not been generated.');
  if (input.recommendation?.decision === 'not_switchable' && !input.confirmedRoute) {
    issues.push('The current immigration permission does not support the screened route. A confirmed alternative route is required before submission readiness.');
  }
  if (input.recommendation && input.recommendation.decision !== 'provisional' && !input.legalReviewCompleted) {
    issues.push('Legal/support review must be completed before a non-routine case can be marked ready.');
  }
  if (input.livingInUk && !String(input.currentVisaType || '').trim()) {
    issues.push('Current UK immigration permission has not been recorded.');
  }
  if (!String(input.passportNumber || '').trim() || !String(input.passportCountry || '').trim() || !String(input.passportExpiryDate || '').trim()) {
    issues.push('Passport number, passport country and passport expiry date are required for submission readiness.');
  }

  const dependants = Array.isArray(input.dependants) ? input.dependants : [];
  dependants.forEach((dependant, index) => {
    const missing = [
      ['relationship', dependant.relationship],
      ['full name', dependant.fullName],
      ['date of birth', dependant.dateOfBirth],
      ['nationality', dependant.nationality],
      ['current location', dependant.currentLocation],
    ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label as string);
    if (missing.length) issues.push('Dependant ' + (index + 1) + ' is missing: ' + missing.join(', ') + '.');
  });

  const requiredTasks = tasks.filter(task => task.required);
  const openRequiredTasks = requiredTasks.filter(task => task.status !== 'verified' && task.status !== 'cancelled').length;
  const verifiedRequiredTasks = requiredTasks.filter(task => task.status === 'verified').length;
  if (openRequiredTasks > 0) {
    issues.push(openRequiredTasks + ' required case request' + (openRequiredTasks === 1 ? ' is' : 's are') + ' not yet verified.');
  }

  return {
    ready: issues.length === 0,
    issues,
    verifiedRequiredTasks,
    openRequiredTasks,
  };
}

export function nextCaseStatusAfterTaskResponse(taskType: VisaHelpWorkflowTask['task_type']) {
  return taskType === 'document' ? 'awaiting_documents' : 'legal_review';
}
