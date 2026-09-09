import { describe, expect, it } from 'vitest';
import { EXPECTED_PORTAL_TABLES, REQUIRED_ENVIRONMENT, REQUIRED_PRIVATE_BUCKET } from '@/lib/laurem-release-health';

describe('LAUREM release health contract', () => {
  it('requires the server dependencies needed by the private portal', () => {
    expect(REQUIRED_ENVIRONMENT).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(REQUIRED_ENVIRONMENT).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(REQUIRED_ENVIRONMENT).toContain('ADMIN_SESSION_SECRET');
    expect(REQUIRED_ENVIRONMENT).toContain('ADMIN_EMAIL');
    expect(REQUIRED_ENVIRONMENT).toContain('ADMIN_PASSWORD');
  });

  it('tracks the production tables introduced by the current portal architecture', () => {
    for (const table of [
      'recruitment_documents',
      'recruitment_contracts',
      'recruitment_evidence_reviews',
      'staff_profiles',
      'staff_portal_sessions',
      'staff_timesheets',
      'notification_deliveries',
    ]) expect(EXPECTED_PORTAL_TABLES).toContain(table);
  });

  it('keeps the private candidate-document bucket explicit', () => {
    expect(REQUIRED_PRIVATE_BUCKET).toBe('laurem-private-documents');
  });

  it('contains no secrets in the health contract itself', () => {
    expect(JSON.stringify({ EXPECTED_PORTAL_TABLES, REQUIRED_ENVIRONMENT, REQUIRED_PRIVATE_BUCKET })).not.toMatch(/password|secret[_-]?key/i);
  });
});
