export type VisaHelpCosStatus = 'not_started' | 'requested' | 'issued';
export type VisaHelpApplicationStatus = 'not_started' | 'draft' | 'submitted';
export type VisaHelpIdentityStatus = 'not_started' | 'scheduled' | 'completed';
export type VisaHelpDecisionStatus = 'pending' | 'granted' | 'refused' | 'withdrawn';
export type VisaHelpRightToWorkStatus = 'pending' | 'action_required' | 'confirmed';

export type VisaHelpApplicationTracking = {
  id: string;
  visa_help_case_id: string;
  staff_id: string;
  cos_status: VisaHelpCosStatus;
  cos_reference: string | null;
  cos_requested_at: string | null;
  cos_issued_at: string | null;
  application_status: VisaHelpApplicationStatus;
  application_reference: string | null;
  application_submitted_at: string | null;
  identity_status: VisaHelpIdentityStatus;
  identity_method: string | null;
  identity_appointment_at: string | null;
  identity_completed_at: string | null;
  decision_status: VisaHelpDecisionStatus;
  decision_reference: string | null;
  decision_date: string | null;
  decision_notes?: string | null;
  right_to_work_status: VisaHelpRightToWorkStatus;
  right_to_work_checked_at: string | null;
  right_to_work_checked_by?: string | null;
  sponsor_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export const VISA_HELP_APPLICATION_TRACKING_DEFAULTS = {
  cos_status: 'not_started',
  cos_reference: null,
  cos_requested_at: null,
  cos_issued_at: null,
  application_status: 'not_started',
  application_reference: null,
  application_submitted_at: null,
  identity_status: 'not_started',
  identity_method: null,
  identity_appointment_at: null,
  identity_completed_at: null,
  decision_status: 'pending',
  decision_reference: null,
  decision_date: null,
  right_to_work_status: 'pending',
  right_to_work_checked_at: null,
} as const;

export function validateVisaHelpApplicationTrackingPatch(input: Record<string, unknown>) {
  const errors: string[] = [];
  const enumFields: Record<string, string[]> = {
    cos_status: ['not_started', 'requested', 'issued'],
    application_status: ['not_started', 'draft', 'submitted'],
    identity_status: ['not_started', 'scheduled', 'completed'],
    decision_status: ['pending', 'granted', 'refused', 'withdrawn'],
    right_to_work_status: ['pending', 'action_required', 'confirmed'],
  };

  for (const [field, allowed] of Object.entries(enumFields)) {
    if (input[field] != null && !allowed.includes(String(input[field]))) {
      errors.push('Invalid ' + field + '.');
    }
  }

  const dateFields = [
    'cos_requested_at',
    'cos_issued_at',
    'application_submitted_at',
    'identity_appointment_at',
    'identity_completed_at',
    'decision_date',
    'right_to_work_checked_at',
  ];
  for (const field of dateFields) {
    if (input[field] == null || input[field] === '') continue;
    const parsed = new Date(String(input[field]));
    if (Number.isNaN(parsed.getTime())) errors.push('Invalid ' + field + '.');
  }

  const textLimits: Record<string, number> = {
    cos_reference: 160,
    application_reference: 160,
    identity_method: 120,
    decision_reference: 160,
    decision_notes: 5000,
    sponsor_notes: 5000,
    right_to_work_checked_by: 240,
  };
  for (const [field, max] of Object.entries(textLimits)) {
    if (input[field] == null) continue;
    if (String(input[field]).length > max) errors.push(field + ' is too long.');
  }

  if (input.cos_status === 'requested' && !String(input.cos_requested_at || '').trim()) {
    errors.push('CoS request date is required when the CoS status is requested.');
  }
  if (input.cos_status === 'issued' && !String(input.cos_reference || '').trim()) {
    errors.push('A CoS reference is required when the CoS status is issued.');
  }
  if (input.cos_status === 'issued' && !String(input.cos_issued_at || '').trim()) {
    errors.push('CoS issue date is required when the CoS status is issued.');
  }
  if (input.application_status === 'submitted' && !String(input.application_submitted_at || '').trim()) {
    errors.push('Application submission date is required when the application status is submitted.');
  }
  if (input.identity_status === 'scheduled' && !String(input.identity_appointment_at || '').trim()) {
    errors.push('Identity appointment date is required when identity status is scheduled.');
  }
  if (input.identity_status === 'completed' && !String(input.identity_completed_at || '').trim()) {
    errors.push('Identity completion date is required when identity status is completed.');
  }
  if (['granted', 'refused', 'withdrawn'].includes(String(input.decision_status)) && !String(input.decision_date || '').trim()) {
    errors.push('Decision date is required when a final decision is recorded.');
  }
  if (input.right_to_work_status === 'confirmed' && !String(input.right_to_work_checked_at || '').trim()) {
    errors.push('Right-to-work check date is required when the status is confirmed.');
  }

  return errors;
}

export function deriveVisaHelpApplicationMilestones(input: {
  cosStatus: VisaHelpCosStatus;
  applicationStatus: VisaHelpApplicationStatus;
  identityStatus: VisaHelpIdentityStatus;
  decisionStatus: VisaHelpDecisionStatus;
  rightToWorkStatus: VisaHelpRightToWorkStatus;
}) {
  return {
    cos: input.cosStatus === 'issued' ? 'completed' : input.cosStatus === 'requested' ? 'in_progress' : 'pending',
    application: input.applicationStatus === 'submitted' ? 'completed' : input.applicationStatus === 'draft' ? 'in_progress' : 'pending',
    identity: input.identityStatus === 'completed' ? 'completed' : input.identityStatus === 'scheduled' ? 'in_progress' : 'pending',
    decision: input.decisionStatus === 'pending'
      ? (input.applicationStatus === 'submitted' ? 'in_progress' : 'pending')
      : 'completed',
    post_decision: ['granted', 'refused', 'withdrawn'].includes(input.decisionStatus)
      ? (input.rightToWorkStatus === 'confirmed' ? 'completed' : 'in_progress')
      : 'pending',
  } as const;
}

export function cleanTrackingChanges(input: Record<string, unknown>) {
  const allowed = new Set([
    'cos_status','cos_reference','cos_requested_at','cos_issued_at',
    'application_status','application_reference','application_submitted_at',
    'identity_status','identity_method','identity_appointment_at','identity_completed_at',
    'decision_status','decision_reference','decision_date','decision_notes',
    'right_to_work_status','right_to_work_checked_at','right_to_work_checked_by',
    'sponsor_notes',
  ]);
  const dateFields = new Set([
    'cos_requested_at','cos_issued_at','application_submitted_at',
    'identity_appointment_at','identity_completed_at','decision_date','right_to_work_checked_at',
  ]);
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in input)) continue;
    const value = input[key];
    if (dateFields.has(key)) out[key] = value == null || String(value).trim() === '' ? null : new Date(String(value)).toISOString();
    else if (value == null) out[key] = null;
    else out[key] = typeof value === 'string' ? value.trim().slice(0, key === 'sponsor_notes' || key === 'decision_notes' ? 5000 : 240) : value;
  }
  return out;
}
