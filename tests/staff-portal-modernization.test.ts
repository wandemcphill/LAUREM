import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source=(path:string)=>readFileSync(path,'utf8');

describe('LAUREM modern staff portal foundation',()=>{
  it('uses a shared authenticated staff shell with responsive navigation',()=>{
    const shell=source('components/StaffShell.tsx');
    const layout=source('app/staff/layout.tsx');
    const css=source('app/globals.css');
    expect(layout).toContain("StaffShell");
    expect(shell).toContain('/staff/shifts');
    expect(shell).toContain('/staff/timesheets');
    expect(shell).toContain('/staff/messages');
    expect(shell).toContain('/staff/documents');
    expect(shell).toContain('/staff/profile');
    expect(shell).toContain('staff-bottom-nav');
    expect(css).toContain('.staff-sidebar');
    expect(css).toContain('.staff-bottom-nav');
    expect(css).toContain('@media (max-width: 900px)');
  });

  it('does not wrap public staff authentication routes in the authenticated navigation',()=>{
    const shell=source('components/StaffShell.tsx');
    expect(shell).toContain("'/staff/login'");
    expect(shell).toContain("'/staff/activate'");
    expect(shell).toContain("'/staff/password-reset'");
    expect(shell).toContain('return <>{children}</>;');
  });

  it('provides route-level loading and recovery states',()=>{
    const loading=source('app/staff/loading.tsx');
    const error=source('app/staff/error.tsx');
    const home=source('app/staff/page.tsx');
    expect(loading).toContain('Loading staff workspace');
    expect(loading).toContain('staff-skeleton');
    expect(error).toContain('Try again');
    expect(error).toContain('Staff home');
    expect(home).toContain('aria-label="Loading your staff workspace"');
    expect(home).toContain('MY DAY');
    expect(home).toContain('What needs your attention');
    expect(home).toContain('Open attendance');
  });

  it('provides keyboard focus and skip navigation for the staff shell',()=>{
    const shell=source('components/StaffShell.tsx');
    const css=source('app/globals.css');
    expect(shell).toContain('Skip to content');
    expect(shell).toContain('id="staff-main-content"');
    expect(css).toContain('.staff-skip-link:focus');
    expect(css).toContain(':focus-visible');
  });
});
