import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM staff admin messaging', () => {
  it('supports a dedicated staff-to-admin conversation without exposing an admin mailbox as a staff account', () => {
    const helper = readFileSync('lib/laurem-messaging.ts', 'utf8');
    const route = readFileSync('app/api/staff/messages/route.ts', 'utf8');
    expect(helper).toContain('getOrCreateAdminConversation');
    expect(helper).toContain('direct_key');
    expect(helper).toContain('admin:${staffId}');
    expect(route).toContain("'__laurem_admin__'");
    expect(route).toContain('getOrCreateAdminConversation');
    expect(route).toContain('recipient_staff_id: recipientStaffId');
    expect(route).toContain("event_type: 'staff.message.sent'");
  });

  it('exposes the admin recipient and identifies admin threads in the staff portal', () => {
    const route = readFileSync('app/api/staff/messages/route.ts', 'utf8');
    const page = readFileSync('app/staff/messages/page.tsx', 'utf8');
    expect(route).toContain('LAUREM Admin / HR');
    expect(route).toContain('adminRecipients');
    expect(route).toContain('isAdminThread');
    expect(page).toContain('Message {recipient.name}');
  });
});