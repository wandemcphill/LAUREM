import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM hired employment package and activation', () => {
  it('issues the employment package and activation from the Hired workflow', () => {
    const source = readFileSync('app/api/admin/applications/hire/route.ts', 'utf8');
    expect(source).toContain("p_to_status: 'Hired'");
    expect(source).toContain('laurem_issue_staff_employment_document_package');
    expect(source).toContain('provisionLauremStaffPortal');
  });

  it('redirects reused activation links to staff login', () => {
    const route = readFileSync('app/api/staff/auth/activate/route.ts', 'utf8');
    const form = readFileSync('app/staff/activate/ActivationForm.tsx', 'utf8');
    const login = readFileSync('app/staff/login/page.tsx', 'utf8');
    expect(route).toContain('ACTIVATION_USED');
    expect(route).toContain('/staff/login?activation=used');
    expect(form).toContain("router.replace('/staff/login?activation=used')");
    expect(form).toContain('/staff/documents?activated=1');
    expect(login).toContain('That activation link has already been used.');
  });

  it('keeps activation and employment documents out of onboarding preparation', () => {
    const source = readFileSync('app/api/admin/onboarding/route.ts', 'utf8');
    expect(source).not.toContain('provisionLauremStaffPortal');
    expect(source).toContain('activationDeferredUntilHired');
    expect(source).toContain('employmentDocumentsIssuedAtHired');
  });

  it('contains the atomic hire package migration and keeps it service-role only', () => {
    const sql = readFileSync('supabase/migrations/20260920_hire_employment_package_activation.sql', 'utf8');
    expect(sql).toContain('laurem_issue_staff_employment_document_package');
    expect(sql).toContain("employment_status in ('pending','active')");
    expect(sql).toContain("status='accepted'");
    expect(sql).toContain('revoke all on function public.laurem_issue_staff_employment_document_package');
    expect(sql).toContain('grant execute on function public.laurem_issue_staff_employment_document_package');
  });
});