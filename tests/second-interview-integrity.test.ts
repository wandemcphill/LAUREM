import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LAUREM second interview submission integrity', () => {
  const route = readFileSync(resolve(process.cwd(), 'app/api/second-interview/route.ts'), 'utf8');

  it('bounds request body size before JSON parsing', () => {
    expect(route).toContain('const MAX_BODY = 512_000;');
    expect(route).toContain("return NextResponse.json({ error: 'Interview payload is too large.' }, { status: 413 });");
  });

  it('selects the nursing interview pathway from the linked application', () => {
    expect(route).toContain("select('id,role_applied,living_in_uk')");
    expect(route).toContain("application.living_in_uk === 'No' ? 'international' : 'uk'");
    expect(route).toContain('getLauremNurseSecondInterviewQuestions(pathway)');
  });

  it('uses a compare-and-set update and rejects the losing concurrent submission', () => {
    expect(route).toContain(".eq('status', 'sent')");
    expect(route).toContain(".select('id,status')");
    expect(route).toContain('if (!completed) return NextResponse.json({ error: \'This second-interview link has already been completed.\' }, { status: 409 });');
  });
});
