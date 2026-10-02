import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');

describe('staff request centre', () => {
  it('adds a unified self-service request surface without replacing source workflows', () => {
    const page = source('app/staff/requests/page.tsx');
    const shell = source('components/StaffShell.tsx');

    for (const endpoint of [
      '/api/staff/leave',
      '/api/staff/rota',
      '/api/staff/compliance',
      '/api/staff/visa-sponsorship',
      '/api/staff/visa-help',
      '/api/staff/documents',
    ]) expect(page).toContain(endpoint);

    for (const href of [
      '/staff/leave',
      '/staff/availability',
      '/staff/compliance',
      '/staff/documents',
      '/staff/visa-help',
      '/staff/visa-sponsorship',
    ]) expect(page).toContain(href);

    expect(page).toContain('My Requests');
    expect(page).toContain('Action needed');
    expect(page).toContain('In review');
    expect(shell).toContain("href:'/staff/requests'");
    expect(shell).toContain("label:'My Requests'");
  });

  it('keeps the request centre as a navigation layer rather than duplicating write APIs', () => {
    const page = source('app/staff/requests/page.tsx');
    expect(page).not.toContain("method: 'POST'");
    expect(page).not.toContain("method:'POST'");
    expect(page).not.toContain('method: "POST"');
    expect(page).toContain('The source workflow remains the authoritative place');
  });
});
