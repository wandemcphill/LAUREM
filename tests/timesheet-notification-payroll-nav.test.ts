import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('timesheet review notifications', () => {
  it('notifies staff when admin approves or rejects a timesheet', () => {
    const source = readFileSync('app/api/admin/workforce/timesheets/route.ts', 'utf8');
    expect(source).toContain("createLauremStaffNotification");
    expect(source).toContain("requestedStatus === 'approved' || requestedStatus === 'rejected'");
    expect(source).toContain("category: 'timesheet'");
    expect(source).toContain("actionUrl: '/staff/timesheets'");
  });

  it('keeps payroll available from the main staff workspace', () => {
    const source = readFileSync('app/staff/page.tsx', 'utf8');
    expect(source).toContain("['Payroll','/staff/payroll']");
    expect(source).toContain("['Attendance','/staff/attendance']");
    expect(source).toContain("['My Profile','/staff/profile']");
  });
});