import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260909_evidence_lifecycle.sql'),
  'utf8',
);

describe('recruitment evidence persistence contract', () => {
  it('records review state and reviewer metadata', () => {
    expect(migration).toContain("status text not null check (status in ('pending','approved','rejected','waived','expired','superseded'))");
    expect(migration).toContain('reviewed_by text');
    expect(migration).toContain('reviewed_at timestamptz');
  });

  it('preserves history in an append-only audit table', () => {
    expect(migration).toContain('create table if not exists recruitment_evidence_audit');
    expect(migration).toContain('previous_status text');
    expect(migration).toContain('new_status text');
  });

  it('supersedes an existing active evidence decision before creating its replacement', () => {
    const supersede = migration.indexOf("set status = 'superseded'");
    const insert = migration.indexOf('insert into recruitment_evidence_reviews');
    expect(supersede).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(supersede);
  });
});
