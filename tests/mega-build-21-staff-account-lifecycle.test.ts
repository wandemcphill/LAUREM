import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Mega-Build 21 staff account lifecycle', () => {
  it('introduces a durable one-time activation marker and atomic issuance path', () => {
    const migration = readFileSync('supabase/migrations/20260921124500_staff_portal_account_lifecycle_hardening.sql', 'utf8');
    expect(migration).toContain('activation_used_at timestamptz');
    expect(migration).toContain('laurem_issue_staff_activation_token');
    expect(migration).toContain("staff.activation.issued");
    expect(migration).toContain("'reissued', was_previous_activation_used");
  });

  it('retains the activation hash so a reused link can resolve to the used state', () => {
    const migration = readFileSync('supabase/migrations/20260921124500_staff_portal_account_lifecycle_hardening.sql', 'utf8');
    expect(migration).toContain("activation_used_at = now_value");
    expect(migration).toContain("raise exception 'ACTIVATION_USED'");
    expect(migration).not.toContain('activation_token_hash = null');
  });

  it('requires active staff accounts for portal sessions and login', () => {
    const auth = readFileSync('lib/laurem-staff-auth.ts', 'utf8');
    const login = readFileSync('app/api/staff/auth/login/route.ts', 'utf8');
    expect(auth).toContain("staff.employment_status !== 'active'");
    expect(auth).toContain('staff.activated_at');
    expect(auth).toContain('staff.password_hash');
    expect(login).toContain("staff.employment_status !== 'active'");
    expect(login).toContain('staff.activated_at');
  });

  it('prevents admin promotion of a never-activated pending account', () => {
    const route = readFileSync('app/api/admin/workforce/staff/route.ts', 'utf8');
    expect(route).toContain('STAFF_ACTIVATION_REQUIRED');
    expect(route).toContain('current.activated_at');
    expect(route).toContain('current.password_hash');
    expect(route).toContain('staff_portal_sessions');
    expect(route).toContain('staff_password_reset_tokens');
    expect(route).toContain("employment_status_changed");
  });

  it('provides a controlled activation recovery path with a mandatory reason', () => {
    const route = readFileSync('app/api/admin/workforce/staff/account/route.ts', 'utf8');
    expect(route).toContain("action !== 'reissue_activation'");
    expect(route).toContain('reason.length < 5');
    expect(route).toContain('provisionLauremStaffPortal');
    expect(route).toContain('activation_reissued');
    expect(route).not.toContain('rawToken');
  });

  it('invalidates all persisted sessions when credentials change', () => {
    const migration = readFileSync('supabase/migrations/20260921124500_staff_portal_account_lifecycle_hardening.sql', 'utf8');
    expect(migration).toContain('laurem_change_staff_password');
    expect(migration).toContain("event_type,");
    expect(migration).toContain("'staff.password.changed'");
    expect(migration).toContain("set revoked_at = now_value");
    expect(migration).toContain("set consumed_at = now_value");
  });

  it('exposes an authenticated password-change surface', () => {
    const route = readFileSync('app/api/staff/auth/change-password/route.ts', 'utf8');
    const page = readFileSync('app/staff/change-password/page.tsx', 'utf8');
    expect(route).toContain('getStaffSession');
    expect(route).toContain('verifyPassword');
    expect(route).toContain('laurem_change_staff_password');
    expect(route).toContain('clearStaffSession');
    expect(page).toContain('/api/staff/auth/change-password');
    expect(page).toContain('currentPassword');
    expect(page).toContain('confirmPassword');
  });
});
