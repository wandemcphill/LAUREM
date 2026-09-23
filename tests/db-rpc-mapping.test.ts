import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LAUREM Supabase RPC mapping', () => {
  const source = readFileSync(resolve(process.cwd(), 'lib/db.ts'), 'utf8');

  it('does not double-prefix already namespace-qualified RPC names', () => {
    expect(source).toContain("if (name.startsWith('laurem_')) return name;");
    expect(source).toContain("throw new Error(`LAUREM database namespace violation: RPC \"${name}\" is outside the LAUREM namespace.`);");
  });

  it('still maps legacy logical LAUREM RPC names into the LAUREM namespace', () => {
    expect(source).toContain("if (LAUREM_RPC_NAMES.has(name)) return `laurem_${name}`;");
  });
});
