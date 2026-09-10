import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LAUREM recruitment lifecycle integrity', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260910_laurem_application_lifecycle_integrity.sql'),
    'utf8',
  );
  const applicationRoute = readFileSync(resolve(process.cwd(), 'app/api/applications/route.ts'), 'utf8');
  const secondInterviewRoute = readFileSync(resolve(process.cwd(), 'app/api/admin/second-interviews/route.ts'), 'utf8');

  it('moves submitted applications into the recruiter Application stage', () => {
    expect(migration).toContain("set status = 'Application'");
    expect(migration).toContain("alter column status set default 'Application'");
    expect(migration).toContain("status = 'Submitted'");
  });

  it('requires an explicit application pathway', () => {
    expect(applicationRoute).toContain('Please choose your application pathway.');
    expect(applicationRoute).toContain("payload.pathway === 'uk' || payload.pathway === 'international'");
    expect(migration).toContain('PATHWAY_REQUIRED');
    expect(migration).toContain("payload_pathway not in ('uk', 'international')");
  });

  it('requires a completed first interview before Second Interview', () => {
    expect(migration).toContain("app_row.status='Interview'");
    expect(migration).toContain("i.status = 'Completed'");
    expect(migration).toContain('first_interview_not_completed');
    expect(secondInterviewRoute).toContain('Complete the first interview before sending the second interview.');
  });

  it('limits second interviews to Registered Nurse applications', () => {
    expect(secondInterviewRoute).toContain("toLowerCase()!=='registered nurse'");
  });
});
