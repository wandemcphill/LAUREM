import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LAUREM readiness schema alignment', () => {
  const source = readFileSync(resolve(process.cwd(), 'lib/laurem-onboarding-readiness.ts'), 'utf8');
  const evidenceMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260909_evidence_lifecycle.sql'),
    'utf8',
  );

  it('does not select an evidence-review column that the schema does not define', () => {
    expect(source).not.toContain('metadata,expires_at,created_at,updated_at');
    expect(source).not.toContain('review.expires_at');
    expect(evidenceMigration).not.toContain('expires_at timestamptz');
  });

  it('continues to use evidence review status as the readiness authority', () => {
    expect(source).toContain("review.status === 'approved' ? 'completed' : review.status === 'waived' ? 'waived' : 'pending'");
    expect(source).toContain('Evidence review ${override.reviewId} is authoritative for this readiness item.');
  });
});
