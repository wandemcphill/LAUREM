import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM atomic staff onboarding', () => {
  it('routes staff onboarding DB state through the atomic RPC', () => {
    const route = readFileSync('app/api/admin/onboarding/route.ts', 'utf8');
    const migration = readFileSync('supabase/migrations/20260919_staff_onboarding_atomic.sql', 'utf8');

    expect(route).toContain("laurem_prepare_staff_onboarding_atomic");
    expect(route).not.toContain(".from('staff_profiles').insert");
    expect(route).not.toContain(".from('staff_onboarding_packages').insert");
    expect(route).not.toContain(".from('staff_onboarding_tasks').insert");

    expect(migration).toContain("for update");
    expect(migration).toContain("jsonb_to_recordset");
    expect(migration).toContain("laurem_transition_application_status");
    expect(migration).toContain("app_row.status not in ('Onboarding', 'Hired')");
    expect(migration).toContain("revoke all on function public.laurem_prepare_staff_onboarding_atomic");
  });
});
