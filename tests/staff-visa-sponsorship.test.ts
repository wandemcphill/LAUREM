import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('LAUREM staff visa sponsorship workflow', () => {
  it('defines dedicated UK visa cases and a £2,000 GBP invoice issued on request', () => {
    const sql = readFileSync('supabase/migrations/20260920_staff_visa_sponsorship.sql', 'utf8');
    expect(sql).toContain('create table if not exists public.laurem_staff_visa_cases');
    expect(sql).toContain('create table if not exists public.laurem_staff_visa_invoices');
    expect(sql).toContain('amount_pence integer not null default 200000');
    expect(sql).toContain("pathway in ('visa_switch','international_sponsorship')");
    expect(sql).toContain('laurem_request_staff_visa_sponsorship');
    expect(sql).toContain('grant execute on function public.laurem_request_staff_visa_sponsorship');
  });

  it('keeps visa sponsorship records private to the service layer', () => {
    const sql = readFileSync('supabase/migrations/20260920_staff_visa_sponsorship.sql', 'utf8');
    expect(sql).toContain('alter table public.laurem_staff_visa_cases enable row level security');
    expect(sql).toContain('revoke all on public.laurem_staff_visa_cases, public.laurem_staff_visa_invoices, public.laurem_staff_visa_case_events from anon, authenticated');
    expect(sql).toContain('grant execute on function public.laurem_request_staff_visa_sponsorship(uuid,text) to service_role');
    const auditFix = readFileSync('supabase/migrations/20260920_staff_visa_audit_event_fix.sql', 'utf8');
    expect(auditFix).toContain("'candidate_information_updated'");
  });

  it('uses existing recruitment information and does not create a second candidate identity form', () => {
    const route = readFileSync('app/api/staff/visa-sponsorship/route.ts', 'utf8');
    const page = readFileSync('app/staff/visa-sponsorship/page.tsx', 'utf8');
    expect(route).toContain("from('recruitment_applications')");
    expect(route).toContain('laurem_request_staff_visa_sponsorship');
    expect(page).toContain('Information already held');
    expect(page).toContain('Only add information that was not already collected during recruitment.');
  });

  it('provides the staff-facing invoice and persistent CoS download', () => {
    const page = readFileSync('app/staff/visa-sponsorship/page.tsx', 'utf8');
    expect(page).toContain('£2,000 LAUREM invoice');
    expect(page).toContain('/api/staff/documents/');
    expect(page).toContain('/download');
    expect(page).toContain('Certificate of Sponsorship');
  });

  it('gives admins an SMS workspace and allows CoS uploads into the private staff account', () => {
    const page = readFileSync('app/admin/workforce/[staffId]/visa-sponsorship/page.tsx', 'utf8');
    const route = readFileSync('app/api/admin/workforce/staff/[staffId]/visa-sponsorship/route.ts', 'utf8');
    const upload = readFileSync('app/api/admin/workforce/staff/[staffId]/documents/route.ts', 'utf8');
    expect(page).toContain('Open Sponsor Management System');
    expect(page).toContain('Upload CoS to staff portal');
    expect(route).toContain("https://www.gov.uk/sponsor-management-system");
    expect(upload).toContain("'visa_sponsorship'");
  });

  it('keeps the existing download route private and records downloads', () => {
    const download = readFileSync('app/api/staff/documents/[id]/download/route.ts', 'utf8');
    expect(download).toContain("getStaffSession(request)");
    expect(download).toContain("'laurem-private-documents'");
    expect(download).toContain("event_type: 'downloaded'");
    expect(download).toContain("Content-Disposition");
  });
});