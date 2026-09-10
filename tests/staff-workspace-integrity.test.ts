import { describe, expect, it } from 'vitest';

async function read(path: string) {
  const fs = await import('node:fs/promises');
  return fs.readFile(path, 'utf8');
}

describe('staff self-service workspace', () => {
  it('binds onboarding reads and writes to the authenticated staff identity', async () => {
    const source = await read('app/api/staff/onboarding/route.ts');
    expect(source).toContain("getStaffSession(req)");
    expect(source).toContain(".eq('staff_id', session.staff_id)");
    expect(source).toContain(".eq('package_id', packageRow.id)");
    expect(source).toContain("action !== 'acknowledge'");
    expect(source).toContain("acknowledged_at: now");
    expect(source).toContain("acknowledged_by: session.staff_id");
  });

  it('keeps payroll self-service scoped to the authenticated staff member', async () => {
    const source = await read('app/api/staff/payroll/route.ts');
    expect(source).toContain("getStaffSession(req)");
    expect(source).toContain(".eq('staff_id', session.staff_id)");
    expect(source).toContain(".limit(24)");
  });

  it('does not expose admin payroll or workforce routes through staff endpoints', async () => {
    const payroll = await read('app/api/staff/payroll/route.ts');
    const onboarding = await read('app/api/staff/onboarding/route.ts');
    expect(payroll).not.toContain('readAdminSession');
    expect(onboarding).not.toContain('readAdminSession');
    expect(payroll).not.toContain("from('recruitment_");
    expect(onboarding).not.toContain("from('recruitment_");
  });
});

describe('staff workspace UI wiring', () => {
  it('surfaces onboarding and payroll as first-class staff destinations', async () => {
    const home = await read('app/staff/page.tsx');
    const onboarding = await read('app/staff/onboarding/page.tsx');
    const payroll = await read('app/staff/payroll/page.tsx');
    expect(home).toContain("'/staff/onboarding'");
    expect(onboarding).toContain("'/api/staff/onboarding'");
    expect(onboarding).toContain('I have read and acknowledge');
    expect(payroll).toContain("'/api/staff/payroll'");
    expect(payroll).toContain('My payroll');
  });
});

describe('weekly scheduling board', () => {
  it('uses the existing assignment boundary rather than a second scheduling API', async () => {
    const source = await read('app/admin/workforce/schedule/page.tsx');
    expect(source).toContain("/api/admin/workforce/assignments");
    expect(source).toContain("status:'confirmed'");
    expect(source).toContain("status:'cancelled'");
    expect(source).toContain('Weekly operations board');
  });
});
