import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path:string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('LAUREM recruitment parity workflow', () => {
  it('keeps Candidate 360 admin-only and comprehensive', () => {
    const route = read('app/api/admin/applications/[id]/route.ts');
    const page = read('app/admin/applications/[id]/page.tsx');
    expect(route).toContain('readAdminSession(request)');
    expect(route).toContain('recruitment_status_history');
    expect(route).toContain('recruitment_contracts');
    expect(route).toContain('recruitment_evidence_reviews');
    expect(route).toContain('Private invitation tokens and raw storage credentials are deliberately excluded');
    expect(page).toContain('LAUREM CANDIDATE 360');
    expect(page).toContain('Documents & evidence');
    expect(page).toContain('Readiness gate');
    expect(page).toContain('Lifecycle & audit history');
  });

  it('emails first interviews and handles reschedule/cancellation', () => {
    const route = read('app/api/admin/interviews/route.ts');
    expect(route).toContain("import { sendLauremEmail } from '@/lib/laurem-email';");
    expect(route).toContain("event:'scheduled'");
    expect(route).toContain("event==='Cancelled'?'cancelled':'rescheduled'");
    expect(route).toContain('Request payload is too large.');
    expect(route).toContain('Invalid JSON.');
  });

  it('emails second-interview invitations and prevents duplicate active links', () => {
    const route = read('app/api/admin/second-interviews/route.ts');
    expect(route).toContain("An active second-interview invitation already exists for this candidate.");
    expect(route).toContain("import { sendLauremEmail } from '@/lib/laurem-email';");
    expect(route).toContain('second-interview:${data.id}');
    expect(route).toContain('Do not forward the private link.');
  });

  it('limits bulk invitations and reuses the canonical invitation helper', () => {
    const route = read('app/api/admin/invites/bulk/route.ts');
    const page = read('components/AdminBulkInvites.tsx');
    expect(route).toContain('const MAX_INVITES = 25;');
    expect(route).toContain('createAndSendLauremInvite');
    expect(page).toContain('name,email,role');
    expect(page).toContain('Maximum 25 candidates per run.');
  });

  it('does not expose LAUREM security-definer functions to public API roles', () => {
    const migration = read('supabase/migrations/20260910_laurem_security_definer_revoke_public_execute.sql');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('laurem_activate_staff_account');
    expect(migration).toContain('laurem_transition_application_status');
  });
});
