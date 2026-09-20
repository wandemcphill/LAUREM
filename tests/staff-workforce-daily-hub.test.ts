import { describe, expect, it } from 'vitest';

describe('staff workforce daily hub contract', () => {
  it('uses the server-authoritative aggregated dashboard endpoint', async () => {
    const fs = await import('node:fs/promises');
    const page = await fs.readFile('app/staff/page.tsx', 'utf8');
    const route = await fs.readFile('app/api/staff/workforce-dashboard/route.ts', 'utf8');

    expect(page).toContain("fetch('/api/staff/workforce-dashboard'");
    expect(page).not.toContain("fetch('/api/staff/me'");
    expect(page).not.toContain("fetch('/api/staff/workforce-readiness'");
    expect(page).toContain("body.payroll?.entries");
    expect(page).toContain('operationalState.status');
    expect(page).toContain("router.push('/staff/attendance')");
    expect(page).toContain("router.push('/staff/timesheets')");
    expect(page).toContain("router.push('/staff/payroll')");

    expect(route).toContain("getStaffSession");
    expect(route).toContain("session.staff_id");
    expect(route).toContain("buildStaffOperationalSnapshot");
    expect(route).toContain("buildWorkforceReadiness");
    expect(route).toContain("from('payroll_entries')");
    expect(route).toContain("from('staff_notifications')");
    expect(route).toContain("from('staff_documents')");
    expect(route).toContain("from('staff_message_conversations')");
  });

  it('keeps payroll and workforce state staff-scoped at the query boundary', async () => {
    const fs = await import('node:fs/promises');
    const route = await fs.readFile('app/api/staff/workforce-dashboard/route.ts', 'utf8');

    expect(route).toContain(".eq('staff_id', session.staff_id)");
    expect(route).toContain(".eq('id', session.staff_id)");
    expect(route).toContain("staff.employment_status === 'active'");
  });
});