import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Mega-Build 23 staff workforce command centre', () => {
  it('adds a real weekly shift calendar without changing the staff shifts API contract', () => {
    const page = readFileSync('app/staff/shifts/page.tsx', 'utf8');
    const api = readFileSync('app/api/staff/shifts/route.ts', 'utf8');
    expect(page).toContain("/api/staff/shifts");
    expect(page).toContain('Weekly calendar');
    expect(page).toContain('Previous week');
    expect(page).toContain('Next week');
    expect(page).toContain('This week');
    expect(page).toContain('Open attendance');
    expect(page).toContain('role="tablist"');
    expect(page).toContain("timeZone:UK_TIME_ZONE");
    expect(api).toContain("getStaffSession");
    expect(api).toContain(".eq('staff_id', session.staff_id)");
    expect(api).toContain("scheduled_start");
  });

  it('batches dashboard message summaries instead of querying each conversation separately', () => {
    const helper = readFileSync('lib/laurem-messaging.ts', 'utf8');
    const dashboard = readFileSync('app/api/staff/workforce-dashboard/route.ts', 'utf8');
    expect(helper).toContain('getStaffConversationSummaries');
    expect(helper).toContain('Promise.all');
    expect(helper).toContain(".in('conversation_id', ids)");
    expect(helper).toContain(".in('id', otherIds)");
    expect(dashboard).toContain('getStaffConversationSummaries');
    expect(dashboard).not.toContain('for (const conversation of conversations || [])');
  });
});
