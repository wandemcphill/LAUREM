import type { SupabaseClient } from '@supabase/supabase-js';
import { lauremRoleSlug } from './laurem-role-policy';

export type LauremChecklistStatus = 'pending' | 'completed' | 'waived';

type ApplicationForReadiness = {
  id: string;
  role_applied?: string | null;
  living_in_uk?: string | null;
};

type ChecklistSeed = {
  item_key: string;
  title: string;
  description: string;
  required: boolean;
};

const BASE_ITEMS: ChecklistSeed[] = [
  {
    item_key: 'identity_verified',
    title: 'Identity verified',
    description: 'Identity evidence has been reviewed and verified.',
    required: true,
  },
  {
    item_key: 'qualification_evidence_verified',
    title: 'Qualification evidence verified',
    description: 'Required qualification and training evidence has been reviewed for the applied role.',
    required: true,
  },
  {
    item_key: 'references_verified',
    title: 'References verified',
    description: 'Required professional or employment references have been checked and accepted.',
    required: true,
  },
  {
    item_key: 'right_to_work_verified',
    title: 'Right to work verified',
    description: 'The candidate has been cleared to work in the UK under the applicable pathway.',
    required: true,
  },
];

function isInternational(application: ApplicationForReadiness) {
  return application.living_in_uk === 'No';
}

export function lauremOnboardingChecklistForApplication(application: ApplicationForReadiness): ChecklistSeed[] {
  const items = [...BASE_ITEMS];
  if (isInternational(application)) {
    items.push({
      item_key: 'international_work_permission_verified',
      title: 'International work permission verified',
      description: 'Required visa, sponsorship or work-permission evidence has been reviewed and accepted for this overseas candidate.',
      required: true,
    });
  }
  if (lauremRoleSlug(application.role_applied) === 'registered-nurse') {
    items.push({
      item_key: 'professional_registration_verified',
      title: 'Professional registration verified',
      description: 'NMC registration status or the approved registration pathway has been reviewed and recorded for the registered nurse role.',
      required: true,
    });
  }
  return items;
}

export async function ensureLauremOnboardingReadiness(client: SupabaseClient, application: ApplicationForReadiness) {
  const rows = lauremOnboardingChecklistForApplication(application).map((item) => ({ application_id: application.id, ...item }));
  const { error } = await client
    .from('recruitment_onboarding_checklist')
    .upsert(rows, { onConflict: 'application_id,item_key', ignoreDuplicates: true });
  if (error) throw error;
}

export async function getLauremOnboardingReadiness(client: SupabaseClient, application: ApplicationForReadiness) {
  await ensureLauremOnboardingReadiness(client, application);
  const { data, error } = await client
    .from('recruitment_onboarding_checklist')
    .select('id,application_id,item_key,title,description,required,status,completed_at,completed_by,notes,created_at,updated_at')
    .eq('application_id', application.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const items = data || [];
  const required = items.filter((item) => item.required);
  const incomplete = required.filter((item) => item.status !== 'completed' && item.status !== 'waived');
  return {
    ready: incomplete.length === 0,
    items,
    missing: incomplete.map((item) => ({ item_key: item.item_key, title: item.title })),
  };
}
