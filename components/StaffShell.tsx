'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href:string; label:string; short:string };

const primary:NavItem[] = [
  { href:'/staff', label:'Home', short:'Home' },
  { href:'/staff/shifts', label:'My Shifts', short:'Shifts' },
  { href:'/staff/timesheets', label:'Timesheets', short:'Time' },
  { href:'/staff/messages', label:'Messages', short:'Chat' },
  { href:'/staff/documents', label:'Documents', short:'Docs' },
];

const secondary:NavItem[] = [
  { href:'/staff/attendance', label:'Attendance', short:'Attend' },
  { href:'/staff/leave', label:'Leave', short:'Leave' },
  { href:'/staff/training', label:'Training', short:'Train' },
  { href:'/staff/payroll', label:'Payroll', short:'Pay' },
  { href:'/staff/availability', label:'Work Preferences', short:'Rota' },
  { href:'/staff/compliance', label:'DBS & PVG', short:'Checks' },
  { href:'/staff/visa-sponsorship', label:'Visa & Sponsorship', short:'Visa' },
];

function isActive(pathname:string, href:string) {
  return href === '/staff' ? pathname === '/staff' : pathname.startsWith(href);
}

export default function StaffShell({ children }:{ children:React.ReactNode }) {
  const pathname = usePathname();
  const publicStaffPaths = ['/staff/login', '/staff/activate', '/staff/password-reset'];
  if (publicStaffPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) return <>{children}</>;
  return (
    <div className="staff-app">
      <aside className="staff-sidebar" aria-label="Staff portal navigation">
        <div className="staff-brand">
          <div className="staff-brand-mark" aria-hidden="true">L</div>
          <div><strong>LAUREM</strong><span>Staff Portal</span></div>
        </div>
        <nav className="staff-nav" aria-label="Workspace">
          <div className="staff-nav-label">Workspace</div>
          {primary.concat(secondary).map((item) => {
            const active = isActive(pathname, item.href);
            return <Link key={item.href} href={item.href} prefetch className={'staff-nav-link' + (active ? ' is-active' : '')} aria-current={active ? 'page' : undefined}>
              <span className="staff-nav-dot" aria-hidden="true" />{item.label}
            </Link>;
          })}
        </nav>
        <div className="staff-sidebar-footer">
          <Link href="/staff/profile" className={'staff-nav-link' + (isActive(pathname,'/staff/profile') ? ' is-active' : '')}><span className="staff-nav-dot" aria-hidden="true" />My Profile</Link>
          <Link href="/staff/change-password" className={'staff-nav-link' + (isActive(pathname,'/staff/change-password') ? ' is-active' : '')}><span className="staff-nav-dot" aria-hidden="true" />Security</Link>
        </div>
      </aside>
      <div className="staff-main">
        <div className="staff-mobile-header">
          <Link href="/staff" className="staff-mobile-brand"><span className="staff-brand-mark" aria-hidden="true">L</span><span>LAUREM</span></Link>
          <Link href="/staff/profile" className="staff-mobile-profile">Profile</Link>
        </div>
        <div className="staff-content">{children}</div>
        <nav className="staff-bottom-nav" aria-label="Mobile staff navigation">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return <Link key={item.href} href={item.href} prefetch className={'staff-bottom-link' + (active ? ' is-active' : '')} aria-current={active ? 'page' : undefined}>
              <span className="staff-bottom-icon" aria-hidden="true">{item.short.slice(0,1)}</span><span>{item.short}</span>
            </Link>;
          })}
          <Link href="/staff/profile" className={'staff-bottom-link' + (isActive(pathname,'/staff/profile') ? ' is-active' : '')}><span className="staff-bottom-icon" aria-hidden="true">P</span><span>More</span></Link>
        </nav>
      </div>
    </div>
  );
}