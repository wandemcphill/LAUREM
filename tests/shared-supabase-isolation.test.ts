import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('shared Supabase isolation', () => {
  const dbSource = readFileSync(resolve(process.cwd(), 'lib/db.ts'), 'utf8');
  const migrationSource = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260909_shared_supabase_isolation.sql'), 'utf8');

  it('routes every LAUREM logical table to a laurem-prefixed physical table', () => {
    expect(dbSource).toContain('return LAUREM_TABLES.has(name) ? `laurem_${name}` : name;');
    expect(dbSource).toContain('return LAUREM_RPC_NAMES.has(fn) ? `laurem_${fn}` : fn;');
  });

  it('does not rename or drop the shared BIMED namespace', () => {
    expect(migrationSource).not.toMatch(/\b(drop|truncate)\s+(table|schema)\b/i);
    expect(migrationSource).not.toMatch(/alter\s+table\s+public\.recruitment_/i);
    expect(migrationSource).toContain('laurem_recruitment_applications');
    expect(migrationSource).toContain('from public.recruitment_applications a');
  });

  it('preserves legacy application rows in an auditable payload', () => {
    expect(migrationSource).toContain("jsonb_build_object('legacy_shared_application',to_jsonb(a))");
  });
});
