import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('LAUREM staff portal hardening', () => {
  it('marks every staff API response private and non-cacheable', () => {
    const middleware = readFileSync('middleware.ts', 'utf8');
    expect(middleware).toContain("request.nextUrl.pathname.startsWith('/api/staff/')");
    expect(middleware).toContain("Cache-Control");
    expect(middleware).toContain("private, no-store, max-age=0");
  });

  it('requires a real LAUREM assignment for manual timesheets', () => {
    const route = readFileSync('app/api/staff/timesheets/route.ts', 'utf8');
    const page = readFileSync('app/staff/timesheets/page.tsx', 'utf8');
    expect(route).toContain("A valid LAUREM assignment is required for every staff timesheet.");
    expect(route).toContain('validateAssignedTimesheet(assignment');
    expect(page).toContain('Select a LAUREM assignment');
    expect(page).toContain('assignmentId, workDate, clockIn, clockOut');
  });

  it('adds account-level throttling to staff login attempts', () => {
    const route = readFileSync('app/api/staff/auth/login/route.ts', 'utf8');
    expect(route).toContain('staff-login-account:');
    expect(route).toContain('p_max_attempts: 20');
    expect(route).toContain('p_lock_seconds: 900');
  });

  it('does not allow staff to backdate availability', () => {
    const route = readFileSync('app/api/staff/availability/route.ts', 'utf8');
    expect(route).toContain('effectiveFrom < today');
    expect(route).toContain('cannot be backdated');
  });

  it('keeps approved leave cancellation out of reviewer fields and blocks cancellation once started', () => {
    const route = readFileSync('app/api/staff/leave/route.ts', 'utf8');
    expect(route).toContain("current.status === 'approved' && current.start_date <= today");
    expect(route).toContain("status: 'cancelled'");
    expect(route).not.toContain('reviewed_by: session.staff_id');
    expect(route).not.toContain('reviewed_at: now');
  });

  it('minimizes recruitment data returned to the staff visa workspace', () => {
    const route = readFileSync('app/api/staff/visa-sponsorship/route.ts', 'utf8');
    expect(route).toContain("select('id,full_name,email,phone,date_of_birth,nationality,country_of_residence,address,role_applied,start_date,living_in_uk,current_country,work_permission,requires_sponsorship')");
    expect(route).not.toContain('qualifications,training,professional_experience,employment_history');
    expect(route).not.toContain('supporting_documents,application_data');
  });

  it('checks image magic bytes before storing staff photographs', () => {
    const route = readFileSync('app/api/staff/me/route.ts', 'utf8');
    expect(route).toContain('hasValidImageSignature');
    expect(route).toContain('file.slice(0, 12)');
    expect(route).toContain('The uploaded file is not a valid JPG, PNG or WebP image.');
  });
});



describe('LAUREM staff portal follow-up hardening', () => {
  it('does not let staff self-service mark DBS/PVG as LAUREM-verified', () => {
    const route = readFileSync('app/api/staff/compliance/route.ts', 'utf8');
    const page = readFileSync('app/staff/compliance/page.tsx', 'utf8');
    expect(route).toContain("const allowed=['missing','expiring_soon','expired','pending',''];");
    expect(route).not.toContain("'current'");
    expect(route).not.toContain("'under_review'");
    expect(page).toContain('This is your self-reported record');
    expect(page).toContain('Current');
  });

  it('retires the legacy recruitment-document download route', () => {
    expect(existsSync('app/api/staff/documents/download/route.ts')).toBe(false);
  });
});
