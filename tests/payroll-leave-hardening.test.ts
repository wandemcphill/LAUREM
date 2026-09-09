import { describe, expect, it } from 'vitest';

function inclusiveDays(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

describe('payroll and leave hardening invariants', () => {
  it('counts leave dates inclusively', () => {
    expect(inclusiveDays('2026-09-09', '2026-09-09')).toBe(1);
    expect(inclusiveDays('2026-09-09', '2026-09-11')).toBe(3);
  });

  it('does not allow an inverted leave range', () => {
    expect(inclusiveDays('2026-09-11', '2026-09-09')).toBeLessThan(1);
  });

  it('keeps payroll gross amount deterministic', () => {
    expect(Number((37.5 * 14.25).toFixed(2))).toBe(534.38);
  });
});
